import type { BunFile, FileSink } from "bun"

export class FileSinkWriter<T extends string | Uint8Array> extends WritableStream<T> {
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

export class FileWriterStream<T extends string | Uint8Array> extends FileSinkWriter<T> {
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