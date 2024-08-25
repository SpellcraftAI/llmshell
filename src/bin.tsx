import { render } from "ink"
import { Chat } from "@/views/Chat"
import { stopServer } from "./hooks/useServer"
import { log } from "./lib/log"

process.on("message", (ipc) => {
  log({ ipc })
  if (ipc === "STOP_CLAUDE_SERVER") {
    stopServer()
  }
})

const { waitUntilExit } = render(<Chat />)
await waitUntilExit()

stopServer()