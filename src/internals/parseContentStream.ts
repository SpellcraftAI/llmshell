import type { ToolArgChunk } from "./JSONPropertyStream"

const ENCODER = new TextEncoder()

export const parseContentStream = async (argChunks: ReadableStream<ToolArgChunk>): Promise<{ [key: string]: any; content: ReadableStream<Uint8Array> }> => {
  const params: { [key: string]: any } = {}
  let paramsComplete = false

  // Create two identical streams
  const [paramsStream, contentStream] = argChunks.tee()

  // Transform stream for parameter extraction
  const paramTransform = new TransformStream<ToolArgChunk, void>({
    transform(chunk) {
      if (paramsComplete) return

      const { key, value } = chunk

      if (key === "content") {
        paramsComplete = true
      } else {
        if (params[key]) {
          params[key] += value
        } else {
          params[key] = value
        }
      }
    }
  })

  // Transform stream for content extraction
  const contentTransform = new TransformStream<ToolArgChunk, Uint8Array>({
    transform(chunk, controller) {
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

  // Start parameter extraction and wait for it to complete
  const paramReader = paramsStream.pipeThrough(paramTransform).getReader()
  while (!paramsComplete) {
    const { done } = await paramReader.read()
    if (done) break
  }

  // Transform content stream
  const content = contentStream.pipeThrough(contentTransform)
  return { ...params, content }
}