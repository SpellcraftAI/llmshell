import "../shim";
import chalk from "chalk";
import { streamText, type CoreMessage } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { tools } from "./tools";

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

        Bun.write(Bun.stdout, "\n\n");
        const text = toolResult.result.trim();
        Bun.write(Bun.stdout, chalk.cyan(text));
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