import { clearTerminal } from "ansi-escapes"
import { useLayoutEffect } from "react"

export const useClearScreen = (callback?: () => void | Promise<void>) => {
  useLayoutEffect(
    () => {
      process.stdout.write(clearTerminal)
      callback?.()
    },
    [callback]
  )
}