import { render } from "ink"
import { Chat } from "@/views/Chat"
import { stopServer } from "./hooks/useServer"
import { log } from "./lib/log"
import { Home } from "./views/Home"

const { waitUntilExit } = render(<Home />, { stdin: process.stdin })
await waitUntilExit()

stopServer()