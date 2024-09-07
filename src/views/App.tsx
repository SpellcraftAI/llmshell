
import { Box, useInput } from "ink"
import { GOL } from "./GOL"
import { Chat } from "./Chat"
import { Threads } from "./Threads"
import { AppStateProvider, useAppState } from "./state"
import { RouterProvider, useRouter } from "./router"
import { Settings } from "./Settings"
// import { useClearScreen } from "@/hooks/useClearScreen"
// import { useTerminalSize } from "@/hooks/useTerminalSize"

export const Home = () => {
  const { state: { selectedThread }, update } = useAppState()
  const { page, navigate } = useRouter()
  
  // useClearScreen()
  useInput(
    (input, key) => {
      if (key.escape) {
        navigate("threads")
        update({
          selectedThread: null
        })
      }
    }, 
    { isActive: page !== "threads" }
  )

  switch (page) {
  case "animation":
    return <GOL onComplete={() => navigate("threads")} />
  case "threads":
    return (
      <Threads 
        onSelect={(conversation) => {
          update({
            selectedThread: conversation
          })
          
          navigate("chat")
        }} 
      />
    )
  case "chat":
    if (!selectedThread) {
      throw new Error("selectedThread is null")
    }

    return <Chat conversation={selectedThread} />

  case "settings":
    return <Settings />
  
  default:
    throw new Error(`Unknown page: ${page}`)
  }
}

export const App = () => {
  // const [width, height] = useTerminalSize()
  return (
    <AppStateProvider>
      <RouterProvider>
        <Box flexDirection="column" alignSelf="center" width="100%" minHeight="100%">
          <Home />
        </Box>
      </RouterProvider>
    </AppStateProvider>
  )
}