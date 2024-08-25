import Pastel from "pastel"

const app = new Pastel({
  name: "custom-cli-name",
  importMeta: import.meta,
})

await app.run()