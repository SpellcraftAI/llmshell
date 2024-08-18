import { marked, type Token, type MarkedOptions, type Tokens, Tokenizer } from "marked"
import chalk from "chalk"
import TerminalRenderer from "marked-terminal"
import { FileWriterStream } from "./FileWriteStream"

class CustomTokenizer extends Tokenizer {
  constructor(options?: MarkedOptions) {
    super(options)
  }

  inlineText(src: string): Tokens.Text | undefined {
    if (src.startsWith("**")) {
      return { 
        type: "text", 
        raw: "**", 
        text: "**", 
        tokens: [
          { type: "strong", raw: "**" }
        ] 
      }
    }

    if (src.startsWith("*")) {
      return {
        type: "text",
        raw: "*",
        text: "*",
        tokens: [
          { type: "em", raw: "*" }
        ]
      }
    }

    if (src.startsWith("```")) {
      return {
        type: "text",
        raw: "```",
        text: "```",
        tokens: [
          { type: "code", raw: "```" }
        ]
      }
    }

    if (src.startsWith("`")) {
      return {
        type: "text",
        raw: "`",
        text: "`",
        tokens: [
          { type: "codespan", raw: "`" }
        ]
      }
    }

    // For other cases, tokenize as normal text
    return super.inlineText(src)
  }
}

class CustomRenderer extends TerminalRenderer {
  strong(text: string): string {
    return chalk.bold(text)
  }

  em(text: string): string {
    return chalk.italic(text)
  }

  codespan(text: string): string {
    return chalk.cyan(text)
  }

  heading(text: string, level: number): string {
    const prefix = "#".repeat(level) + " "
    switch (level) {
    case 1:
      return chalk.bold(prefix + text)
    case 2:
      return chalk.green(prefix + text)
    default:
      return chalk.yellow(prefix + text)
    }
  }

  paragraph(text: string): string {
    return text + "\n\n"
  }
}

const customTokenizer = new CustomTokenizer()
const customRenderer = new CustomRenderer()

marked.use(customRenderer)
marked.use({
  tokenizer: customTokenizer
})

class MarkdownANSIStream extends TransformStream {
  #encoder = new TextEncoder()
  #decoder = new TextDecoder()
  #buffer = ""
  #currentToken: Token | null = null

  constructor() {
    super({
      transform: (chunk, controller) => {
        const text = this.#decoder.decode(chunk)
        this.#buffer += text

        while (this.#buffer.length > 0) {
          if (this.#currentToken) {
            // We're in the middle of a token, continue it
            const endIndex = this.#buffer.indexOf(this.#currentToken.raw)
            if (endIndex !== -1) {
              // Token is complete
              const tokenContent = this.#buffer.slice(0, endIndex)
              const rendered = this.renderToken(this.#currentToken, tokenContent)
              controller.enqueue(this.#encoder.encode(rendered))
              this.#buffer = this.#buffer.slice(endIndex + this.#currentToken.raw.length)
              this.#currentToken = null
            } else {
              // Token is still incomplete
              const rendered = this.renderToken(this.#currentToken, this.#buffer)
              controller.enqueue(this.#encoder.encode(rendered))
              this.#buffer = ""
            }
          } else {
            // Look for a new token
            const token = customTokenizer.inlineText(this.#buffer)
            if (token && token.type !== "text") {
              this.#currentToken = token
              this.#buffer = this.#buffer.slice(token.raw.length)
            } else {
              // No special token, render as normal text
              const endIndex = this.#buffer.indexOf("*") !== -1 ? this.#buffer.indexOf("*") :
                this.#buffer.indexOf("`") !== -1 ? this.#buffer.indexOf("`") :
                  this.#buffer.length
              const text = this.#buffer.slice(0, endIndex)
              controller.enqueue(this.#encoder.encode(text))
              this.#buffer = this.#buffer.slice(endIndex)
            }
          }
        }
      }
    })
  }

  renderToken(token: Token, content: string): string {
    switch (token.type) {
    case "strong":
      return customRenderer.strong(content)
    case "em":
      return customRenderer.em(content)
    case "codespan":
      return customRenderer.codespan(content)
    default:
      return content
    }
  }
}

const ENCODER = new TextEncoder()

const inputStream = new ReadableStream<Uint8Array>({
  start(controller) {
    const inputs = [
      "# Hello, this",
      " is a test with escaped chars < > '",
      "\n\n**bold** *italic*\n\n",
      "*", "italic", "*\n\n",
      "\`\`\`js\nconst x = 5;\n",
      "function () {}\n\`\`\`\n\n",
      "this is \`inline code\`\n\n",
      "> This is a blockquote\n", 
      "> Second line\n\n",
      "1. List item 1\n2. List item 2",
      "\n\n",
      "**",
      "bold",
      "**"
    ]

    for (const input of inputs) {
      controller.enqueue(ENCODER.encode(input))
    }

    controller.close()
  }
})

await inputStream.pipeThrough(new MarkdownANSIStream()).pipeTo(new FileWriterStream(Bun.stdout))
await Bun.write(Bun.stdout, "\n\n")