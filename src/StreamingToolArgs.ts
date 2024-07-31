import { parse, STR, OBJ } from "partial-json"

export class StreamingToolArgs extends TransformStream<Uint8Array, { key: string; value: string }> {
  private decoder = new TextDecoder()
  private buffer = ""
  private currentKey: string | null = null
  private partialObject: Record<string, any> = {}

  constructor() {
    super({
      transform: (chunk, controller) => this.handleChunk(chunk, controller),
    })
  }

  private handleChunk(chunk: Uint8Array, controller: TransformStreamDefaultController<{ key: string; value: string }>) {
    const argsTextDelta = this.decoder.decode(chunk)
    this.buffer += argsTextDelta

    try {
      const partial = parse(this.buffer, STR | OBJ)
      const keys = Object.keys(partial)

      for (const key of keys) {
        if (this.currentKey !== key) {
          this.currentKey = key
          this.partialObject[key] = ""
        }

        const newValue = partial[key]
        const prevValue = this.partialObject[key]

        if (prevValue && !newValue.startsWith(prevValue)) {
          controller.error(new Error("Error streaming JSON properties."))
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
    } catch (error) {
      // If parsing fails, it's likely due to incomplete JSON. We'll wait for more data.
    }
  }
}