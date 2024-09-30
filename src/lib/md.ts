import { parseCodeBlocks } from "@/components/MessageBubble/parse"
import chalk from "chalk"
import { common, createEmphasize, type Sheet } from "emphasize"
import markdown from "highlight.js/lib/languages/markdown"

export const emphasize = createEmphasize(common)
emphasize.register({ markdown })

const defaultStyles: Sheet = {
  // comment: chalk.gray,
  quote: chalk.gray,

  keyword: chalk.green,
  "selector-tag": chalk.green,
  addition: chalk.green,

  number: chalk.cyan,
  string: chalk.cyan,
  "meta meta-string": chalk.cyan,
  literal: chalk.cyan,
  doctag: chalk.cyan,
  regexp: chalk.cyan,

  title: chalk.blue,
  section: chalk.blue,
  name: chalk.blue,
  "selector-id": chalk.blue,
  "selector-class": chalk.blue,

  attribute: chalk.yellow,
  attr: chalk.yellow,
  variable: chalk.yellow,
  "template-variable": chalk.yellow,
  "class title": chalk.yellow,
  type: chalk.yellow,

  symbol: chalk.blue,
  bullet: chalk.blue,
  subst: chalk.blue,
  meta: chalk.blue,
  "meta keyword": chalk.blue,
  "selector-attr": chalk.blue,
  "selector-pseudo": chalk.blue,
  link: chalk.blue,

  /* eslint-disable camelcase */
  built_in: chalk.red,
  /* eslint-enable camelcase */
  deletion: chalk.red,

  emphasis: chalk.italic,
  strong: chalk.bold,
  formula: chalk.inverse
}

const customStyles: Sheet = {
  ...defaultStyles,
  // General purpose
  // keyword: chalk.blue,
  // built_in: chalk.cyan,
  // type: chalk.cyan,
  // literal: chalk.blue,
  // number: chalk.green,
  // operator: chalk.white,
  // punctuation: chalk.white,
  // property: chalk.blueBright,
  // regexp: chalk.yellow,
  // string: chalk.yellow,
  // "char.escape": chalk.yellow,
  // subst: chalk.white,
  // symbol: chalk.blue,
  // variable: chalk.blueBright,
  // "variable.language": chalk.blue,
  // "variable.constant": chalk.blue,

  // Titles and names
  // title: chalk.yellow,
  // "title.class": chalk.cyan,
  // "title.class.inherited": chalk.cyan,
  // "title.function": chalk.yellow,
  // "title.function.invoke": chalk.yellow,
  // params: chalk.blueBright,

  // Comments and documentation
  comment: chalk.green,
  doctag: chalk.green,

  // Meta information
  meta: chalk.green,
  "meta.prompt": chalk.green,
  "meta keyword": chalk.blue,
  "meta string": chalk.yellow,

  // Tags, attributes, configs
  section: chalk.blue,
  tag: chalk.green,
  name: chalk.blue,
  attr: chalk.blueBright,
  attribute: chalk.blueBright,

  // Text markup
  bullet: chalk.blue,
  code: chalk.gray,
  emphasis: chalk.italic,
  strong: chalk.bold,
  formula: chalk.blue,
  link: chalk.blue.underline,
  quote: chalk.dim,

  // CSS

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