export const parseJsonl = async (path: string) => {
  try {
    const file = Bun.file(path)
    const contents = await new Response(file.stream()).text()
    const lines = contents.split("\n").filter(Boolean)
    return lines.map((line) => JSON.parse(line))
  } catch (error) {
    return null
  }
}