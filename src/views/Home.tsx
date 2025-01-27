
import { useInput } from "ink"
import { useAppState } from "@/lib/state"
import { useRouter } from "@/lib/router"
import { GOL } from "./GOL"
import { Chat } from "./Chat"
import { Threads } from "./Threads"
import { Settings } from "./Settings"
import { Info } from "./Info"
import { Activation } from "./Activation"

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

