import chalk from "chalk"
import { common, createEmphasize } from "emphasize"

export const emphasize = createEmphasize(common)

const highlight = (code: string, lang?: string) => {
  let highlighted = 
    lang
      ? emphasize.highlight(lang, code).value
      : emphasize.highlightAuto(code).value

  /**
   * If the highlightAuto output is empty, render as plaintext.
   */
  if (!lang && !highlighted.trim()) {
    highlighted = code
  }

  return highlighted
}

export const parseCodeBlocks = (text: string) => {
  // Multi-line code block regex
  // Captures:
  // 1. Opening fence: ``` with optional language
  // 2. Language identifier (optional)
  // 3. Code block content
  // 4. Closing fence: ``` with surrounding ANSI codes or end of string
  const multiLineCodeBlockRegex = new RegExp(
    "(" +
      "```" +               // Opening code fence
      "(\\w+)?" +           // Optional language identifier
      "\n" +                // Newline after the opening fence
    ")" +
    "([\\s\\S]*?)" +        // Code block content (non-greedy)
    "(" +
      "\n```" +             // Closing code fence
      "|" +                 // OR
      "$" +                 // End of string (for unclosed blocks)
    ")",
    "g"
  )

  // Inline code block regex
  // Captures:
  // 1. Opening backticks: ` or ``
  // 2. Inline code content
  // 3. Closing backticks: ` or ``
  const inlineCodeBlockRegex = new RegExp(
    "(" +
      "``?" +               // One or two backticks
    ")" +
    "([^`\\n]+)" +          // Inline code content (no backticks or newlines)
    "(" +
      "``?" +               // One or two backticks (matching the opening)
    ")",
    "g"
  )

  // First, process multi-line code blocks
  text = text.replace(
    multiLineCodeBlockRegex,
    (match, openingFence, lang, code, closingFence) => {
      // console.table({ openingFence, lang, code: JSON.stringify(code), closingFence })
      const highlighted = highlight(code, lang)
      return `${chalk.dim(openingFence)}${highlighted}${chalk.dim(closingFence)}`
    }
  )

  // Then, process inline code blocks
  text = text.replace(
    inlineCodeBlockRegex,
    (match, openingBackticks, code, closingBackticks) => {
      const highlighted = highlight(code)
      return `${chalk.dim(openingBackticks)}${highlighted}${chalk.dim(closingBackticks)}`
    }
  )

  return text
}