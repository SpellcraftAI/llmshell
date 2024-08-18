import { expect, test, describe } from "bun:test"
import { MarkdownANSITransform } from "./MarkdownANSI"

describe("MarkdownANSITransform", () => {
  test("converts Markdown to ANSI-styled text", async () => {
    const markdownContent = `
# An Apostraphe's Test 

This is a **bold** statement and *italicized* text.

Here's some \`inline code\`.

1. First item
2. Second item

> This is a blockquote

\`\`\`js
function hello() {
  console.log('Hello, world!');
}
\`\`\`

Text that follows.
`

    const markdownStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(markdownContent))
        controller.close()
      }
    })

    const reader = markdownStream.pipeThrough(new MarkdownANSITransform()).getReader()
    const chunks: string[] = []
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(new TextDecoder().decode(value))
    }
    
    const text = chunks.join("")
    process.stdout.write(text)

    console.log()
    console.log({chunks})

    expect(text).toMatchSnapshot()
  })
})