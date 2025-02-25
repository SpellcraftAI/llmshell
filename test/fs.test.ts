import { expect, test, describe, afterAll } from "bun:test"
import type { Server } from "bun"
import { startServer } from "@/lib/api"

let server: Server
try {
  server = startServer()
} catch (error) {}

const BASE_URL = "http://localhost:42069"

describe("Server API", () => {
  afterAll(() => {
    server?.stop()
  })

  test("POST /edit - edit file lines", async () => {
    const testFilePath = "test_file.txt"
    const initialContent = "Line 1\nLine 2\nLine 3\nLine 4\nLine 5"
    const newContent = "New Line 2 and 3"

    // Setup initial file
    await Bun.write(testFilePath, initialContent)

    // Edit lines
    const multiLineEdit = await fetch(`${BASE_URL}/edit`, {
      method: "POST",
      body: JSON.stringify({
        "path": testFilePath,
        "startLine": 2,
        "endLine": 4,
        content: newContent,
      })
    })

    expect(multiLineEdit.status).toBe(200)
    const result = await multiLineEdit.text()
    expect(result).toBe(newContent)

    // Verify file content
    expect(await Bun.file(testFilePath).text()).toBe("Line 1\nNew Line 2 and 3\nLine 5")


    const singleLineEdit = await fetch(`${BASE_URL}/edit`, {
      method: "POST",
      body: JSON.stringify({
        "path": testFilePath,
        "startLine": 2,
        "endLine": 2,
        content: "Single Line Edit"
      })
    })

    expect(singleLineEdit.status).toBe(200)
    const singleEditResult = await singleLineEdit.text()
    expect(singleEditResult).toBe("Single Line Edit")

    expect(await Bun.file(testFilePath).text(), "Single line edit").toBe("Line 1\nSingle Line Edit\nLine 5")

    // Clean up
    await Bun.write(testFilePath, "") // Clear file content
  })

  test("POST /read /write - write and read file", async () => {
    const testFilePath = "test_file.txt"
    const testContent = "Hello, World!"

    // Write file
    // console.log("Writing file")
    let response = await fetch(`${BASE_URL}/write`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: testFilePath, 
        content: testContent 
      })
    })

    expect(response.status).toBe(200)
    let result = await response.text()
    expect(result).toEqual("")

    const json = JSON.stringify({
      path: testFilePath 
    })

    // Read file
    response = await fetch(`${BASE_URL}/read`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: json
    })

    expect(response.statusText).toBe("OK")
    expect(response.status).toBe(200)
    result = await response.text()
    expect(result).toEqual(`1 | ${testContent}`)

    // Clean up
    await Bun.write(testFilePath, "") // Clear file content
  })

  test.skipIf(process.platform === "win32")("POST /terminal - tree command", async () => {
    const response = await fetch(`${BASE_URL}/terminal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command: "tree -L 1" })
    })

    expect(response.status).toBe(200)
    // expect(response.headers.get("Content-Type")).toBe("text/plain")

    const result = await response.text()
    expect(result).toContain(".")
    expect(result.split("\n").length).toBeGreaterThan(0)
  })

  test("POST /terminal - invalid command", async () => {
    const response = await fetch(`${BASE_URL}/terminal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command: "invalid_command" })
    })

    expect(response.status).toBe(200) // The stream starts before the command fails

    const result = await response.text()
    expect(result).toContain("command not found")
  })

  test("POST /terminal - command with no output", async () => {
    const response = await fetch(`${BASE_URL}/terminal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command: "echo -n" })
    })

    expect(response.status).toBe(200)

    const result = await response.text()
    expect(result).toEqual("")
  })

  test("POST /terminal - streaming output", async () => {
    const command = "echo 'Start' && sleep 1 && echo 'Middle' && sleep 1 && echo 'End'"
    
    const response = await fetch(`${BASE_URL}/terminal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command })
    })
  
    expect(response.status).toBe(200)
    // expect(response.headers.get("Content-Type")).toBe("text/plain")
  
    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error("Response body is not readable")
    }
  
    const decoder = new TextDecoder()
    const receivedParts = []
    let fullOutput = ""
  
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      
      const chunk = decoder.decode(value, { stream: true })
      console.log({ chunk })
      fullOutput += chunk
      receivedParts.push(chunk.trim())
  
      // Check if we've received partial output
      if (receivedParts.length === 1) {
        expect(fullOutput).toContain("Start")
        expect(fullOutput).not.toContain("End")
      }
    }
  
    // Check the final output
    expect(fullOutput).toContain("Start")
    expect(fullOutput).toContain("Middle")
    expect(fullOutput).toContain("End")
    expect(receivedParts.length).toBeGreaterThan(1)
  })
})