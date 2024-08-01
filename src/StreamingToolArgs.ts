import { parse, STR, OBJ, NUM } from "partial-json"

export interface ToolArgChunk<T = any> {
  key: string
  value: T
}

export class StreamingToolArgs extends TransformStream<Uint8Array, ToolArgChunk> {
  private decoder = new TextDecoder()
  private buffer = ""

  private lastParsed: Record<string, any> = {}
  private parsed: Record<string, any> = {}

  private lastKey: string | undefined
  private knownKeys = new Set<string>()
  private emittedKeys = new Set<string>()

  constructor() {
    super({
      transform: (chunk, controller) => this.handleChunk(chunk, controller),
      flush: (controller) => this.flushRemaining(controller),
    })
  }

  private parseBuffer(controller: TransformStreamDefaultController<ToolArgChunk>) {
    this.parsed = parse(this.buffer, STR | OBJ | NUM)
    // console.log({ lastKey: this.lastKey, parsed: this.parsed, lastParsed: this.lastParsed })

    const keys = Object.keys(this.parsed)
    for (const key of keys) {
      this.knownKeys.add(key)
    }
    
    // Update existing partial string param.
    if (this.lastKey && this.lastParsed[this.lastKey] !== this.parsed[this.lastKey]) {
      // console.log("Updating last string key")
      const currentValue = this.parsed[this.lastKey]
      if (typeof currentValue !== "string") {
        throw new Error(`Expected string value for key: ${JSON.stringify(this.parsed)} ${this.lastKey}`)
      }

      const prevValue = this.lastParsed[this.lastKey]
      const deltaText = currentValue.slice(prevValue.length)
      controller.enqueue({ key: this.lastKey, value: deltaText })
    }

    const newKeys = this.knownKeys.difference(this.emittedKeys)
    for (const key of newKeys) {
      this.lastKey = key
      this.emittedKeys.add(key)
      
      const value = this.parsed[key]
      controller.enqueue({ key, value })
    }

    this.lastParsed = this.parsed
  }

  private handleChunk(chunk: Uint8Array, controller: TransformStreamDefaultController<ToolArgChunk>) {
    const argsTextDelta = this.decoder.decode(chunk)
    this.buffer += argsTextDelta
    
    this.parseBuffer(controller)
  }

  private flushRemaining(controller: TransformStreamDefaultController<ToolArgChunk>) {
    this.parseBuffer(controller)
  }
}