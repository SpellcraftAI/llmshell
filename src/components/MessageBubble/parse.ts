import chalk from "chalk"
import { common, createEmphasize } from "emphasize"

export const emphasize = createEmphasize(common)

export const parseCodeBlocks = (text: string) => {
  // ANSI escape code pattern
  // Matches any ANSI escape sequence for text formatting
  const ansiPattern = "(?:\\x1b\\[[0-9;]*m)*"

  // Multi-line code block regex
  // Captures:
  // 1. Opening fence: ``` with optional language and surrounding ANSI codes
  // 2. Language identifier (optional)
  // 3. Code block content
  // 4. Closing fence: ``` with surrounding ANSI codes or end of string
  const multiLineCodeBlockRegex = new RegExp(
    "(" +
      ansiPattern +         // Optional ANSI codes before opening ```
      "```" +               // Opening code fence
      ansiPattern +         // Optional ANSI codes after opening ```
      "(\\w+)?" +           // Optional language identifier
      ansiPattern +         // Optional ANSI codes after language
    ")" +
    "\\n" +                 // Newline after the opening fence
    "([\\s\\S]*?)" +        // Code block content (non-greedy)
    "(" +
      ansiPattern +         // Optional ANSI codes before closing ```
      "```" +               // Closing code fence
      ansiPattern +         // Optional ANSI codes after closing ```
      "|" +                 // OR
      "$" +                 // End of string (for unclosed blocks)
    ")",
    "g"
  )

  // Inline code block regex
  // Captures:
  // 1. Opening backticks: ` or `` with surrounding ANSI codes
  // 2. Inline code content
  // 3. Closing backticks: ` or `` with surrounding ANSI codes
  const inlineCodeBlockRegex = new RegExp(
    "(" +
      ansiPattern +         // Optional ANSI codes before opening backticks
      "``?" +               // One or two backticks
      ansiPattern +         // Optional ANSI codes after opening backticks
    ")" +
    "([^`\\n]+)" +          // Inline code content (no backticks or newlines)
    "(" +
      ansiPattern +         // Optional ANSI codes before closing backticks
      "``?" +               // One or two backticks (matching the opening)
      ansiPattern +         // Optional ANSI codes after closing backticks
    ")",
    "g"
  )

  // First, process multi-line code blocks
  text = text.replace(
    multiLineCodeBlockRegex,
    (match, openingFence, lang, code, closingFence) => {
      const highlighted = lang
        ? emphasize.highlight(lang, code).value
        : emphasize.highlightAuto(code).value

      return `${chalk.dim(openingFence)}\n${highlighted}${chalk.dim(closingFence)}`
    }
  )

  // Then, process inline code blocks
  text = text.replace(
    inlineCodeBlockRegex,
    (match, openingBackticks, code, closingBackticks) => {
      return chalk.dim(`${openingBackticks}${code}${closingBackticks}`)
    }
  )

  return text
}