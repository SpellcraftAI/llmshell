import { startServer } from "@/lib/api"
import { debug } from "@/lib/log"
import type { Server } from "bun"
import { useCallback, useEffect, useState } from "react"

export const useServer = () => {
  const [server, setServer] = useState<Server | null>(null)

  const createServer = useCallback(() => {
    return startServer()
  }, [])

  useEffect(() => {
    const newServer = createServer()
    setServer(newServer)

    return () => {
      if (newServer) {
        newServer.stop()
        debug("Server stopped")
      }
    }
  }, [createServer])

  useEffect(() => {
    const handleExit = () => {
      if (server) {
        server.stop()
        debug("Server stopped due to process exit")
      }
    }

    process.on("exit", handleExit)
    process.on("SIGINT", handleExit)
    process.on("SIGTERM", handleExit)

    return () => {
      process.off("exit", handleExit)
      process.off("SIGINT", handleExit)
      process.off("SIGTERM", handleExit)
    }
  }, [server])

  return server
}