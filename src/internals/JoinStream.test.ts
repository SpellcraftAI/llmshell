import { expect, test } from "bun:test"
import { JoinStream } from "./JoinStream"

async function collectResults(stream: ReadableStream<Uint8Array>): Promise<string> {
  let result = ""
  const reader = stream.getReader()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    result += new TextDecoder().decode(value)
  }
  return result
}

test("JoinStream interleaves two streams", async () => {
  const stream1 = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode("A1 "))
      controller.enqueue(new TextEncoder().encode("A2 "))
      controller.close()
    }
  })

  const stream2 = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode("B1 "))
      controller.enqueue(new TextEncoder().encode("B2 "))
      controller.close()
    }
  })

  const joinedStream = stream1.pipeThrough(new JoinStream(stream2))
  const result = await collectResults(joinedStream)

  expect(result).toBe("A1 B1 A2 B2 ")
})

test("JoinStream works with pipeThrough", async () => {
  const stream1 = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode("A1 "))
      controller.enqueue(new TextEncoder().encode("A2 "))
      controller.close()
    }
  })

  const stream2 = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode("B1 "))
      controller.enqueue(new TextEncoder().encode("B2 "))
      controller.close()
    }
  })

  const transformStream = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      const upperChunk = new TextEncoder().encode(new TextDecoder().decode(chunk).toUpperCase())
      controller.enqueue(upperChunk)
    }
  })

  const joinedStream = stream1
    .pipeThrough(new JoinStream(stream2))
    .pipeThrough(transformStream)

  const result = await collectResults(joinedStream)

  expect(result).toBe("A1 B1 A2 B2 ".toUpperCase())
})

// Add other tests here...