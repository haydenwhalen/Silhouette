import { ChatOpenAI } from "@langchain/openai";
import { createToolCallingAgent, AgentExecutor } from "@langchain/classic/agents";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { requireKey } from "../lib/config";
import { logAgentStep } from "../logging/logger";
import { SYSTEM_PROMPT } from "./systemPrompt";
import { calculatorTool } from "../tools/calculator";
import { webSearchTool } from "../tools/webSearch";
import { knowledgeBaseTool } from "../tools/knowledgeBase";
import { loadAndChunkDocuments } from "../rag/documents";
import { getOrCreateVectorStore } from "../rag/vectorStore";
import { getSessionHistory } from "../memory/conversationMemory";

const tools = [knowledgeBaseTool, webSearchTool, calculatorTool];

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
  const docs = await loadAndChunkDocuments();
  await getOrCreateVectorStore(docs);
  ragReady = true;
  logAgentStep("rag_init_complete", { chunks: docs.length });
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
}

export async function chat(
  userMessage: string,
  sessionId = "default"
): Promise<AgentResponse> {
  logAgentStep("user_input", { sessionId, message: userMessage });

  await ensureRagLoaded();
  const exec = await getExecutor();

  const history = getSessionHistory(sessionId);
  const pastMessages = await history.getMessages();

  const result = await exec.invoke({
    input: userMessage,
    chat_history: pastMessages,
  });

  const output: string = result.output;

  const toolsUsed: string[] = [];
  if (Array.isArray(result.intermediateSteps)) {
    for (const step of result.intermediateSteps) {
      const toolName = step.action?.tool ?? "unknown";
      const toolInput = step.action?.toolInput;
      toolsUsed.push(toolName);
      logAgentStep("tool_used", { tool: toolName, input: toolInput });
    }
  }

  const askedClarifying = !toolsUsed.length && output.includes("?");

  await history.addMessage(new HumanMessage(userMessage));
  await history.addMessage(new AIMessage(output));

  logAgentStep("agent_response", {
    sessionId,
    toolsUsed,
    askedClarifyingQuestions: askedClarifying,
    outputLength: output.length,
    outputPreview: output.slice(0, 200),
  });

  return { output, sessionId, toolsUsed };
}
