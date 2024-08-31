import { useLayoutEffect } from "react"
import type { Server } from "bun"

import { startServer } from "@/lib/api"
import { log } from "@/lib/log"

let server: Server | undefined
let stopped = false

export const stopServer = () => {
  if (stopped) {
    return
  }
  
  if (!server) {
    log("Tried to stop server, but not started")
  }

  server?.stop()
  stopped = true
  log("Server stopped")
}

export const useServer = () => {
  useLayoutEffect(
    () => {
      server = startServer()
      log("Server started")
      return stopServer
    }, 
    []
  )

  useLayoutEffect(
    () => {
      process.on("exit", stopServer)
      process.on("SIGINT", stopServer)
      process.on("SIGTERM", stopServer)

      return () => {
        process.off("exit", stopServer)
        process.off("SIGINT", stopServer)
        process.off("SIGTERM", stopServer)
      }
    }, 
    []
  )

  return server
}