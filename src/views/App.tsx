
import { useInput } from "ink"
import { useClearScreen } from "@/hooks/useClearScreen"
import { GOL } from "./GOL"
import { Chat } from "./Chat"
import { Threads } from "./Threads"
import { AppStateProvider, useAppState } from "./state"
import { RouterProvider, useRouter } from "./router"
import { Settings } from "./Settings"

export const Home = () => {
  const { state: { selectedThread }, update } = useAppState()
  const { page, navigate } = useRouter()
  
  useClearScreen()
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
  return (
    <AppStateProvider>
      <RouterProvider>
        <Home />
      </RouterProvider>
    </AppStateProvider>
  )
}