import { parseCodeBlocks } from "@/components/MessageBubble/parse"
import chalk from "chalk"
import { common, createEmphasize, type Sheet } from "emphasize"
import markdown from "highlight.js/lib/languages/markdown"

export const emphasize = createEmphasize(common)
emphasize.register({ markdown })

const customStyles: Sheet = {
  // General purpose
  keyword: chalk.blue,
  built_in: chalk.cyan,
  type: chalk.cyan,
  literal: chalk.blue,
  number: chalk.green,
  operator: chalk.white,
  punctuation: chalk.white,
  property: chalk.blueBright,
  regexp: chalk.yellow,
  string: chalk.yellow,
  "char.escape": chalk.yellow,
  subst: chalk.white,
  symbol: chalk.blue,
  variable: chalk.blueBright,
  "variable.language": chalk.blue,
  "variable.constant": chalk.blue,

  // Titles and names
  title: chalk.yellow,
  "title.class": chalk.cyan,
  "title.class.inherited": chalk.cyan,
  "title.function": chalk.yellow,
  "title.function.invoke": chalk.yellow,
  params: chalk.blueBright,

  // Comments and documentation
  comment: chalk.green,
  doctag: chalk.green,

  // Meta information
  meta: chalk.gray,
  "meta.prompt": chalk.gray,
  "meta keyword": chalk.blue,
  "meta string": chalk.yellow,

  // Tags, attributes, configs
  section: chalk.blue,
  tag: chalk.gray,
  name: chalk.blue,
  attr: chalk.blueBright,
  attribute: chalk.blueBright,

  // Text markup
  bullet: chalk.white,
  code: chalk.yellow,
  emphasis: chalk.italic,
  strong: chalk.bold,
  formula: chalk.blue,
  link: chalk.blue.underline,
  quote: chalk.yellow.italic,

  // CSS
  "selector-tag": chalk.blue,
  "selector-id": chalk.yellow,
  "selector-class": chalk.yellow,
  "selector-attr": chalk.yellow,
  "selector-pseudo": chalk.yellow,

  // Diff
  addition: chalk.green,
  deletion: chalk.red,

  // Headers
  h1: chalk.blue.bold,
  h2: chalk.blue.bold,
  h3: chalk.blue.bold,
  h4: chalk.blue.bold,
  h5: chalk.blue.bold,
  h6: chalk.blue.bold,
}

export const simpleMarkdown = (text: string) => {
  return emphasize.highlight(
    "markdown", 
    parseCodeBlocks(text), 
    customStyles
  ).value
}