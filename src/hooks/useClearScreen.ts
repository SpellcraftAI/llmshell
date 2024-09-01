import { clearTerminal } from "ansi-escapes"
import { useLayoutEffect } from "react"

export const useClearScreen = () => {
  useLayoutEffect(
    () => {
      process.stdout.write(clearTerminal)
    },
    []
  )
}