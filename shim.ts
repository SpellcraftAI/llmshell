const appBundle = Bun.file("dist/app.js")
let content = await new Response(appBundle).text()

// Replace createRequire(import.meta.url) with require
content = content.replace(/createRequire\(import\.meta\.url\)/g, "require")

// Replace $(import.meta.url) where $ is "createRequire as something"
const createRequireAsRegex = /(?<=createRequire as )(.+?)(\w*)(?=\})/g
const matches = content.match(createRequireAsRegex)

if (!matches?.length) {
  throw new Error("No matches found")
}

for (const match of matches) {
  const pattern = `${match}(import.meta.url)`
  content = content.replaceAll(pattern, "require")
}

await Bun.write("dist/app.js", content)
console.log("Successfully shimmed dist/app.js")