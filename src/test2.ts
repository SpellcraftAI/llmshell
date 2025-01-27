import React from "react"
import { render, Text, useApp, useInput } from "ink"

//you need this
process.stdin.resume()

function Minimal() {
  const { exit } = useApp()
  useInput((input) => {
    if (input === "q") {
      exit()
    }
  })
  return React.createElement(Text, { color: "dim" }, ["This is a test; ctrl+c or q to exit"])
}

render(React.createElement(Minimal))

process.on("exit", () => {
  const terminal = process.stderr.isTTY
    ? process.stderr
    : process.stdout.isTTY
      ? process.stdout
      : undefined
  terminal?.write("\u001B[?25h")
})