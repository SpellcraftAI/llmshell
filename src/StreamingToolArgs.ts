import { parse, STR, OBJ } from "partial-json"

export interface ToolArgChunk<T = any> {
  key: string
  value: T
}

export class StreamingToolArgs extends TransformStream<Uint8Array, ToolArgChunk> {
  private decoder = new TextDecoder()
  private buffer = ""
  private partialObject: Record<string, string> = {}

  constructor() {
    super({
      transform: (chunk, controller) => this.handleChunk(chunk, controller),
    })
  }

  private handleChunk(chunk: Uint8Array, controller: TransformStreamDefaultController<ToolArgChunk>) {
    const argsTextDelta = this.decoder.decode(chunk)
    this.buffer += argsTextDelta

    const partial = parse(this.buffer, STR | OBJ)
    const keys = Object.keys(partial)

    for (const key of keys) {
      const newValue = partial[key]
      const prevValue = this.partialObject[key] || ""

      if (newValue.length < prevValue.length) {
        controller.error(new Error("Error streaming JSON properties: new value shorter than previous value."))
        return
      }

      const deltaValue = newValue.slice(prevValue.length)
        
      if (deltaValue) {
        controller.enqueue({
          key,
          value: deltaValue
        })
          
        this.partialObject[key] = newValue
      }
    }

  }
}