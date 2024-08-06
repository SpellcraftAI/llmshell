export class IndentTransform extends TransformStream<Uint8Array, Uint8Array> {
  private indent: string
  private wrapWidth: number
  private currentLineLength: number
  private isStartOfLine: boolean
  private wordBuffer: string
  private breakPoint: number

  #textEncoder = new TextEncoder()
  #textDecoder = new TextDecoder()

  constructor(indent: number = 2, wrapWidth: number = 80) {
    super({
      transform: async (chunk, controller) => {
        this.processText(controller, this.#textDecoder.decode(chunk, { stream: false }))
      },
      flush: (controller: TransformStreamDefaultController<Uint8Array>) => {
        this.flushWordBuffer(controller)
      }
    })

    this.indent = " ".repeat(indent)
    this.wrapWidth = wrapWidth - indent
    this.currentLineLength = 0
    this.isStartOfLine = true
    this.wordBuffer = ""
    this.breakPoint = Math.floor(this.wrapWidth * 0.8)
  }

  private enqueue(controller: TransformStreamDefaultController<Uint8Array>, text: string): void {
    controller.enqueue(this.#textEncoder.encode(text))
  }

  private processText(controller: TransformStreamDefaultController<Uint8Array>, input: string): void {
    for (let i = 0; i < input.length; i++) {
      const char = input[i]
      this.processChar(controller, char)
    }
    this.flushWordBuffer(controller)
  }

  private processChar(controller: TransformStreamDefaultController<Uint8Array>, char: string): void {
    if (this.isStartOfLine && this.currentLineLength === 0) {
      this.enqueue(controller, this.indent)
      this.currentLineLength = this.indent.length
      this.isStartOfLine = false
    }

    if (char === "\n") {
      this.flushWordBuffer(controller)
      this.enqueue(controller, "\n")
      this.currentLineLength = 0
      this.isStartOfLine = true
    } else if (char === " ") {
      this.flushWordBuffer(controller)
      if (this.currentLineLength >= this.breakPoint) {
        // If we're in the last 20% of the line, break here
        this.enqueue(controller, "\n")
        this.currentLineLength = 0
        this.isStartOfLine = true
      } else if (this.currentLineLength < this.wrapWidth) {
        this.enqueue(controller, " ")
        this.currentLineLength++
      }
    } else {
      this.wordBuffer += char
    }
  }

  private flushWordBuffer(controller: TransformStreamDefaultController<Uint8Array>): void {
    if (this.wordBuffer.length === 0) return
  
    while (this.wordBuffer.length > 0) {
      const availableSpace = this.wrapWidth - this.currentLineLength
      
      if (availableSpace === 0) {
        this.enqueue(controller, "\n" + this.indent)
        this.currentLineLength = this.indent.length
        continue
      }
  
      if (this.wordBuffer.length <= availableSpace) {
        this.enqueue(controller, this.wordBuffer)
        this.currentLineLength += this.wordBuffer.length
        break
      } else {
        const splitIndex = availableSpace - 1
        this.enqueue(controller, this.wordBuffer.slice(0, splitIndex) + "-")
        this.enqueue(controller, "\n" + this.indent)
        this.wordBuffer = this.wordBuffer.slice(splitIndex)
        this.currentLineLength = this.indent.length
      }
    }
    
    this.wordBuffer = ""
  }
}