if (typeof Bun === "undefined") {
  throw new Error("LLM Shell only works with Bun runtime. Sorry!")
}

import { render } from "ink"
import { clearTerminal, cursorShow } from "ansi-escapes"
import { App } from "./views/App"
import { browser } from "./lib/tools"

process.stdout.write(clearTerminal)

const { waitUntilExit } = render(<App />, { exitOnCtrlC: true })
await waitUntilExit()

try { 
  await browser?.close()
} catch (e) {}

// Padding on exit.
console.log("\n")

// Ensure terminal cursor is visible. Likely disabled by app.
process.stdout.write(cursorShow)