import { expect, test } from "bun:test"
import { parseCodeBlocks } from "./parse"

test("parsing code blocks", async () => {
  const input = 
`This is a code block:

\`\`\`
console.log("Hello, world!")
\`\`\`

\`\`\`javascript
console.log("Hello, world!")
\`\`\`

\`\`\`
something
\`\`\`

Inline code:

\`const xyz = 123\`

This is another code block:

\`\`\`typescript
console.log("Hello, world!")
\`\`\`

This one is incomplete, but should still parse:

\`\`\`
function myTestFunction() {
  const a = 42
  const b = 50
  return a + b
}
`

  const result = parseCodeBlocks(input)
  console.log(result)
  expect(result).toMatchSnapshot()
})