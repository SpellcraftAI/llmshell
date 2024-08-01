import type { BunFile, FileSink } from "bun"

export class FileWriteStream extends TransformStream<Uint8Array, Uint8Array> {
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