import "../shim";
import chalk from "chalk";
import { streamText, type CoreMessage } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { tools } from "./tools";
import { startServer } from "./fs";
import { KeyHandler } from "./keys";
import { createInterface } from "readline";
import ora from "ora";
import boxen from "boxen";

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
  // console.log(chalk.grey("Type below. Enter to send, Ctrl+C to exit.\n"));

  // let cursorPosition = 0;
  // let currentLine = '';
  Bun.write(Bun.stdout, chalk.green("You: "));

  const messages: CoreMessage[] = [];

  const server = startServer();

  const submitMessage = async (content: string) => {
    if (!content.trim()) {
      return;
    }

    // console.log('submitMessage');

    Bun.write(Bun.stdout, '\n');

    // Add user message to the conversation history
    messages.push({ role: "user", content });

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
        Bun.write(
          Bun.stdout, 
          boxen(chalk.yellow("Claude"), { borderColor: "yellow", padding: { left: 2, right: 2 } }) + "\n"
        );
      }

      // spinner.stop();
      switch (chunk.type) {
      case "text-delta": {
        const text = chunk.textDelta;    
        Bun.write(Bun.stdout, text);
        textResponse += text;
        break;
      }
      }
    }

    // Process tool results after the stream is done
    const finishedCalls = await toolCalls;
    const finishedResults = await toolResults;

    // Add tool calls to start of history - will throw if missing results.
    if (finishedCalls.length > 0) {
      process.stdout.write('\r\n\n');
      console.table(finishedCalls, ['toolName', 'args']);
      // process.stdout.write('\n');
    
      messages.push({ role: "assistant", content: finishedCalls });
      messages.push({ role: "tool", content: finishedResults });
    }

    for (const toolResult of finishedResults) {
      if (!toolResult.result) continue;

      console.log();
      let content = '';

      switch (toolResult.toolName) {
      case "terminal":
        const reader = toolResult.result.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = DECODER.decode(value);
          Bun.write(Bun.stdout, value);
          content += text;
        }
        break;

      case "read":
      case "write":
      case "edit":
        if (toolResult.result.data) {
          content = toolResult.result.data;
          Bun.write(Bun.stdout, chalk.dim(chalk.blue(content)));
        }
        break;
      }
    }

    messages.push({ role: "assistant", content: textResponse });
    process.stdout.write('\r\n\n');

    // cursorPosition = 0;
    // currentLine = '';
  };

  process.on("exit", () => {
    server.stop();
  });

  while (true) {
    const userTextMessages = 
      messages
        .filter(({ role }) => role === "user")
        .filter(({ content }) => typeof content === "string")
        .toReversed();
        
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
      history: userTextMessages.map(({ content }) => content as string),
    });

    rl.addListener("SIGINT", () => {
      console.log("\n");
      rl.close();
      process.exit();
    });

    await new Promise<void>((resolve) => {
      rl.question(
        boxen(chalk.green("You"), { borderColor: "green", padding: { left: 2, right: 2 }, margin: 0 }) + "\n", 
        async (content) => {
          rl.close();
          await submitMessage(content);
          resolve();
        }
      );

      const oneTime = (data: Uint8Array) => {
        process.stdin.removeListener("data", oneTime);
        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);
        process.stdout.write(data);
      };

      process.stdin.on("data", oneTime);
      Bun.write(Bun.stdout, chalk.dim('  Type here. Press Enter to send, Ctrl+C to exit.'));
      process.stdout.cursorTo(0);
    });
  }

  // const keyHandler = new KeyHandler(chalk.green("You: "));
  // keyHandler.enable();

  // keyHandler.on('keypress', async ({ key, ctrl, alt, text }) => {
  //   console.table({ key, ctrl, alt, text });
  //   if (key === "enter" && !alt && !ctrl) {
  //     currentLine = text;
  //     keyHandler.disable();
  //     await submitMessage();
  //     keyHandler.clear();
  //     keyHandler.enable();
  //   }
  // });

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