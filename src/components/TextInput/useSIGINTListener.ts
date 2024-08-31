import { useApp, useStdin } from "ink"
import { useCallback, useLayoutEffect } from "react"

export const useSIGINTListener = () => {
  const { exit } = useApp()
  const { stdin } = useStdin()

  const close = useCallback(
    (data: Buffer) => {
      const key = data.toString()
  
      // Ctrl+C, Ctrl+D
      if (key === "\x03" || key === "\x04") {
        exit()
      }
    },
    [exit]
  )

  useLayoutEffect(
    () => {
      process.stdin.resume()
      stdin.on("data", close)
      return () => {
        process.stdin.pause()
        stdin.removeListener("data", close)
      }
    },
    [close, exit, stdin]
  )
}