import { ChatOpenAI } from "@langchain/openai";
import { createToolCallingAgent, AgentExecutor } from "@langchain/classic/agents";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { requireKey } from "../lib/config";
import { logAgentStep } from "../logging/logger";
import { SYSTEM_PROMPT } from "./systemPrompt";
import { calculatorTool } from "../tools/calculator";
import { webSearchTool } from "../tools/webSearch";
import { knowledgeBaseTool } from "../tools/knowledgeBase";
import { presentInsightTool } from "../tools/presentInsight";
import { loadSIODocuments, getSIOById } from "../rag/sioLoader";
import { getOrCreateVectorStore, scoredSearch } from "../rag/vectorStore";
import { getSessionHistory } from "../memory/conversationMemory";
import { classifyState, StateClassification } from "./stateClassifier";
import { requestContext } from "./requestContext";
import { detectFeedbackIntent } from "./feedbackIntent";
import {
  canRetry,
  getLastPresentation,
  getSeenSIOIds,
  getUserHandleForSession,
  incrementRetryCount,
  recordPresentation,
} from "../memory/sessionState";
import { appendFeedbackEvent } from "../feedback/feedbackLog";
import { presentInsight as buildPresentation } from "../presentation/presentInsight";
import {
  normalizeMediaMetadata,
  type InsightMedia,
} from "../lib/media";
import type { MvpState } from "../rag/retrievalConfig";

const tools = [knowledgeBaseTool, presentInsightTool, webSearchTool, calculatorTool];

const prompt = ChatPromptTemplate.fromMessages([
  ["system", SYSTEM_PROMPT],
  new MessagesPlaceholder("chat_history"),
  ["human", "{input}"],
  new MessagesPlaceholder("agent_scratchpad"),
]);

let executor: AgentExecutor | null = null;
let ragReady = false;

async function ensureRagLoaded(): Promise<void> {
  if (ragReady) return;
  logAgentStep("rag_init_start");
  const docs = await loadSIODocuments();
  await getOrCreateVectorStore(docs);
  ragReady = true;
  logAgentStep("rag_init_complete", { sioCount: docs.length });
}

async function getExecutor(): Promise<AgentExecutor> {
  if (executor) return executor;

  const llm = new ChatOpenAI({
    openAIApiKey: requireKey("openaiApiKey"),
    modelName: "gpt-4o-mini",
    temperature: 0.4,
  });

  const agent = createToolCallingAgent({ llm, tools, prompt });
  executor = new AgentExecutor({
    agent,
    tools,
    verbose: false,
    returnIntermediateSteps: true,
  });
  return executor;
}

export interface AgentResponse {
  output: string;
  sessionId: string;
  toolsUsed: string[];
  classification: StateClassification;
  feedbackHandled?: "positive" | "negative-retry" | "negative-no-retry" | "stray";
  // The SIO presented in THIS turn (new or via retry). Null on turns that
  // don't surface a new insight (clarifying questions, positive/negative ack,
  // stray feedback). The UI uses this to decide whether to render feedback buttons.
  last_insight_id?: string | null;
  // Structured media for the SIO presented THIS turn. Derived from the SIO's
  // frontmatter via normalizeMediaMetadata. Null when no insight was presented
  // OR when the SIO has no usable media. The UI uses this to render an embedded
  // video card; it never has to parse the rendered_markdown for embed info.
  media?: InsightMedia | null;
}

/**
 * Looks up the SIO's frontmatter for `insight_id` and returns the normalized
 * InsightMedia, or null if the SIO isn't loaded (which should not happen on a
 * just-presented insight, but we don't throw — the UI handles null cleanly).
 */
function mediaForInsightId(insightId: string | null | undefined): InsightMedia | null {
  if (!insightId) return null;
  const doc = getSIOById(insightId);
  if (!doc) return null;
  return normalizeMediaMetadata(doc.metadata as Record<string, unknown>);
}

function classificationNote(c: StateClassification): SystemMessage {
  if (c.detected_state === "unknown" || c.state_confidence === "low") {
    return new SystemMessage(
      `[Upstream state classifier]\n` +
        `detected_state: unknown (low confidence)\n` +
        `reason: ${c.classification_reason}\n` +
        `Action: do not pass a state to knowledge_base; search broadly. If the user's ` +
        `message is too sparse to classify, consider one clarifying question per the system prompt.`
    );
  }
  const secondary =
    c.secondary_possible_states.length > 0
      ? c.secondary_possible_states.join(", ")
      : "none";
  return new SystemMessage(
    `[Upstream state classifier]\n` +
      `detected_state: ${c.detected_state}\n` +
      `state_confidence: ${c.state_confidence}\n` +
      `secondary_possible_states: ${secondary}\n` +
      `reason: ${c.classification_reason}\n` +
      `Action: when you call knowledge_base, leave the state arg unset — the system will ` +
      `apply "${c.detected_state}" automatically from the request context. Only pass state ` +
      `explicitly if you have a strong reason to disagree with this classification.`
  );
}

const POSITIVE_ACK = "Glad it landed. Take what's useful and leave the rest.";
const NEGATIVE_NO_RETRY = "I'm not finding something else that fits well right now. This might be a good moment to come back to.";
const STRAY_FEEDBACK_PROMPT = "Tell me what's been feeling stuck or off lately. A few sentences is plenty — don't worry about making it perfect.";

async function handlePositiveFeedback(
  sessionId: string,
  userMessage: string,
  source: "button" | "text"
): Promise<AgentResponse> {
  const userHandle = getUserHandleForSession(sessionId);
  const last = getLastPresentation(sessionId);
  if (!last) {
    appendFeedbackEvent({
      session_id: sessionId,
      user_handle: userHandle,
      source,
      response_type: "stray_feedback",
      insight_id: null,
      shown_sio_id: null,
      retry_count: 0,
      detected_state: null,
      state_confidence: null,
      insight_type: null,
      voice_register: null,
      retrieval_score: null,
      retrieval_rank: null,
      notes: `positive feedback with no prior presentation`,
    });
    const out = STRAY_FEEDBACK_PROMPT;
    const history = getSessionHistory(sessionId);
    await history.addMessage(new HumanMessage(userMessage));
    await history.addMessage(new AIMessage(out));
    return {
      output: out,
      sessionId,
      toolsUsed: [],
      classification: emptyClassification("stray positive feedback"),
      feedbackHandled: "stray",
    };
  }
  appendFeedbackEvent({
    session_id: sessionId,
    user_handle: userHandle,
    source,
    response_type: "landed",
    insight_id: last.insight_id,
    shown_sio_id: last.shown_sio_id,
    alternate_sio_ids: last.alternate_sio_ids,
    retry_count: 0,
    detected_state: last.detected_state,
    state_confidence: last.state_confidence,
    insight_type: last.insight_type,
    voice_register: last.voice_register,
    retrieval_score: last.retrieval_score,
    retrieval_rank: last.retrieval_rank,
  });
  const history = getSessionHistory(sessionId);
  await history.addMessage(new HumanMessage(userMessage));
  await history.addMessage(new AIMessage(POSITIVE_ACK));
  return {
    output: POSITIVE_ACK,
    sessionId,
    toolsUsed: [],
    classification: emptyClassification("positive feedback"),
    feedbackHandled: "positive",
  };
}

async function handleNegativeFeedback(
  sessionId: string,
  userMessage: string,
  source: "button" | "text"
): Promise<AgentResponse> {
  const userHandle = getUserHandleForSession(sessionId);
  const last = getLastPresentation(sessionId);
  if (!last) {
    appendFeedbackEvent({
      session_id: sessionId,
      user_handle: userHandle,
      source,
      response_type: "stray_feedback",
      insight_id: null,
      shown_sio_id: null,
      retry_count: 0,
      detected_state: null,
      state_confidence: null,
      insight_type: null,
      voice_register: null,
      retrieval_score: null,
      retrieval_rank: null,
      notes: `negative feedback with no prior presentation`,
    });
    const out = STRAY_FEEDBACK_PROMPT;
    const history = getSessionHistory(sessionId);
    await history.addMessage(new HumanMessage(userMessage));
    await history.addMessage(new AIMessage(out));
    return {
      output: out,
      sessionId,
      toolsUsed: [],
      classification: emptyClassification("stray negative feedback"),
      feedbackHandled: "stray",
    };
  }

  // Always log the "show different" event, even if we can't retry.
  appendFeedbackEvent({
    session_id: sessionId,
    user_handle: userHandle,
    source,
    response_type: "show_different",
    insight_id: last.insight_id,
    shown_sio_id: last.shown_sio_id,
    alternate_sio_ids: last.alternate_sio_ids,
    retry_count: 0,
    detected_state: last.detected_state,
    state_confidence: last.state_confidence,
    insight_type: last.insight_type,
    voice_register: last.voice_register,
    retrieval_score: last.retrieval_score,
    retrieval_rank: last.retrieval_rank,
  });

  if (!canRetry(sessionId)) {
    const history = getSessionHistory(sessionId);
    await history.addMessage(new HumanMessage(userMessage));
    await history.addMessage(new AIMessage(NEGATIVE_NO_RETRY));
    return {
      output: NEGATIVE_NO_RETRY,
      sessionId,
      toolsUsed: [],
      classification: emptyClassification("negative feedback — retry cap"),
      feedbackHandled: "negative-no-retry",
    };
  }

  // Re-run retrieval with the seen SIOs excluded, using the SAME context as the
  // original presentation (state + intake hints from the original classification).
  const state = last.detected_state as MvpState | null;
  if (!state) {
    const history = getSessionHistory(sessionId);
    const out =
      "I don't have a strong second pick for what you described. Tell me a bit more about what feels off.";
    await history.addMessage(new HumanMessage(userMessage));
    await history.addMessage(new AIMessage(out));
    return {
      output: out,
      sessionId,
      toolsUsed: [],
      classification: emptyClassification("negative feedback — no state on prior"),
      feedbackHandled: "negative-no-retry",
    };
  }

  // Component 7 §15 Case 7 + Component 9 §6: on retry, prefer a candidate with
  // a different insight_type than what was just rejected. Drop intake hints
  // for this query — they bias toward the same flavor the user just rejected.
  const retryResult = await scoredSearch({
    query: last.user_query,
    state,
    k: 3,
    intakeHint: null,
    excluded_sio_ids: getSeenSIOIds(sessionId),
  });

  // Diversity preference: among the top-3, pick the first whose insight_type
  // differs from last.insight_type. Falls back to top if all match.
  const diversePick = retryResult.candidates.find(
    (c) =>
      String(c.doc.metadata.insight_type ?? "") !==
      String(last.insight_type ?? "")
  );
  if (diversePick && diversePick !== retryResult.candidates[0]) {
    // Reorder so diversePick is treated as the winner.
    retryResult.candidates.splice(
      retryResult.candidates.indexOf(diversePick),
      1
    );
    retryResult.candidates.unshift(diversePick);
  }

  if (retryResult.candidates.length === 0) {
    const history = getSessionHistory(sessionId);
    await history.addMessage(new HumanMessage(userMessage));
    await history.addMessage(new AIMessage(NEGATIVE_NO_RETRY));
    incrementRetryCount(sessionId); // still counts as a retry attempt
    return {
      output: NEGATIVE_NO_RETRY,
      sessionId,
      toolsUsed: [],
      classification: emptyClassification("negative feedback — no alternates"),
      feedbackHandled: "negative-no-retry",
    };
  }

  const next = retryResult.candidates[0];
  const nextId = String(next.doc.metadata.insight_id);
  // Build presentation using a synthesized classification carrying the original state.
  const retryClassification: StateClassification = {
    detected_state: state,
    state_confidence: (last.state_confidence as "high" | "moderate" | "low") ?? "high",
    secondary_possible_states: [],
    needs_clarification: false,
    classification_reason: "Retry — using context from prior presentation.",
    direction_collapse_variant:
      (last.direction_collapse_variant as "post-achievement" | "original" | null) ?? null,
    inferred_resonance_insight_type:
      (last.intake_insight_type as "mechanism" | "story" | "reframe" | "permission" | null) ?? null,
    inferred_resonance_voice_register:
      (last.intake_voice_register as any) ?? null,
  };

  const presentation = await buildPresentation(
    nextId,
    retryClassification,
    last.user_query
  );

  if (!presentation.ok) {
    const history = getSessionHistory(sessionId);
    await history.addMessage(new HumanMessage(userMessage));
    await history.addMessage(new AIMessage(NEGATIVE_NO_RETRY));
    return {
      output: NEGATIVE_NO_RETRY,
      sessionId,
      toolsUsed: [],
      classification: retryClassification,
      feedbackHandled: "negative-no-retry",
    };
  }

  // Record the new presentation as the latest context + log retry event.
  const sio = getSIOById(nextId);
  const sioMeta = sio?.metadata ?? {};
  const alternates = retryResult.candidates
    .map((c) => String(c.doc.metadata.insight_id))
    .filter((id) => id !== nextId);
  recordPresentation(sessionId, {
    insight_id: nextId,
    shown_sio_id: nextId,
    detected_state: state,
    state_confidence: last.state_confidence,
    insight_type: (sioMeta.insight_type as string) ?? null,
    voice_register: (sioMeta.voice_register as string) ?? null,
    retrieval_score: next.final_score,
    retrieval_rank: 0,
    alternate_sio_ids: alternates,
    user_query: last.user_query,
    intake_insight_type: last.intake_insight_type,
    intake_voice_register: last.intake_voice_register,
    direction_collapse_variant: last.direction_collapse_variant,
  });
  incrementRetryCount(sessionId);
  appendFeedbackEvent({
    session_id: sessionId,
    user_handle: userHandle,
    source: "api",
    response_type: "retry_presented",
    insight_id: nextId,
    shown_sio_id: nextId,
    alternate_sio_ids: alternates,
    retry_count: 1,
    detected_state: state,
    state_confidence: last.state_confidence,
    insight_type: (sioMeta.insight_type as string) ?? null,
    voice_register: (sioMeta.voice_register as string) ?? null,
    retrieval_score: next.final_score,
    retrieval_rank: 0,
  });

  const ack = "Let me find something else.";
  const fullOutput = `${ack}\n\n${presentation.presentation.rendered_markdown}`;

  const history = getSessionHistory(sessionId);
  await history.addMessage(new HumanMessage(userMessage));
  await history.addMessage(new AIMessage(fullOutput));
  return {
    output: fullOutput,
    sessionId,
    toolsUsed: ["scored_search", "present_insight"],
    classification: retryClassification,
    feedbackHandled: "negative-retry",
    last_insight_id: nextId,
    media: mediaForInsightId(nextId),
  };
}

function emptyClassification(reason: string): StateClassification {
  return {
    detected_state: "unknown",
    state_confidence: "low",
    secondary_possible_states: [],
    needs_clarification: false,
    classification_reason: reason,
    direction_collapse_variant: null,
    inferred_resonance_insight_type: null,
    inferred_resonance_voice_register: null,
  };
}

export async function chat(
  userMessage: string,
  sessionId = "default",
  feedbackSource?: "button" | "text"
): Promise<AgentResponse> {
  logAgentStep("user_input", { sessionId, message: userMessage });

  await ensureRagLoaded();

  // Feedback routing happens BEFORE the agent loop — feedback should never run
  // retrieval against itself.
  const intent = detectFeedbackIntent(userMessage);
  if (intent === "positive") {
    logAgentStep("feedback_intent_detected", { sessionId, intent });
    return handlePositiveFeedback(sessionId, userMessage, feedbackSource ?? "text");
  }
  if (intent === "negative") {
    logAgentStep("feedback_intent_detected", { sessionId, intent });
    return handleNegativeFeedback(sessionId, userMessage, feedbackSource ?? "text");
  }

  const exec = await getExecutor();
  const classification = await classifyState(userMessage);

  return requestContext.run(
    {
      classification,
      sessionId,
      userQuery: userMessage,
      lastRetrievalCandidateIds: [],
    },
    async () => {
      const history = getSessionHistory(sessionId);
      const pastMessages = await history.getMessages();

      const result = await exec.invoke({
        input: userMessage,
        chat_history: [classificationNote(classification), ...pastMessages],
      });

      let output: string = result.output;

      const toolsUsed: string[] = [];
      let presentInsightOutput: string | null = null;
      if (Array.isArray(result.intermediateSteps)) {
        for (const step of result.intermediateSteps) {
          const toolName = step.action?.tool ?? "unknown";
          const toolInput = step.action?.toolInput;
          toolsUsed.push(toolName);
          logAgentStep("tool_used", { tool: toolName, input: toolInput });
          if (toolName === "present_insight" && typeof step.observation === "string") {
            presentInsightOutput = step.observation;
          }
        }
      }

      if (presentInsightOutput && !presentInsightOutput.startsWith("Presentation failed:")) {
        logAgentStep("agent_output_overridden", {
          sessionId,
          reason: "present_insight return used verbatim instead of agent prose",
          originalAgentOutputPreview: output.slice(0, 120),
        });
        output = presentInsightOutput;
      }

      const askedClarifying = !toolsUsed.length && output.includes("?");

      // Read last presentation context to surface insight_id, but only if this
      // turn actually called present_insight (otherwise we'd hand the UI a
      // stale insight_id from a prior turn).
      const presentedThisTurn = toolsUsed.includes("present_insight");
      const lastPres = presentedThisTurn ? getLastPresentation(sessionId) : null;
      const last_insight_id = lastPres?.insight_id ?? null;

      await history.addMessage(new HumanMessage(userMessage));
      await history.addMessage(new AIMessage(output));

      logAgentStep("agent_response", {
        sessionId,
        detectedState: classification.detected_state,
        stateConfidence: classification.state_confidence,
        toolsUsed,
        askedClarifyingQuestions: askedClarifying,
        outputLength: output.length,
        outputPreview: output.slice(0, 200),
        last_insight_id,
      });

      return {
        output,
        sessionId,
        toolsUsed,
        classification,
        last_insight_id,
        media: mediaForInsightId(last_insight_id),
      };
    }
  );
}
