import "./src/internals/shim"
import { FileWriterStream } from "@/internals/FileWriteStream"
import { MarkdownANSIStream } from "mdstream"

const markdown = new MarkdownANSIStream(1)

await new ReadableStream({
  start(controller) {
    controller.enqueue("# Hello, World!\n")
    controller.enqueue("This is a **test**.\n\n")
    controller.enqueue("```typescript\n")
    controller.enqueue("console.log('Hello, World!')\n")
    controller.enqueue("```\n")
    controller.close()
  },
}).pipeThrough(new TextEncoderStream()).pipeThrough(markdown).pipeTo(new FileWriterStream(Bun.stdout))

await Bun.write(Bun.stdout, "\n\n")