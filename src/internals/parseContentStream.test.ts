import { expect, test } from "bun:test"
import { parseContentStream } from "./parseContentStream"
import type { JSONPropertyChunk } from "./JSONPropertyStream"

const DECODER = new TextDecoder()

test("parseContentStream handles basic parameter and content streaming", async () => {
  const inputStream = new ReadableStream<JSONPropertyChunk>({
    async start(controller) {
      controller.enqueue({ key: "param1", value: "valu" })
      controller.enqueue({ key: "param1", value: "e 1" })
      controller.enqueue({ key: "param2", value: "va" })
      controller.enqueue({ key: "param2", value: "lue 2" })
      controller.enqueue({ key: "content", value: new TextEncoder().encode("Hello") })
      controller.enqueue({ key: "content", value: new TextEncoder().encode(" World") })
      controller.close()
    }
  })

  const result = await parseContentStream(inputStream)
  
  expect(result.param1).toBe("value 1")
  expect(result.param2).toBe("value 2")
  
  const contentReader = result.content.getReader()
  let content = ""
  while (true) {
    const { done, value } = await contentReader.read()
    if (done) break
    content += DECODER.decode(value)
  }

  expect(content).toBe("Hello World")
})

test("parseContentStream handles parameter updates", async () => {
  const inputStream = new ReadableStream({
    async start(controller) {
      controller.enqueue({ key: "param", value: "Hello" })
      controller.enqueue({ key: "param", value: " World" })
      controller.close()
    }
  })

  const result = await parseContentStream(inputStream)
  
  expect(result.param).toBe("Hello World")
})

test("parseContentStream handles empty stream", async () => {
  const inputStream = new ReadableStream({
    async start(controller) {
      controller.close()
    }
  })

  const result = await parseContentStream(inputStream)
  
  expect(Object.keys(result).length).toBe(1) // Only 'content' key
  
  const contentReader = result.content.getReader()
  const { done, value } = await contentReader.read()
  expect(done).toBe(true)
})

test("parseContentStream handles stream with only content", async () => {
  const inputStream = new ReadableStream({
    async start(controller) {
      controller.enqueue({ key: "content", value: new TextEncoder().encode("Only Content") })
      controller.close()
    }
  })

  const result = await parseContentStream(inputStream)
  
  expect(Object.keys(result).length).toBe(1) // Only 'content' key
  
  const contentReader = result.content.getReader()
  const { done: firstDone, value } = await contentReader.read()
  expect(firstDone).toBe(false)
  expect(new TextDecoder().decode(value)).toBe("Only Content")

  const { done: secondDone } = await contentReader.read()
  expect(secondDone).toBe(true)
})

test("parseContentStream handles multiple parameters without content", async () => {
  const inputStream = new ReadableStream({
    async start(controller) {
      controller.enqueue({ key: "param1", value: "value1" })
      controller.enqueue({ key: "param2", value: "value2" })
      controller.enqueue({ key: "param3", value: "value3" })
      controller.close()
    }
  })

  const result = await parseContentStream(inputStream)
  
  expect(result.param1).toBe("value1")
  expect(result.param2).toBe("value2")
  expect(result.param3).toBe("value3")
  
  const contentReader = result.content.getReader()
  const { done } = await contentReader.read()
  expect(done).toBe(true)
})