import { render } from "ink"
import { clearTerminal, cursorShow } from "ansi-escapes"
import { App } from "./views/App"

process.stdout.write(clearTerminal)

const { waitUntilExit } = render(<App />, { exitOnCtrlC: true })
await waitUntilExit()

// Padding on exit.
console.log("\n")

// Ensure terminal cursor is visible. Likely disabled by app.
process.stdout.write(cursorShow)