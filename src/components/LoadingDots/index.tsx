import { useEffect, useState } from "react"
import { Text } from "ink"

export const LoadingDots = () => {
  const [dots, setDots] = useState(" ")

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prevDots) => {
        if (prevDots.length >= 3) {
          return " "
        } else {
          return prevDots + "."
        }
      })
    }, 300)

    return () => {
      clearInterval(interval)
    }
  }, [])

  return <Text dimColor>{dots}</Text>
}