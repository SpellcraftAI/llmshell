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

console.log(matches)
for (const match of matches) {
  content = content.replaceAll(new RegExp(`${match}(import.meta.url)`, "g"), "require")
}

await Bun.write("dist/app.js", content)
console.log("Successfully shimmed dist/app.js")