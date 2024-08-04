import { expect, test } from "bun:test"
import { JSONPropertyStream, type JSONPropertyChunk } from "./JSONPropertyStream"

async function collectResults(stream: ReadableStream<JSONPropertyChunk>): Promise<JSONPropertyChunk[]> {
  const results: JSONPropertyChunk[] = []
  const reader = stream.getReader()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    results.push(value)
  }
  return results
}

test("JSONPropertyStream handles single property JSON", async () => {
  const inputStream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode("{\"abc\": \"xy"))
      controller.enqueue(new TextEncoder().encode("zabc\"}"))
      controller.close()
    }
  })

  const results = await collectResults(inputStream.pipeThrough(new JSONPropertyStream()))

  expect(results).toEqual([
    { key: "abc", value: "xy" },
    { key: "abc", value: "zabc" },
  ])
})

test("JSONPropertyStream handles multiple property JSON", async () => {
  const inputStream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode("{\"abc\": \"xy"))
      controller.enqueue(new TextEncoder().encode("z\", \"def\": \"12"))
      controller.enqueue(new TextEncoder().encode("3\"}"))
      controller.close()
    }
  })

  const results = await collectResults(inputStream.pipeThrough(new JSONPropertyStream()))

  expect(results).toEqual([
    { key: "abc", value: "xy" },
    { key: "abc", value: "z" },
    { key: "def", value: "12" },
    { key: "def", value: "3" },
  ])
})

test("JSONPropertyStream handles incomplete JSON", async () => {
  const inputStream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode("{\"abc\": \"xy"))
      controller.enqueue(new TextEncoder().encode("z\", \"def\": \"12"))
      controller.close()
    }
  })

  const results = await collectResults(inputStream.pipeThrough(new JSONPropertyStream()))

  expect(results).toEqual([
    { key: "abc", value: "xy" },
    { key: "abc", value: "z" },
    { key: "def", value: "12" },
  ])
})

test("JSONPropertyStream handles empty object", async () => {
  const inputStream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode("{}"))
      controller.close()
    }
  })

  const results = await collectResults(inputStream.pipeThrough(new JSONPropertyStream()))

  expect(results).toEqual([])
})

test("JSONPropertyStream handles object with empty string values", async () => {
  const inputStream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode("{\"a\": \"\", "))
      controller.enqueue(new TextEncoder().encode("\"b\": \"\"}"))
      controller.close()
    }
  })

  const results = await collectResults(inputStream.pipeThrough(new JSONPropertyStream()))
  const expectedResults: JSONPropertyChunk[] = [
    { key: "a", value: "" },
    { key: "b", value: "" }
  ]

  expect(results).toEqual(expectedResults)
})

test("JSONPropertyStream handles chunked serialized object", async () => {
  const inputStream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode("{\"path\":\"test_"))
      controller.enqueue(new TextEncoder().encode("file.txt\",\"startLine\":2,\"endLine\":3,\"con"))
      controller.enqueue(new TextEncoder().encode("tent\":\"New Line 2 and 3\"}"))
      controller.close()
    }
  })

  const results = await collectResults(inputStream.pipeThrough(new JSONPropertyStream()))

  const expectedResults: JSONPropertyChunk[] = [
    { key: "path", value: "test_" },
    { key: "path", value: "file.txt" },
    { key: "startLine", value: 2 },
    { key: "endLine", value: 3 },
    { key: "content", value: "New Line 2 and 3" }
  ]

  expect(results).toEqual(expectedResults)
})

test("JSONPropertyStream should handle single chunk", async () => {
  const testFilePath = "test_file.txt"
  const testContent = "Hello, World!"

  const json = JSON.stringify({
    path: testFilePath, 
    content: testContent 
  })

  const inputStream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(json))
      controller.close()
    }
  })

  const results = await collectResults(inputStream.pipeThrough(new JSONPropertyStream()))
  const expectedResults: JSONPropertyChunk[] = [
    { key: "path", value: testFilePath },
    { key: "content", value: testContent }
  ]

  expect(results).toEqual(expectedResults)
})