import "../shim";
import chalk from "chalk";
import { streamText, type CoreMessage } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import readline, { createInterface, Interface } from "readline";
import ora, { type Ora } from "ora";
import boxen from "boxen";
import { tools } from "./tools";

import { startServer } from "./fs";
import { Transform } from "stream";
import { IndentWrapTransform } from "./IndentWrapper";

Object.assign(globalThis, { readline });
const DECODER = new TextDecoder();

const model = anthropic('claude-3-5-sonnet-20240620');
export const terminal = async (): Promise<void> => {
  const server = startServer();
  const messages: CoreMessage[] = [];

  const submitMessage = async (content: string): Promise<void> => {
    if (!content.trim()) {
      return;
    }

    Bun.write(Bun.stdout, '\n');
    const spinner: Ora = ora({ text: 'Loading...', spinner: "dots" }).start();
    
    messages.push({ role: "user", content });
    const { fullStream, toolCalls, toolResults } = await streamText({
      model,
      messages,
      tools,
      experimental_toolCallStreaming: true,
    });
    
    let isFirstChunk = true;
    let textResponse = '';

    const stdoutIndent = new IndentWrapTransform(2, Math.min(80, process.stdout.columns - 4));
    stdoutIndent.pipe(process.stdout);

    for await (const chunk of fullStream) {
      if (isFirstChunk) {
        isFirstChunk = false;
        spinner.stop();
        Bun.write(
          Bun.stdout, 
          boxen(chalk.yellow("Claude"), { borderColor: "yellow", padding: { left: 2, right: 2 } }) + "\n"
        );
      }

      switch (chunk.type) {
      case "text-delta": {
        const text = chunk.textDelta;
        stdoutIndent.write(text);
        textResponse += text;
        break;
      }
      }
    }

    stdoutIndent.end();

    const finishedCalls = await toolCalls;
    const finishedResults = await toolResults;

    if (finishedCalls.length > 0) {
      // process.stdout.write('\n');

      // shorten values in args with ... if they are strings
      // const formattedToolCalls = finishedCalls.map(({ toolName, args }) => ({
      //   toolName,
      //   args: Object.fromEntries(
      //     Object.entries(args).map(([key, value]) => {
      //       if (typeof value === 'string' && value.length > 50) {
      //         return [key, value.slice(0, 10) + '...'];
      //       }
      //       return [key, value];
      //     })
      //   ),
      // }));

      // for (const toolCall of formattedToolCalls) {
      //   process.stdout.write("\n");
      //   console.log(
      //     boxen(
      //       chalk.yellow(toolCall.toolName), 
      //       { 
      //         borderColor: "yellow", 
      //         padding: { left: 2, right: 2 }, 
      //         title: "Tool Call",
      //         titleAlignment: "center" 
      //       }
      //     )
      //   );
        
      //   console.table(toolCall.args);
      // }
    
      messages.push({ role: "assistant", content: finishedCalls });
      messages.push({ role: "tool", content: finishedResults });
    }

    for (const toolResult of finishedResults) {
      if (!toolResult.result) continue;

      // process.stdout.write('\n\n');
      // process.stdout.write(
      //   boxen(
      //     chalk.yellow(toolResult.toolName), 
      //     { 
      //       borderColor: "yellow", 
      //       padding: { left: 2, right: 2 }, 
      //       title: "Tool Call",
      //       titleAlignment: "center" 
      //     }
      //   )
      // );

      process.stdout.write('\n\n');

      process.stdout.write(
        boxen(
          chalk.dim(chalk.yellow(toolResult.toolName)), 
          { title: "Tool", borderColor: "yellow", padding: { left: 2, right: 2 }, dimBorder: true }
        ),
      );

      process.stdout.write('\n\n');

      const formattedArgs = Object.fromEntries(
        Object.entries(toolResult.args).map(([key, value]) => {
          if (typeof value === 'string' && value.length > 50) {
            return [key, value.slice(0, 20) + '...'];
          }
          return [key, value];
        })
      );

      console.table(formattedArgs);
      console.log();
      // process.stdout.write("\n");

      // console.log();
      let content = '';

      process.stdout.write(
        boxen(
          chalk.dim(chalk.yellow(toolResult.toolName)), 
          { title: "Output", borderColor: "yellow", padding: { left: 2, right: 2 }, dimBorder: true }
        )
      ); 

      process.stdout.write("\n");

      switch (toolResult.toolName) {
      case "terminal":
        if (toolResult.result instanceof ReadableStream) {
          const reader = toolResult.result.getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const text = DECODER.decode(value);
            Bun.write(Bun.stdout, value);
            content += text;
          }
        }
        break;

      case "read":
      case "write":
      case "edit":
        if (typeof toolResult.result === 'object' && 'data' in toolResult.result) {
          content = toolResult.result.data as string;
          Bun.write(Bun.stdout, chalk.dim(chalk.yellow(content)));
        }
        break;
      }
    }

    messages.push({ role: "assistant", content: textResponse });
  };

  process.on("exit", () => {
    server.stop();
  });

  while (true) {
    const userTextMessages: CoreMessage[] = 
      messages
        .filter(({ role }) => role === "user")
        .filter(({ content }) => typeof content === "string")
        .reverse();
        
    const inputIndent = new IndentWrapTransform(2, Math.min(80, process.stdout.columns - 4));

    const rl: Interface = createInterface({
      input: process.stdin,
      output: process.stdout,
      history: userTextMessages.map(({ content }) => content as string),
      tabSize: 2,
    });

    rl.addListener("SIGINT", () => {
      console.log("\n");
      rl.close();
      process.exit();
    });

    await new Promise<void>((resolve) => {
      process.stdout.write('\n\n');
      process.stdout.write(boxen(chalk.blue("You"), { borderColor: "blue", padding: { left: 2, right: 2 } }));
      process.stdout.write('\n  ');
      rl.on(
        "line", 
        async (content: string) => {
          rl.close();
          await submitMessage(content);
          resolve();
        }
      );

      const oneTime = (data: Uint8Array) => {
        // Check if the first byte is within ASCII printable character range
        const isASCII = data[0] >= 32 && data[0] <= 126;
        const isPaste = data.length > 3;

        const isEnter = data[0] === 13;
        if (isEnter) {
          console.log('first enter');
          return;
        }

        if (!isASCII && !isPaste) {
          return;
        }

        // Remove the listener after the first keypress.
        process.stdin.removeListener("data", oneTime);

        // Move down to the instructions line.
        process.stdout.moveCursor(0, 1);
        // Clear it.
        process.stdout.clearLine(0);
        // Return to the input line.
        process.stdout.moveCursor(0, -1);
        // Add the indent.
        process.stdout.cursorTo(2);

        Bun.write(Bun.stdin, data);
      };

      process.stdin.on("data", oneTime);
      Bun.write(Bun.stdout, chalk.dim('\n  Begin typing. Press Enter to send, Ctrl+C to exit.'));
      process.stdout.moveCursor(0, -1);
      process.stdout.cursorTo(2);
    });
  }
};