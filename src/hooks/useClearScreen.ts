import { clearTerminal } from "ansi-escapes"
import { useLayoutEffect } from "react"

export const useClearScreen = (active = true, callback?: () => void | Promise<void>) => {
  useLayoutEffect(
    () => {
      if (active) {
        process.stdout.write(clearTerminal)
        callback?.()
      }
    },
    [active, callback]
  )
}