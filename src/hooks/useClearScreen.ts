import { clearTerminal } from "ansi-escapes"
import { useStdout } from "ink"
import { useLayoutEffect } from "react"

export const useClearScreen = (callback?: () => void | Promise<void>) => {
  const { write } = useStdout()
  useLayoutEffect(
    () => {
      write(clearTerminal)
      callback?.()
    },
    [callback, write]
  )
}