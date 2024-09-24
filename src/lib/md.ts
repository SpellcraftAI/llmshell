import { parseCodeBlocks } from "@/components/MessageBubble/parse"
import chalk from "chalk"
import { common, createEmphasize, type Sheet } from "emphasize"
import markdown from "highlight.js/lib/languages/markdown"

export const emphasize = createEmphasize(common)
emphasize.register({ markdown })

const customStyles: Sheet = {
  // code: chalk.dim,
}

export const simpleMarkdown = (text: string) => {
  return emphasize.highlight(
    "markdown", 
    parseCodeBlocks(text), 
    // customStyles
  ).value
}