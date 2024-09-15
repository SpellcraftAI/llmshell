import chalk from "chalk"
import { createANSIRenderer, createParser, finish, parse } from "/Users/lewis/Development/mdstream"
import { common, createEmphasize } from "emphasize"

export const emphasize = createEmphasize(common)

export const parseMarkdown = (text: string) => {
  let parsed = ""

  const ansiRenderer = createANSIRenderer({
    level: 3,
    render: (chunk) => (parsed += chunk),
  })

  const ansiParser = createParser(ansiRenderer)
  parse(ansiParser, text)
  finish(ansiParser)

  return parsed
}

export const parseCodeBlocks = (text: string) => {
  text = parseMarkdown(text)

  // ANSI escape code pattern
  const ansiPattern = "(?:\\x1b\\[[0-9;]*m)*"

  // Updated regular expression to match code fences with optional ANSI codes
  const codeBlockRegex = new RegExp(
    // Capture the opening fence with optional ANSI codes and optional language identifier
    "(" +
      ansiPattern +         // Optional ANSI codes before ```
      "```" +
      ansiPattern +         // Optional ANSI codes after ```
      "(\\w+)?" +           // Optional language identifier
      ansiPattern +         // Optional ANSI codes after language
    ")" +
    "\\n" +                 // Newline after the ANSI codes
    "([\\s\\S]*?)" +        // Code block content (non-greedy)
    // Capture the closing fence with optional ANSI codes
    "(" +
      ansiPattern +         // Optional ANSI codes before ```
      "```" +
      ansiPattern +         // Optional ANSI codes after ```
      "|" +                 // OR
      "$" +                 // End of string
    ")",
    "g"
  )

  return text.replace(
    codeBlockRegex,
    (match, openingFence, lang, code, closingFence) => {
      const highlighted = lang
        ? emphasize.highlight(lang, code).value
        : emphasize.highlightAuto(code).value

      // Preserve the original fences and any ANSI codes
      return `${openingFence}\n${highlighted}${closingFence}`
    }
  )
}