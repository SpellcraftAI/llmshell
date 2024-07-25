import "./shim"
import { z } from "zod";
import chalk from "chalk";
import { streamText, tool, type CoreMessage, type CoreTool, type ToolInvocation } from "ai";
import { server } from "./index"; // Import the server from your API file
import { anthropic } from "@ai-sdk/anthropic";

export interface ToolResult {
  name: string;
  result: string;
}

export const tools = {
  terminal_command: tool({
    description: "Execute a terminal command and return the output.",
    parameters: z.object({
      command: z.string().describe("The terminal command to execute. Runs through bash -c.")
    }),
    execute: async ({ command }) => {
      const response = await fetch(`http://localhost:${server.port}/terminal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command })
      });

      return await response.text();
    }
  }),

  file_operation: tool({
    description: "Perform file operations such as reading, writing, or editing files.",
    parameters: z.object({
      path: z.string().describe("The path to the file"),
      operation: z.enum(["read", "write", "edit"]).describe("The operation to perform on the file"),
      content: z.string().optional().describe("The content to write or edit (required for write and edit operations)"),
      startLine: z.number().optional().describe("The starting line for edit operation (required for edit operation)"),
      endLine: z.number().optional().describe("The ending line for edit operation (required for edit operation)")
    }),
    execute: async (args) => {
      const response = await fetch(`http://localhost:${server.port}/file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args)
      });
      return await response.json();
    }
  })
};

const model = anthropic('claude-3-5-sonnet-20240620');

function showLoadingDots() {
  const dots = ['   ', '.  ', '.. ', '...'];
  let i = 0;
  return setInterval(() => {
    Bun.write(Bun.stdout, '\r' + chalk.yellow(`Bot: ${dots[i++ % dots.length].padEnd(10)}`));
  }, 250);
}

async function* readStdin(): AsyncIterable<Uint8Array> {
  const reader = Bun.stdin.stream().getReader();
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    yield value;
  }
}

console.log()
console.log(chalk.grey("Start typing to chat with the bot. Press Ctrl+C to exit.\n"));

let currentLine = '';
Bun.write(Bun.stdout, chalk.green("You: "));

const messages: CoreMessage[] = [];

for await (const chunk of readStdin()) {
  const chunkText = Buffer.from(chunk).toString();
  for (const char of chunkText) {
    if (char !== '\n') {
      currentLine += char;
      continue;
    }

    if (!currentLine.trim()) {
      currentLine = '';
      Bun.write(Bun.stdout, chalk.green("You: "));
      continue;
    }

    Bun.write(Bun.stdout, '\n');
    const loadingInterval = showLoadingDots();

    // Add user message to the conversation history
    messages.push({ role: "user", content: currentLine });

    const { textStream, toolCalls, toolResults } = await streamText({
      model,
      messages,
      tools,
    });
    
    let isFirstChunk = true;
    let textResponse = '';

    for await (const text of textStream) {
      if (isFirstChunk) {
        clearInterval(loadingInterval);
        process.stdout.write('\r' + ' '.repeat(20) + '\r');
        Bun.write(Bun.stdout, chalk.blue("Bot: "));
        isFirstChunk = false;
      }

      Bun.write(Bun.stdout, text);
      textResponse += text;
    }

    // Process tool results after the stream is done
    const finishedCalls = await toolCalls;
    const finishedResults = await toolResults;
    if (finishedResults.length) {
      for (const toolResult of finishedResults) {
        if (typeof toolResult.result !== "string") {
          throw new Error("Terminal tool result must be a string");
        }

        Bun.write(Bun.stdout, "\n\n")
        const text = toolResult.result.trim()
        Bun.write(Bun.stdout, chalk.cyan(text))
      }

      messages.push({ role: "assistant", content: finishedCalls });
      messages.push({ role: "tool", content: finishedResults });
    }

    messages.push({ role: "assistant", content: textResponse });

    currentLine = '';
    Bun.write(Bun.stdout, "\n\n");
    Bun.write(Bun.stdout, chalk.green("You: "));
  }
}