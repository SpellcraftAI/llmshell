export type CursorPosition = { x: number; y: number };

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max))
const getLines = (text: string) => text.split("\n")

export const normalizeCursorPosition = (text: string, position: CursorPosition): CursorPosition => {
  const lines = getLines(text)
  const y = clamp(position.y, 0, lines.length - 1)
  const x = clamp(position.x, 0, lines[y].length)
  return { x, y }
}

export const getTextSegments = (text: string, position: CursorPosition) => {
  const lines = getLines(text)
  const { x, y } = normalizeCursorPosition(text, position)
  
  const before = lines.slice(0, y).join("\n") + (y > 0 ? "\n" : "") + lines[y].slice(0, x)
  const at = x < lines[y].length ? lines[y][x] : ""
  const after = lines[y].slice(x + 1) + (y < lines.length - 1 ? "\n" : "") + lines.slice(y + 1).join("\n")
  
  return { before, at, after }
}

export const insertText = (text: string, position: CursorPosition, newText: string): string => {
  const lines = getLines(text)
  const { x, y } = normalizeCursorPosition(text, position)
  
  lines[y] = lines[y].slice(0, x) + newText + lines[y].slice(x)
  return lines.join("\n")
}

export const removeTextBefore = (text: string, position: CursorPosition): { newText: string; newPosition: CursorPosition } => {
  const lines = getLines(text)
  const { x, y } = normalizeCursorPosition(text, position)
  
  if (x > 0) {
    lines[y] = lines[y].slice(0, x - 1) + lines[y].slice(x)
    return { newText: lines.join("\n"), newPosition: { x: x - 1, y } }
  } else if (y > 0) {
    const prevLineLength = lines[y - 1].length
    lines[y - 1] += lines[y]
    lines.splice(y, 1)
    return { newText: lines.join("\n"), newPosition: { x: prevLineLength, y: y - 1 } }
  }
  
  return { newText: text, newPosition: position }
}

export const moveCursor = (direction: "left" | "right" | "up" | "down", text: string, position: CursorPosition): CursorPosition => {
  const lines = text.split("\n")
  const { x, y } = position

  switch (direction) {
  case "left":
    if (x > 0) return { x: x - 1, y }
    if (y > 0) return { x: lines[y - 1].length, y: y - 1 }
    return position

  case "right":
    if (x < lines[y].length) return { x: x + 1, y }
    if (y < lines.length - 1) return { x: 0, y: y + 1 }
    return position

  case "up":
    if (y > 0) return { x: Math.min(x, lines[y - 1].length), y: y - 1 }
    return position

  case "down":
    if (y < lines.length - 1) return { x: Math.min(x, lines[y + 1].length), y: y + 1 }
    return position
  }
}


// const useBlinkingCursor = () => {
//   const [showCursor, setShowCursor] = useState(true)

//   useEffect(
//     () => {
//       const interval = setInterval(
//         () => setShowCursor(prev => !prev), 
//         500
//       )

//       return () => clearInterval(interval)
//     },
//     []
//   )

//   return showCursor
// }