import type { BunFile } from "bun"

/**
 * Writes chunks to the given file and passes them through.
 */
export class FileWriteTransform<T extends string | Uint8Array> extends TransformStream<T, T> {
  constructor(readonly file: BunFile) {
    const writer = file.writer()
    super({
      transform(chunk, controller) {
        writer.write(chunk)
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
export class FileWriterStream<T extends string | Uint8Array> extends WritableStream<T> {
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