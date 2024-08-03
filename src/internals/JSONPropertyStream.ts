import { parse, STR, OBJ, NUM } from "partial-json"

export interface ToolArgChunk<T = unknown> {
  key: string
  value: T
}

export class JSONPropertyStream extends TransformStream<Uint8Array, ToolArgChunk> {
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
    if (!this.buffer) return
    this.parsed = parse(this.buffer, STR | OBJ)

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
    for (const newKey of newKeys) {
      this.lastKey = newKey
      this.emittedKeys.add(newKey)
      
      const value = this.parsed[newKey]
      // console.log("ENQUEUING", { key: newKey, value })
      controller.enqueue({ key: newKey, value })
    }

    this.lastParsed = this.parsed
  }

  private handleChunk(chunk: Uint8Array, controller: TransformStreamDefaultController<ToolArgChunk>) {
    const bufferDelta = this.decoder.decode(chunk)
    this.buffer += bufferDelta
    this.parseBuffer(controller)
  }

  private flushRemaining(controller: TransformStreamDefaultController<ToolArgChunk>) {
    this.parseBuffer(controller)
  }
}