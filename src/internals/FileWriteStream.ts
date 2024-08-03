import type { BunFile } from "bun"

/**
 * Writes chunks to the given file and passes them through.
 */
export class FileWriteTransform extends TransformStream<Uint8Array, Uint8Array> {
  constructor(readonly file: BunFile) {
    console.log("FILEWRITETRANSFORM")
    const writer = file.writer()
    super({
      transform(chunk, controller) {
        writer.write(chunk)
        console.log({ chunk })
        controller.enqueue(chunk)
      },
      flush() {
        writer.flush()
        writer.end()
      }
    })
  }
}

/**
 * Writes chunks to the given file.
 */
export class FileWriterStream extends WritableStream<Uint8Array> {
  constructor(readonly file: BunFile) {
    const writer = file.writer()
    super({
      write(chunk) {
        writer.write(chunk)
      },
      close() {
        writer.flush()
        writer.end()
      }
    })
  }
}