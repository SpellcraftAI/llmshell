#!/usr/bin/env bun

import { Box, render } from "ink"
import { clearTerminal, cursorShow } from "ansi-escapes"
import { AppStateProvider } from "@/lib/state"
import { RouterProvider } from "@/lib/router"
import { browser } from "@/lib/tools"
import { Home } from "./views/Home"
import { useSIGINTListener } from "./hooks/useSIGINTListener"

export const App = () => {
  // const [width, height] = useTerminalSize()
  // Top-level SIGINTListener is used to ensure that the app never hangs on
  // Ctrl+C, even though Ink's exit() function already bound to it.
  useSIGINTListener()

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