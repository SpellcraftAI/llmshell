import { expect, test } from "bun:test"
import { IndentTransform } from "./Indent"

async function testChunkByChunk(input: string, indent: number, wrapWidth: number, chunkSize: number) {
  const encoder = new TextEncoder()
  const chunks: Uint8Array[] = []
  
  for (let i = 0; i < input.length; i += chunkSize) {
    chunks.push(encoder.encode(input.slice(i, i + chunkSize)))
  }

  const readableStream = new ReadableStream({
    async start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(chunk)
      }
      controller.close()
    }
  })

  const transformer = new IndentTransform(indent, wrapWidth)
  const transformedStream = readableStream.pipeThrough(transformer)
  
  const response = new Response(transformedStream)
  const result = await response.text()
  
  expect(result).toMatchSnapshot()
}

test("IndentTransform wraps long lines without hyphenation", async () => {
  const input = "A".repeat(100)
  await testChunkByChunk(input, 2, 20, 10)
})

test("IndentTransform handles multiple lines with word wrapping", async () => {
  const input = "This is a long line that should wrap. And here's another line that should also wrap."
  await testChunkByChunk(input, 2, 20, 15)
})

test("IndentTransform preserves intentional line breaks", async () => {
  const input = "Short line\nAnother short line\nYet another"
  await testChunkByChunk(input, 2, 20, 10)
})

test("IndentTransform handles very long words", async () => {
  const input = "This supercalifragilisticexpialidocious word is very long."
  await testChunkByChunk(input, 2, 20, 12)
})

test("IndentTransform works with short input", async () => {
  const input = "Short input"
  await testChunkByChunk(input, 3, 20, 5)
})

test("IndentTransform handles empty input", async () => {
  const input = ""
  await testChunkByChunk(input, 2, 20, 10)
})

test("IndentTransform preserves multiple spaces between words", async () => {
  const input = "Word1    Word2     Word3"
  await testChunkByChunk(input, 2, 20, 8)
})

test("IndentTransform handles mixed content with varying line lengths", async () => {
  const input = "Short\nMedium length line\nVery long line that should definitely wrap to the next line\nShort again"
  await testChunkByChunk(input, 2, 20, 10)
})