interface LogEntry {
  timestamp: string;
  event: string;
  [key: string]: unknown;
}

function emit(entry: LogEntry) {
  console.log(JSON.stringify(entry));
}

export function logToolCall(toolName: string, input: unknown, output: unknown) {
  emit({
    timestamp: new Date().toISOString(),
    event: "tool_call",
    tool: toolName,
    input,
    output,
  });
}

export function logAgentStep(step: string, detail?: unknown) {
  emit({
    timestamp: new Date().toISOString(),
    event: step,
    ...(detail && typeof detail === "object" ? detail : { detail }),
  });
}
