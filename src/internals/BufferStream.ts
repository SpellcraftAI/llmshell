export class BufferStream<T extends string | Uint8Array> extends TransformStream<T, Uint8Array> {
  #buffer = new Uint8Array()
  #encoder = new TextEncoder()

  /**
   * 
   * @param singleChunk If `true`, only the finished buffer is enqueued. If
   * `false, the buffer is enqueued as each chunk is received. Default: false.
   */
  constructor(
    singleChunk = false
  ) {
    super({
      transform: (chunk, controller) => {
        let chunkBytes: Uint8Array
        if (typeof chunk === "string") {
          chunkBytes = this.#encoder.encode(chunk)
        } else {
          chunkBytes = chunk
        }

        const newBuffer = new Uint8Array(this.#buffer.length + chunkBytes.length)

        newBuffer.set(this.#buffer, 0)
        newBuffer.set(chunkBytes, this.#buffer.length)

        this.#buffer = newBuffer
        if (!singleChunk) {
          controller.enqueue(chunkBytes)
        }
      },
      flush: (controller) => {
        if (singleChunk) {
          controller.enqueue(this.#buffer)
        }
      }
    })
  }
}