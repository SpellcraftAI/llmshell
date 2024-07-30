import "../shim";
import chalk from "chalk";
import { EventEmitter } from 'events';
import { streamText, type CoreMessage } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { tools } from "./tools";
import { startServer } from "./fs";

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

async function* readStdin(): AsyncIterable<Uint8Array> {
  const reader = Bun.stdin.stream().getReader();
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    yield value;
  }
}

interface KeyState {
  key: string;
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  meta: boolean;
}

class KeyboardHandler extends EventEmitter {
  private stdin: typeof process.stdin;

  constructor() {
    super();
    this.stdin = process.stdin;
    this.stdin.setRawMode(true);
    this.stdin.resume();
    this.stdin.setEncoding('utf8');
    this.stdin.on('data', this.handleKeyPress.bind(this));
  }

  private handleKeyPress(chunk: string) {
    const keyState: KeyState = {
      key: chunk,
      ctrl: false,
      alt: false,
      shift: false,
      meta: false,
    };

    // Check for modifier keys
    if (chunk.length > 1) {
      keyState.ctrl = (chunk.charCodeAt(0) & 32) === 0;
      // Add checks for other modifier keys if needed
    }

    this.emit('keypress', keyState);
  }

  close() {
    this.stdin.setRawMode(false);
    this.stdin.pause();
    this.removeAllListeners();
  }
}


export const terminal = async () => {
  console.log();
  console.log(chalk.grey("Start typing to chat with the bot. Press Ctrl+C to exit.\n"));

  let currentLine = '';
  Bun.write(Bun.stdout, chalk.green("You: "));

  const messages: CoreMessage[] = [];

  const server = startServer();
  const keyboardHandler = new KeyboardHandler();

  process.on("exit", () => {
    server.stop();
    keyboardHandler.close();
  });

  keyboardHandler.on('keypress', async (keyState: KeyState) => {
    if (keyState.key === '\u0003') { // Ctrl+C
      process.exit();
    }

    if (keyState.key !== '\r' && keyState.key !== '\n') {
      currentLine += keyState.key;
      Bun.write(Bun.stdout, keyState.key);
      return;
    }

    if (keyState.ctrl || keyState.alt || keyState.shift || keyState.meta) {
      currentLine += '\n';
      Bun.write(Bun.stdout, '\n');
      return;
    }

    if (!currentLine.trim()) {
      currentLine = '';
      Bun.write(Bun.stdout, '\n' + chalk.green("You: "));
      return;
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
          Bun.write(Bun.stdout, '\r' + ' '.repeat(20) + '\r');
          Bun.write(Bun.stdout, chalk.blue("Bot: "));
          isFirstChunk = false;
        }
      
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
  
    currentLine = '';
    Bun.write(Bun.stdout, "\n\n");
    Bun.write(Bun.stdout, chalk.green("You: "));
  });

  // for await (const character of readStdin()) {
  //   const characterString = DECODER.decode(character);
  //   for (const char of characterString) {
  //     if (char !== '\n') {
  //       currentLine += char;
  //       continue;
  //     }

  //     if (!currentLine.trim()) {
  //       currentLine = '';
  //       Bun.write(Bun.stdout, chalk.green("You: "));
  //       continue;
  //     }

  //     Bun.write(Bun.stdout, '\n');
  //     const loadingInterval = showLoadingDots();

  //     // Add user message to the conversation history
  //     messages.push({ role: "user", content: currentLine });

      
  //   }
  // }
};