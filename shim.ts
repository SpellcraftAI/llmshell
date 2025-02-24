const path = Bun.argv[2]
if (!path) {
  throw new Error("No path provided")
}
const bin = Bun.file(path)
let content = await new Response(bin).text()
const pattern = "var Yoga = await initYoga(await E2(_(import.meta.url).resolve(\"./yoga.wasm\")));"
const replacement = "import initYogaAsm from 'yoga-wasm-web/asm'; const Yoga = initYogaAsm();"
content = content.replace(pattern, replacement)
await Bun.write(path, content)