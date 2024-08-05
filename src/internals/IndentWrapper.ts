import { Transform } from "stream"

type TransformCallback = (error?: Error | null, data?: any) => void;

export class SimpleIndentWrapTransform extends Transform {
  private indent: string
  private wrapWidth: number
  private currentLine: string
  private isStartOfLine: boolean

  constructor(indent: number = 0, wrapWidth: number = 80) {
    super()
    this.indent = " ".repeat(indent)
    this.wrapWidth = wrapWidth - indent
    this.currentLine = ""
    this.isStartOfLine = true
  }

  private pushLine(line: string, addHyphen: boolean = false, addNewline = true): void {
    if (addHyphen) {
      line += "-"
    }
    this.push(this.indent + line + (addNewline ? "\n" : ""))
    this.currentLine = ""
    this.isStartOfLine = true
  }

  _transform(chunk: Buffer, encoding: string, callback: TransformCallback): void {
    const input = chunk.toString()

    for (let i = 0; i < input.length; i++) {
      const char = input[i]
      // console.log({ char })

      if (char === "\n") {
        this.pushLine(this.currentLine)
        continue
      }

      if (this.isStartOfLine && this.currentLine.length === 0 && char === " ") {
        continue // Skip leading spaces on new lines
      }

      this.currentLine += char
      this.isStartOfLine = false

      if (this.currentLine.length === this.wrapWidth) {
        // No space found, break with hyphen
        this.pushLine(this.currentLine.slice(0, -1), true)
        this.currentLine = char
      }
    }

    callback()
  }

  _flush(callback: TransformCallback): void {
    if (this.currentLine) {
      this.pushLine(this.currentLine, false, false)
    }
    callback()
  }
}