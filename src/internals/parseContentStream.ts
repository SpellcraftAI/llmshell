import type { ToolArgChunk } from "./JSONPropertyStream"

const ENCODER = new TextEncoder()

export const parseContentStream = async (argChunks: ReadableStream<ToolArgChunk>): Promise<{ [key: string]: any; content: ReadableStream<Uint8Array> }> => {
  const params: { [key: string]: any } = {}
  let paramsComplete = false

  const handoffStream = new TransformStream<ToolArgChunk, ToolArgChunk>({
    transform(chunk, controller) {
      if (paramsComplete) return

      const { key, value } = chunk

      if (key === "content") {
        paramsComplete = true
        controller.enqueue(chunk)
      } else {
        if (params[key]) {
          params[key] += value
        } else {
          params[key] = value
        }
      }
    }
  })

  const contentStream = new TransformStream<ToolArgChunk, Uint8Array>({
    transform(chunk, controller) {
      if (!paramsComplete) return

      const { key, value } = chunk
      if (key === "content") {
        if (value instanceof Uint8Array) {
          controller.enqueue(value)
        } else if (typeof value === "string") {
          controller.enqueue(ENCODER.encode(value))
        } else {
          throw new Error("Can only extract string or Uint8Array content from content stream")
        }
      }
    }
  })

  const processedStream = argChunks
    .pipeThrough(handoffStream)
    .pipeThrough(contentStream)

  // Wait for params to be complete before returning
  const reader = processedStream.getReader()
  await reader.read()
  reader.releaseLock()

  return { ...params, content: processedStream }
}