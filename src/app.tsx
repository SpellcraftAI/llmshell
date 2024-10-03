

import { Box, render } from "ink"
import { clearTerminal, cursorShow } from "ansi-escapes"
import { AppStateProvider } from "@/lib/state"
import { RouterProvider } from "@/lib/router"
import { browser } from "@/lib/tools"
import { Home } from "./views/Home"

export const App = () => {
  // const [width, height] = useTerminalSize()
  return (
    <AppStateProvider>
      <RouterProvider>
        <Box flexDirection="column" alignSelf="center" width="100%">
          <Home />
        </Box>
      </RouterProvider>
    </AppStateProvider>
  )
}

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