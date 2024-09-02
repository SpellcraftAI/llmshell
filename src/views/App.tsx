
import { useInput } from "ink"
import { useClearScreen } from "@/hooks/useClearScreen"
import { type Conversation } from "@/lib/log"
import { useMemo, useState } from "react"
import { GOL } from "./GOL"
import { Chat } from "./Chat"
import { Threads } from "./Threads"

export const App = () => {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [page, setPage] = useState<"animation" | "threads" | "chat">("animation")
  
  useClearScreen()
  useInput((input, key) => {
    if (key.escape) {
      setPage("threads")
      setSelectedConversation(null)
    }
  })

  const rendered = useMemo(
    () => {
      switch (page) {
      case "animation":
        return <GOL onComplete={() => setPage("threads")} />
      case "threads":
        return (
          <Threads 
            onSelect={(conversation) => {
              setSelectedConversation(conversation)
              setPage("chat")
            }} 
          />
        )
      case "chat":
        if (!selectedConversation) {
          throw new Error("selectedConversation is null")
        }

        return <Chat conversation={selectedConversation} />
      }
    },
    [page, selectedConversation]
  )

  return rendered
}
