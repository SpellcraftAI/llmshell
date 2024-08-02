import { tool } from "ai"
import { z } from "zod"
import type { FileOperationResult } from "./fs"

export const tools = {
  read: tool({
    description: "Read the contents of a file.",
    parameters: z.object({
      path: z.string().describe("The path to the file to read")
    }),
    execute: async ({ path }) => {
      const response = await fetch("http://localhost:3000/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path })
      })
      return response.body
    }
  }),

  write: tool({
    description: "Write content to a file, overwriting if it exists.",
    parameters: z.object({
      path: z.string().describe("The path to the file to write"),
      content: z.string().describe("The content to write to the file")
    }),
    execute: async ({ path, content }) => {
      const response = await fetch("http://localhost:3000/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, content })
      })
      return response.body
    }
  }),

  edit: tool({
    description: "Edit specific lines in a file.",
    parameters: z.object({
      path: z.string().describe("The path to the file to edit"),
      startLine: z.number().describe("The starting line number for the edit"),
      endLine: z.number().describe("The ending line number for the edit"),
      content: z.string().describe("The new content to replace the specified lines"),
    }),
    execute: async ({ path, content, startLine, endLine }) => {
      const response = await fetch("http://localhost:3000/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, startLine, endLine, content })
      })
      return response.body
    }
  }),

  terminal: tool({
    description: "Type directly into the terminal's stdin. The text you type is parsed as JSON and can contain ANSI escape codes.",
    parameters: z.object({
      command: z.string().describe("The terminal command to execute. Runs through bash -c.")
    }),
    execute: async ({ command }) => {
      const response = await fetch("http://localhost:3000/terminal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command })
      })

      return response.body
    }
  })
}