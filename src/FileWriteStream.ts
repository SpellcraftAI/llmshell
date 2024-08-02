import type { BunFile } from "bun"

export class FileWriteStream extends TransformStream<Uint8Array, Uint8Array> {
  constructor(readonly file: BunFile) {
    const writer = file.writer()
    super({
      transform(chunk, controller) {
        controller.enqueue(chunk)
        writer.write(chunk)
      },
      flush() {
        writer.flush()
        writer.end()
      }
    })
  }
}