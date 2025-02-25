import { describe, expect, it } from "bun:test"
import path from "path"
import fs from "fs"

describe.skipIf(process.platform === "win32")("llmshell binary", () => {
  const binaryPath = path.resolve(__dirname, "../dist/llmshell")

  it("should exist as a file", () => {
    const stats = fs.statSync(binaryPath)
    expect(stats.isFile()).toBe(true)
  })

  it("should have executable permissions", () => {
    const stats = fs.statSync(binaryPath)
    expect(stats.mode & fs.constants.S_IXUSR).toBeTruthy()
  })
})