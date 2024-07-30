import "../shim";
import chalk from "chalk";
import { streamText, type CoreMessage } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { tools } from "./tools";
import { startServer } from "./fs";
import { KeyHandler } from "./keys";
import ora from "ora";

const DECODER = new TextDecoder();

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

export const terminal = async () => {
  console.log();
  console.log(chalk.grey("Start typing to chat with the bot. Press Ctrl+C to exit.\n"));

  let cursorPosition = 0;
  let currentLine = '';
  Bun.write(Bun.stdout, chalk.green("You: "));

  const messages: CoreMessage[] = [];

  const server = startServer();

  const submitMessage = async () => {
    // if (!currentLine.trim()) {
    //   currentLine = '';
    //   cursorPosition = 0;
    //   Bun.write(Bun.stdout, '\n' + chalk.green("You: "));
    //   return;
    // }

    Bun.write(Bun.stdout, '\n');

    // Add user message to the conversation history
    messages.push({ role: "user", content: currentLine });

    const spinner = ora({ text: 'Loading...', spinner: "dots" }).start();

    const { fullStream, toolCalls, toolResults } = await streamText({
      model,
      messages,
      tools,
      experimental_toolCallStreaming: true,
    });
    
    let isFirstChunk = true;
    let textResponse = '';

    for await (const chunk of fullStream) {
      if (isFirstChunk) {
        isFirstChunk = false;
        spinner.stop();
        Bun.write(Bun.stdout, chalk.yellow("Claude: "));
      }

      // spinner.stop();
      switch (chunk.type) {
      case "text-delta": {
        const text = chunk.textDelta;    
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

    Bun.write(Bun.stdout, "\n");
    console.log({ finishedCalls, finishedResults });

    // Add tool calls to start of history - will throw if missing results.
    if (finishedCalls.length > 0) {
      messages.push({ role: "assistant", content: finishedCalls });
      messages.push({ role: "tool", content: finishedResults });
    }

    for (const toolResult of finishedResults) {
      console.log({ toolResult });
      if (!toolResult.result) continue;

      Bun.write(Bun.stdout, "\n\n");
      let content = '';

      switch (toolResult.toolName) {
      case "terminal":
        const reader = toolResult.result.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          Bun.write(Bun.stdout, value);
          content += DECODER.decode(value);
        }
        break;

      case "read":
      case "write":
      case "edit":
        if (toolResult.result.data) {
          content = toolResult.result.data;
          Bun.write(Bun.stdout, toolResult.result.data);
        }
        break;
      }
    }

    messages.push({ role: "assistant", content: textResponse });

    cursorPosition = 0;
    currentLine = '';
    Bun.write(Bun.stdout, '\n' + chalk.green("You: "));
  };

  process.on("exit", () => {
    server.stop();
  });

  const keyboardHandler = new KeyHandler();
  keyboardHandler.on('keypress', async ({ key, ctrl, alt, text }) => {
    console.table({ key, ctrl, alt, text });
    if (ctrl && key === 'C') {
      Bun.write(Bun.stdout, '\n');
      process.exit(2);
    }
    
    // console.log({ key, ctrl, alt, text });
    if (key === "enter" && !alt && !ctrl) {
      currentLine = text;
      process.stdin.pause();
      await submitMessage();
      keyboardHandler.clear();
      process.stdin.resume();
    }
  });

  // keyboardHandler.on('keypress', async ({ key, ctrl, alt }) => {
  //   if (ctrl && key === 'C') {
  //     process.exit();
  //   }

  //   switch (key) {
  //   case 'backspace':
  //     if (cursorPosition > 0) {
  //       currentLine = currentLine.slice(0, cursorPosition - 1) + currentLine.slice(cursorPosition);
  //       cursorPosition--;
  //       refreshLine();
  //     }
  //     break;
  //   case 'left':
  //     if (cursorPosition > 0) {
  //       cursorPosition--;
  //       refreshLine();
  //     }
  //     break;
  //   case 'right':
  //     if (cursorPosition < currentLine.length) {
  //       cursorPosition++;
  //       refreshLine();
  //     }
  //     break;
  //   case 'up':
  //   case 'down':
  //     // Implement history navigation if desired
  //     break;
  //   case 'enter':
  //     // console.log({ alt, ctrl });
  //     if (alt || ctrl) {
  //       // console.log({ currentLine });
  //       currentLine += '\n';
  //       cursorPosition++;
  //       // cursorPosition = 0;
  //       refreshLine();
  //       break;
  //     }

  //     await submitMessage();
  //     break;

  //   default:
  //     if (!ctrl && !alt && key.length === 1) {
  //       currentLine = currentLine.slice(0, cursorPosition) + key + currentLine.slice(cursorPosition);
  //       cursorPosition++;
  //       refreshLine();
  //     }
  //   }
  // });
};