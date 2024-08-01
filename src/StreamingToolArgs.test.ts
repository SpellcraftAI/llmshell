import { expect, test, mock } from "bun:test"
import { StreamingToolArgs, type ToolArgChunk } from "./StreamingToolArgs"

test("StreamingToolArgs handles single property JSON", async () => {
  const stream = new StreamingToolArgs()
  const writer = stream.writable.getWriter()
  const reader = stream.readable.getReader()

  const chunks = [
    new TextEncoder().encode("{\"abc\": \"xy"),
    new TextEncoder().encode("zabc\"}"),
  ]

  const results: ToolArgChunk[] = []

  writer.write(chunks[0])
  writer.write(chunks[1])
  writer.close()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    results.push(value)
  }

  expect(results).toEqual([
    { key: "abc", value: "xy" },
    { key: "abc", value: "zabc" },
  ])
})

test("StreamingToolArgs handles multiple property JSON", async () => {
  const stream = new StreamingToolArgs()
  const writer = stream.writable.getWriter()
  const reader = stream.readable.getReader()

  const chunks = [
    new TextEncoder().encode("{\"abc\": \"xy"),
    new TextEncoder().encode("z\", \"def\": \"12"),
    new TextEncoder().encode("3\"}"),
  ]

  const results: ToolArgChunk[] = []

  for (const chunk of chunks) {
    writer.write(chunk)
  }
  writer.close()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    results.push(value)
  }

  expect(results).toEqual([
    { key: "abc", value: "xy" },
    { key: "abc", value: "z" },
    { key: "def", value: "12" },
    { key: "def", value: "3" },
  ])
})

test("StreamingToolArgs handles incomplete JSON", async () => {
  const stream = new StreamingToolArgs()
  const writer = stream.writable.getWriter()
  const reader = stream.readable.getReader()

  const chunks = [
    new TextEncoder().encode("{\"abc\": \"xy"),
    new TextEncoder().encode("z\", \"def\": \"12"),
  ]

  const results: ToolArgChunk[] = []

  for (const chunk of chunks) {
    writer.write(chunk)
  }
  writer.close()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    results.push(value)
  }

  expect(results).toEqual([
    { key: "abc", value: "xy" },
    { key: "abc", value: "z" },
    { key: "def", value: "12" },
  ])
})

test("StreamingToolArgs handles empty object", async () => {
  const stream = new StreamingToolArgs()
  const writer = stream.writable.getWriter()
  const reader = stream.readable.getReader()

  const chunk = new TextEncoder().encode("{}")

  writer.write(chunk)
  writer.close()

  const { done, value } = await reader.read()
  expect(done).toBe(true)
  expect(value).toBeUndefined()
})

test("StreamingToolArgs handles object with empty string values", async () => {
  const stream = new StreamingToolArgs()
  const writer = stream.writable.getWriter()
  const reader = stream.readable.getReader()

  const chunk = new TextEncoder().encode("{\"a\": \"\", \"b\": \"\"}")

  writer.write(chunk)
  writer.close()

  const results: ToolArgChunk[] = []

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    results.push(value)
  }

  expect(results).toEqual([])
})
