import { AsyncLocalStorage } from "async_hooks";
import type { StateClassification } from "./stateClassifier";
import type { IntakeResonanceHint } from "../rag/vectorStore";

export interface SilhouetteRequestContext {
  classification?: StateClassification;
  sessionId?: string;
  userQuery?: string;
  lastRetrievalCandidateIds?: string[];
}

export const requestContext =
  new AsyncLocalStorage<SilhouetteRequestContext>();

export function getDetectedStateForRetrieval(): string | undefined {
  const ctx = requestContext.getStore();
  if (!ctx?.classification) return undefined;
  const { classification } = ctx;
  if (classification.detected_state === "unknown") return undefined;
  if (classification.state_confidence === "low") return undefined;
  return classification.detected_state;
}

export function getIntakeHintForRetrieval(): IntakeResonanceHint | null {
  const ctx = requestContext.getStore();
  if (!ctx?.classification) return null;
  const { classification } = ctx;
  if (classification.detected_state === "unknown") return null;
  if (classification.state_confidence === "low") return null;
  return {
    insight_type: classification.inferred_resonance_insight_type,
    voice_register: classification.inferred_resonance_voice_register,
    direction_collapse_variant: classification.direction_collapse_variant,
  };
}
