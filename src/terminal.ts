import "../shim";
import chalk from "chalk";
import { streamText, type CoreMessage } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { tools } from "./tools";
import { startServer } from "./fs";

const model = anthropic('claude-3-5-sonnet-20240620');

function showLoadingDots() {
  const dots = ['   ', '.  ', '.. ', '...'];
  let i = 0;
  return setInterval(
    () => {
      Bun.write(Bun.stdout, '\r' + chalk.yellow(`Bot: ${dots[i++ % dots.length].padEnd(10)}`));
    }, 
    250
  );
}

async function* readStdin(): AsyncIterable<Uint8Array> {
  const reader = Bun.stdin.stream().getReader();
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    yield value;
  }
}

console.log();
console.log(chalk.grey("Start typing to chat with the bot. Press Ctrl+C to exit.\n"));

let currentLine = '';
Bun.write(Bun.stdout, chalk.green("You: "));

const messages: CoreMessage[] = [];

const server = startServer();
process.on("exit", () => server.stop());

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

    const { fullStream, toolCalls, toolResults } = await streamText({
      model,
      messages,
      tools,
      experimental_toolCallStreaming: true,
    });
    
    let isFirstChunk = true;
    let textResponse = '';

    for await (const chunk of fullStream) {
      switch (chunk.type) {
      case "text-delta": {
        const text = chunk.textDelta;
        if (isFirstChunk) {
          clearInterval(loadingInterval);
          process.stdout.write('\r' + ' '.repeat(20) + '\r');
          Bun.write(Bun.stdout, chalk.blue("Bot: "));
          isFirstChunk = false;
        }
    
        // console.table({ chunk: text });
        Bun.write(Bun.stdout, text);
        textResponse += text;
        break;
      }

      case "tool-call": {
        console.log();
        console.table(chunk);
        break;
      }
      }
    }

    // Process tool results after the stream is done
    const finishedCalls = await toolCalls;
    const finishedResults = await toolResults;
    if (finishedResults.length) {
      for (const toolResult of finishedResults) {
        if (!toolResult.result) continue;

        Bun.write(Bun.stdout, "\n\n");

        switch (toolResult.toolName) {
        case "terminal_command":
          const reader = toolResult.result.getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            Bun.write(Bun.stdout, value);
          }
          break;

        case "file_operation":
          if (toolResult.result.data) {
            Bun.write(Bun.stdout, toolResult.result.data);
          }

          break;
        }
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