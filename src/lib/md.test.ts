import { expect, test } from "bun:test"
import { simpleMarkdown } from "./md"

test("Markdown rendering", async () => {
  
  const text = `
# This should be markdown

This *is italic* and **this is bold**.

1. This is a list
2. With two items
3. And a third
4. With a sub-item

- This is a bullet list
- With two items
- And a third
  - With a sub-item
  - And another
  
    \`\`\`
    code
    \`\`\`

    - And another


\`\`\`javascript
console.log("Hello, world!")
\`\`\`
`.trim()


  const highlighted = simpleMarkdown(text)
  console.log(highlighted)

  expect(highlighted).toMatchSnapshot()
})