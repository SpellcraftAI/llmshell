import { expect, test } from "bun:test"
import { SimpleIndentWrapTransform } from "./IndentWrapper"
import { Readable } from "stream"

async function collectResults(stream: NodeJS.ReadableStream): Promise<string> {
  return new Promise((resolve, reject) => {
    let result = ""
    stream.on("data", (chunk) => (result += chunk.toString()))
    stream.on("end", () => resolve(result))
    stream.on("error", reject)
  })
}

test("SimpleIndentWrapTransform wraps, indents, and hyphenates long lines", async () => {
  const input = "A".repeat(100)
  const readableStream = Readable.from(input)
  const transformer = new SimpleIndentWrapTransform(2, 20)

  const result = await collectResults(readableStream.pipe(transformer))
  const expectedOutput = 
    "  " + "A".repeat(17) + "-\n" +
    "  " + "A".repeat(17) + "-\n" +
    "  " + "A".repeat(17) + "-\n" +
    "  " + "A".repeat(17) + "-\n" +
    "  " + "A".repeat(17) + "-\n" +
    "  " + "A".repeat(15)

  expect(result).toBe(expectedOutput)
})

test("SimpleIndentWrapTransform handles multiple lines with hyphenation", async () => {
  const input = "A".repeat(30) + "\n" + "B".repeat(40)
  const readableStream = Readable.from(input)
  const transformer = new SimpleIndentWrapTransform(4, 20)

  const result = await collectResults(readableStream.pipe(transformer))
  const expectedOutput = 
    "    " + "A".repeat(15) + "-\n" +
    "    " + "A".repeat(15) + "\n" +
    "    " + "B".repeat(15) + "-\n" +
    "    " + "B".repeat(15) + "-\n" +
    "    " + "B".repeat(10)

  expect(result).toBe(expectedOutput)
})

test("SimpleIndentWrapTransform works with short input", async () => {
  const input = "Short input"
  const readableStream = Readable.from(input)
  const transformer = new SimpleIndentWrapTransform(3, 20)

  const result = await collectResults(readableStream.pipe(transformer))
  const expectedOutput = "   Short input"

  expect(result).toBe(expectedOutput)
})

test("SimpleIndentWrapTransform handles empty input", async () => {
  const input = ""
  const readableStream = Readable.from(input)
  const transformer = new SimpleIndentWrapTransform(2, 20)

  const result = await collectResults(readableStream.pipe(transformer))
  const expectedOutput = ""

  expect(result).toBe(expectedOutput)
})

test("SimpleIndentWrapTransform hyphenates words correctly", async () => {
  const input = "This is a very long word: supercalifragilisticexpialidocious"
  const readableStream = Readable.from(input)
  const transformer = new SimpleIndentWrapTransform(2, 24)

  const result = await collectResults(readableStream.pipe(transformer))
  const expectedOutput = 
    "  This is a very long w-\n" +
    "  ord: supercalifragili-\n" +
    "  sticexpialidocious"

  expect(result).toBe(expectedOutput)
})