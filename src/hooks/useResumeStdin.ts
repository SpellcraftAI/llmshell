import { useLayoutEffect } from "react"

/**
 * Resumes stdin on mount and pauses it on unmount. Needed in Bun for using Ink
 * useInput() and @ink/ui components like <TextInput>.
 */
export const useResumeStdin = () => {
  useLayoutEffect(() => {
    process.stdin.resume()
    return () => {
      process.stdin.pause()
    }
  }, [])
}