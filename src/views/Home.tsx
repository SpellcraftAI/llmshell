
import { useInput } from "ink"
import { useAppState } from "@/lib/state"
import { useRouter } from "@/lib/router"
import { useSIGINTListener } from "@/hooks/useSIGINTListener"
import { GOL } from "./GOL"
import { Chat } from "./Chat"
import { Threads } from "./Threads"
import { Settings } from "./Settings"
import { Info } from "./Info"
import { Activation } from "./Activation"

export const Home = () => {
  const { state: { selectedThread }, update } = useAppState()
  const { page, navigate } = useRouter()

  // Top-level SIGINTListener is used to ensure that the app never hangs on
  // Ctrl+C, even though Ink's exit() function already bound to it.
  useSIGINTListener()
  
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

  case "info":
    return <Info />

  case "settings":
    return <Settings />

  case "activate":
    return <Activation />
  
  default:
    throw new Error(`Unknown page: ${page}`)
  }
}

