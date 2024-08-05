import type { BunFile, FileSink } from "bun"

export class FileSinkWriter extends WritableStream<Uint8Array> {
  constructor(protected readonly sink: FileSink) {
    super({
      write(chunk) {
        sink.write(chunk)
      },
      close() {
        sink.end()
      }
    })
  }
}

export class FileWriterStream extends FileSinkWriter {
  constructor(readonly file: BunFile) {
    super(file.writer())
  }
}

export class FileWriterTransform<T extends string | Uint8Array> extends TransformStream<T, T> {
  constructor(readonly file: BunFile) {
    const sink = file.writer()
    super({
      transform: (chunk, controller) => {
        sink.write(chunk)
        controller.enqueue(chunk)
      },
      flush: () => {
        sink.end()
      }
    })
  }
}