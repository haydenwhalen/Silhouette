import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { logToolCall } from "../logging/logger";

/**
 * Safely evaluates an arithmetic expression using Function constructor.
 * Only allows digits, operators, parentheses, decimal points, and whitespace.
 */
function safeEval(expression: string): number {
  const sanitized = expression.replace(/\s/g, "");
  if (!/^[\d+\-*/().%]+$/.test(sanitized)) {
    throw new Error(
      `Invalid expression: "${expression}". Only numbers and basic operators (+, -, *, /, %, parentheses) are allowed.`
    );
  }
  const result = new Function(`return (${sanitized})`)() as unknown;
  if (typeof result !== "number" || !isFinite(result)) {
    throw new Error(`Expression "${expression}" did not produce a valid number.`);
  }
  return result;
}

export const calculatorTool = tool(
  async (input) => {
    try {
      const result = safeEval(input.expression);
      const output = `${input.expression} = ${result}`;
      logToolCall("calculator", input, { result });
      return output;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown calculator error";
      logToolCall("calculator", input, { error: message });
      return `Error: ${message}`;
    }
  },
  {
    name: "calculator",
    description:
      "Evaluates a math expression and returns the numeric result. " +
      "Use this when you need to calculate time breakdowns, percentages, " +
      "or quantify a next step for the user. " +
      "Input should be a valid arithmetic expression like '2000 / 250' or '15 * 5'.",
    schema: z.object({
      expression: z
        .string()
        .describe("A math expression to evaluate, e.g. '2000 / 250' or '15 * 5'"),
    }),
  }
);
