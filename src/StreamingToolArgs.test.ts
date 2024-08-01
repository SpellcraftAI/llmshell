import { expect, test } from "bun:test"
import { StreamingToolArgs, type ToolArgChunk } from "./StreamingToolArgs"

async function collectResults(stream: ReadableStream<ToolArgChunk>): Promise<ToolArgChunk[]> {
  const results: ToolArgChunk[] = []
  const reader = stream.getReader()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    results.push(value)
  }
  return results
}

test("StreamingToolArgs handles single property JSON", async () => {
  const inputStream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode("{\"abc\": \"xy"))
      controller.enqueue(new TextEncoder().encode("zabc\"}"))
      controller.close()
    }
  })

  const results = await collectResults(inputStream.pipeThrough(new StreamingToolArgs()))

  expect(results).toEqual([
    { key: "abc", value: "xy" },
    { key: "abc", value: "zabc" },
  ])
})

test("StreamingToolArgs handles multiple property JSON", async () => {
  const inputStream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode("{\"abc\": \"xy"))
      controller.enqueue(new TextEncoder().encode("z\", \"def\": \"12"))
      controller.enqueue(new TextEncoder().encode("3\"}"))
      controller.close()
    }
  })

  const results = await collectResults(inputStream.pipeThrough(new StreamingToolArgs()))

  expect(results).toEqual([
    { key: "abc", value: "xy" },
    { key: "abc", value: "z" },
    { key: "def", value: "12" },
    { key: "def", value: "3" },
  ])
})

test("StreamingToolArgs handles incomplete JSON", async () => {
  const inputStream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode("{\"abc\": \"xy"))
      controller.enqueue(new TextEncoder().encode("z\", \"def\": \"12"))
      controller.close()
    }
  })

  const results = await collectResults(inputStream.pipeThrough(new StreamingToolArgs()))

  expect(results).toEqual([
    { key: "abc", value: "xy" },
    { key: "abc", value: "z" },
    { key: "def", value: "12" },
  ])
})

test("StreamingToolArgs handles empty object", async () => {
  const inputStream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode("{}"))
      controller.close()
    }
  })

  const results = await collectResults(inputStream.pipeThrough(new StreamingToolArgs()))

  expect(results).toEqual([])
})

test("StreamingToolArgs handles object with empty string values", async () => {
  const inputStream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode("{\"a\": \"\", "))
      controller.enqueue(new TextEncoder().encode("\"b\": \"\"}"))
      controller.close()
    }
  })

  const results = await collectResults(inputStream.pipeThrough(new StreamingToolArgs()))
  const expectedResults: ToolArgChunk[] = [
    { key: "a", value: "" },
    { key: "b", value: "" }
  ]

  expect(results).toEqual(expectedResults)
})

test("StreamingToolArgs handles chunked serialized object", async () => {
  const inputStream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode("{\"path\":\"test_"))
      controller.enqueue(new TextEncoder().encode("file.txt\",\"startLine\":2,\"endLine\":3,\"con"))
      controller.enqueue(new TextEncoder().encode("tent\":\"New Line 2 and 3\"}"))
      controller.close()
    }
  })

  const results = await collectResults(inputStream.pipeThrough(new StreamingToolArgs()))

  const expectedResults: ToolArgChunk[] = [
    { key: "path", value: "test_" },
    { key: "path", value: "file.txt" },
    { key: "startLine", value: 2 },
    { key: "endLine", value: 3 },
    { key: "content", value: "New Line 2 and 3" }
  ]

  expect(results).toEqual(expectedResults)
})