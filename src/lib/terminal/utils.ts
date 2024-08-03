export const clearMessageOnFirstKeystroke = (data: Uint8Array) => {
  // Check if the first byte is within ASCII printable character range
  const isASCII = data[0] >= 32 && data[0] <= 126
  const isPaste = data.length > 3

  const isEnter = data[0] === 13
  if (isEnter) {
    process.stdout.cursorTo(0, 0)
    process.stdout.clearScreenDown()
    return
  }

  if (!isASCII && !isPaste) {
    return
  }

  // Remove the listener after the first keypress.
  process.stdin.removeListener("data", clearMessageOnFirstKeystroke)

  // Move down to the instructions line.
  process.stdout.moveCursor(0, 2)
  // Clear it.
  process.stdout.clearLine(0)
  // Return to the input line.
  process.stdout.moveCursor(0, -2)
  // Add the indent.
  process.stdout.cursorTo(2)

  Bun.write(Bun.stdin, data)
}