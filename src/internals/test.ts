import { FileWriterStream } from "@/internals/FileWriteStream"
import { Lexer, type MarkedOptions, type Token } from "marked"
import chalk from "chalk"
import boxen from "boxen"

const indent = (string: string, indent = 2) => {
  return string.split("\n").map(line => " ".repeat(indent) + line).join("\n")
}

export class StreamingLexer extends TransformStream<Uint8Array, Uint8Array> {
  #encoder = new TextEncoder()
  #decoder = new TextDecoder()
  #position = 0
  #lastToken: Token | null = null

  private buffer: string = ""
  private tokens: Token[] = []
  private processedLength: number = 0

  constructor(private options?: MarkedOptions) {
    super({
      transform: (chunk, controller) => this.transform(chunk, controller)
    })
  }

  private renderToken(token: Token): string {
    // console.table([token], ["type", "raw", "tokens"] )

    switch (token.type) {
    case "heading":
      return this.applyStyle("heading", token.text)
    case "codespan":
      return this.applyStyle("codespan", token.text)
    case "paragraph":
    case "blockquote":
    // case "list":
    case "list_item":
    case "em":
    case "strong":
    // case "text":
      let content = "" 
      if (token.tokens) {
        content = token.tokens.map(childToken => this.renderToken(childToken)).join("")
      } else {
        content = token.text
      }
      return this.applyStyle(token.type, content)
    case "code":
      let block = ""
      if (token.lang) {
        block += boxen(chalk.dim(`${token.lang?.toUpperCase()}`), { title: "Code", textAlignment: "center", margin: { left: 2 }, padding: { left: 1, right: 1, top: 0, bottom: 0 } })
        block += "\n"
      }
      block += this.applyStyle("code", token.text)
      return block
    default:
      return token.raw
    }
  }

  private applyStyle(tokenType: string, content: string, inline = false): string {
    const indented = indent(content)
    switch (tokenType) {
    case "heading":
      return chalk.bold.blue(content)
    case "codespan":
      return chalk.red(content)
    case "paragraph":
      return `${content}`
    case "blockquote":
      return chalk.gray(inline ? content : indent(content))
    case "code":
      return chalk.dim((inline ? content : indented))
    case "strong":
      return chalk.bold(content)
    case "em":
      return chalk.italic(content)
    case "list":
    case "list_item":
      return inline ? content : indent(content)
    default:
      return content
    }
  }

  private transform(chunk: Uint8Array, controller: TransformStreamDefaultController<Uint8Array>) {
    const lexer = new Lexer(this.options)
    this.buffer += this.#decoder.decode(chunk)

    const prevTokens = this.tokens.slice()
    const prevLength = prevTokens.length
    this.tokens = lexer.lex(this.buffer)
    
    /**
     * Update last token if the number of tokens has not changed
     */
    if (this.tokens.length === prevLength) {
      const prevToken = prevTokens[prevLength - 1]
      const currentToken = this.tokens[prevLength - 1]
      const update = currentToken.raw.slice(prevToken.raw.length)
      const rendered = this.applyStyle(currentToken.type, update, true)
      controller.enqueue(this.#encoder.encode(rendered))
    }

    for (const token of this.tokens.slice(prevLength)) {
      const rendered = this.renderToken(token)
      controller.enqueue(this.#encoder.encode(rendered))
    }

    // console.log({ buffer: this.buffer })
    // console.log(this.tokens.length, this.#position)

    // console.log()
    // console.log("TRANSFORM")
    return
    const lastIndex = this.#lastToken ? this.tokens.indexOf(this.#position) : -1
    const remaining = this.tokens.slice(lastIndex)
    for (const token of remaining) {
      // console.log("LOOP", this.tokens.length, this.#position)
      // console.log({ token, lastToken: this.#lastToken })
      const renderedToken = this.renderToken(token)
      const renderedLength = renderedToken.length

      // console.log()
      // console.log(JSON.stringify(token))
      // console.log(JSON.stringify(this.#lastToken))
      // console.log(this.tokens)
      // console.log({ token })
      // console.log({ renderedToken })
      // console.log()
      // console.log()

      // controller.enqueue(this.#encoder.encode(renderedToken))

      if (this.#lastToken?.type === "heading" && token.type !== "heading") {
        // controller.enqueue(this.#encoder.encode("\n"))
      }

      if (currentLength + renderedLength > this.processedLength) {
        const startIndex = Math.max(0, this.processedLength - currentLength)
        // console.log(token)
        controller.enqueue(this.#encoder.encode(this.applyStyle(token.type, renderedToken.slice(startIndex))))
      }

      currentLength += renderedLength
      // this.#position += 1
      this.#lastToken = token
    }

    this.processedLength = currentLength
    
    // if (output) {
    //   controller.enqueue(this.#encoder.encode(output))
    // }
  }
}

const ENCODER = new TextEncoder()

const inputStream = new ReadableStream<Uint8Array>({
  start(controller) {
    const inputs = [
      "# Hello, this",
      " is a test with escaped chars < > '",
      "\n\n**bold** *italic*\n\n",
      "\`\`\`js\nconst x = 5;\nfunction () {}\n\`\`\`\n\n",
      "this is \`inline code\`\n\n",
      "> This is a blockquote with several ",
      "lines over multiple chunks\n", 
      "> Second line with even more text, again ",
      "over multiple chunks",
      "\n\n",
      "1. List item 1\n2. List item 2",
      "\n\n",
      "**bold",
      "**"
    ]

    for (const input of inputs) {
      controller.enqueue(ENCODER.encode(input))
    }

    controller.close()
  }
})

await inputStream.pipeThrough(new StreamingLexer()).pipeTo(new FileWriterStream(Bun.stdout))
await Bun.write(Bun.stdout, "\n\n")