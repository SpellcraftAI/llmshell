import { marked, type MarkedOptions, type Token, type TokensList } from "marked"
import chalk from "chalk"
import { appendFile } from "node:fs/promises"

interface ParserState {
  isInCodeBlock: boolean
  codeBlockLang: string
}


class StreamingLexer extends marked.Lexer {
  private buffer: string = ""
  private length: number = 0
  
  constructor(options?: MarkedOptions) {
    super(options)
  }

  lex(src: string): TokensList {
    this.buffer += src
    this.tokens = this.lex(this.buffer)
    return this.tokens
  }

  *lexStream(src: string): Generator<Token, void, unknown> {
    const tokens = this.lex(src)
    yield* tokens
  }
}

function renderToken(token: Token, state: ParserState): string {
  // console.log({ token })
  switch (token.type) {
  case "heading":
    return chalk.bold(token.text)
  case "paragraph":
    return renderInline(token.tokens, state)
  case "strong":
    return chalk.bold(renderInline(token.tokens, state))
  case "em":
    return chalk.italic(renderInline(token.tokens, state))
  case "codespan":
    return chalk.red(token.text)
  case "list":
    return token.items.map((item) => renderToken(item, state)).join("")
  case "listitem":
    return renderInline(token.tokens, state)
  case "blockquote":
    return chalk.gray("> " + renderInline(token.tokens, state))
  case "code":
    return chalk.dim(token.text)
  case "text":
    return token.raw
  default:
    return token.raw
  }
}

function renderInline(tokens: Token[] | undefined, state: ParserState): string {
  if (!tokens) return ""
  return tokens.map(token => renderToken(token, state)).join("")
}

export class MarkdownANSITransform extends TransformStream<Uint8Array, Uint8Array> {
  private buffer: string = ""
  private tokens: Token[] = []
  private decoder: TextDecoder
  private encoder: TextEncoder
  private lexer: StreamingLexer
  private state: ParserState

  private lastTokens: Set<Token> = new Set()

  constructor() {
    super({
      transform: (chunk, controller) => this.transform(chunk, controller),
      // flush: (controller) => this.flush(controller),
      start: async () => await Bun.write("tokens.jsonl", "")
    })

    this.decoder = new TextDecoder()
    this.encoder = new TextEncoder()
    this.lexer = new StreamingLexer()
    this.state = {
      isInCodeBlock: false,
      codeBlockLang: ""
    }
  }

  private async transform(chunk: Uint8Array, controller: TransformStreamDefaultController<Uint8Array>) {
    const chunkText = this.decoder.decode(chunk, { stream: true })
    this.buffer += chunkText
    console.log({ chunk, buffer: this.buffer })

    const tokenBuffer = this.lexer.lex(chunkText)
    const newTokens = tokenBuffer.slice(this.tokens.length)

    const lastTokenIndex = this.tokens.length - 1
    const lastToken = this.tokens[lastTokenIndex]
    const updatedLastToken = tokenBuffer[lastTokenIndex]
    const hasUpdate = updatedLastToken && lastToken?.raw !== updatedLastToken?.raw

    console.log({ oldBuffer: this.tokens, newBuffer: tokenBuffer, hasUpdate })

    this.tokens = tokenBuffer

    if (hasUpdate) {
      if (updatedLastToken.type !== lastToken.type) {
        throw new Error(`Token type mismatch: ${lastToken.type} !== ${updatedLastToken.type}`)
      }

      const renderedNew = renderToken(updatedLastToken, this.state)
      const renderedOld = renderToken(lastToken, this.state)
      const update = renderedNew.slice(renderedOld.length)

      controller.enqueue(this.encoder.encode(update))
      await appendFile("tokens.jsonl", JSON.stringify({ update }) + "\n")
    }

    for (const newToken of newTokens) {
      const rendered = renderToken(newToken, this.state)

      await appendFile("tokens.jsonl", JSON.stringify({ token: newToken }) + "\n")
      controller.enqueue(this.encoder.encode(rendered))
    }
  }

  // private flush(controller: TransformStreamDefaultController<Uint8Array>) {
  //   if (this.buffer.length > 0) {
  //     const rendered = renderToken({ type: "text", raw: this.buffer }, this.state)
  //     controller.enqueue(this.encoder.encode(rendered))
  //   }
  // }
}