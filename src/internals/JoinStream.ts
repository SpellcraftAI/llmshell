export class JoinStream<T extends Uint8Array | string> implements TransformStream<T, Uint8Array> {
  readonly writable: WritableStream<T>
  readonly readable: ReadableStream<Uint8Array>

  constructor(stream2: ReadableStream<T>) {
    const encoder = new TextEncoder()

    // Transform stream for the first input
    const transform1 = new TransformStream<T, Uint8Array>({
      transform(chunk, controller) {
        const chunkBytes = chunk instanceof Uint8Array ? chunk : encoder.encode(chunk)
        controller.enqueue(chunkBytes)
      }
    })

    // Transform stream for the second input
    const transform2 = new TransformStream<T, Uint8Array>({
      transform(chunk, controller) {
        const chunkBytes = chunk instanceof Uint8Array ? chunk : encoder.encode(chunk)
        controller.enqueue(chunkBytes)
      }
    })

    // Pipe the second stream through its transform
    const transformedStream2 = stream2.pipeThrough(transform2)

    // Create a custom ReadableStream that combines both transformed streams
    this.readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        const reader1 = transform1.readable.getReader()
        const reader2 = transformedStream2.getReader()

        let isDone1 = false
        let isDone2 = false

        const readAndEnqueue = async (reader: ReadableStreamDefaultReader<Uint8Array>, isDone: boolean) => {
          if (isDone) return true
          const { value, done } = await reader.read()
          if (done) return true
          controller.enqueue(value)
          return false
        }

        while (!isDone1 || !isDone2) {
          isDone1 = await readAndEnqueue(reader1, isDone1)
          isDone2 = await readAndEnqueue(reader2, isDone2)
        }

        controller.close()
      }
    })

    // Set up the writable side to pipe into transform1
    this.writable = transform1.writable
  }

  get [Symbol.toStringTag]() {
    return "JoinStream"
  }
}