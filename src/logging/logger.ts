// Structured logger — logs tool calls, arguments, and results for debugging and assignment compliance.

export function logToolCall(toolName: string, input: unknown, output: unknown) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    tool: toolName,
    input,
    output,
  }));
}

export function logAgentStep(step: string, detail?: unknown) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    step,
    detail,
  }));
}
