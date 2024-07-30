import { tool } from "ai";
import { z } from "zod";
import type { FileOperationResult } from "./fs";

export const tools = {
  read: tool({
    description: "Read the contents of a file.",
    parameters: z.object({
      path: z.string().describe("The path to the file to read")
    }),
    execute: async ({ path }) => {
      const response = await fetch(`http://localhost:3000/file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, operation: "read" })
      });
      return await response.json() as FileOperationResult;
    }
  }),

  write: tool({
    description: "Write content to a file, overwriting if it exists.",
    parameters: z.object({
      path: z.string().describe("The path to the file to write"),
      content: z.string().describe("The content to write to the file")
    }),
    execute: async ({ path, content }) => {
      const response = await fetch(`http://localhost:3000/file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, operation: "write", content })
      });
      return await response.json() as FileOperationResult;
    }
  }),

  edit: tool({
    description: "Edit specific lines in a file.",
    parameters: z.object({
      path: z.string().describe("The path to the file to edit"),
      content: z.string().describe("The new content to replace the specified lines"),
      startLine: z.number().describe("The starting line number for the edit"),
      endLine: z.number().describe("The ending line number for the edit")
    }),
    execute: async ({ path, content, startLine, endLine }) => {
      const response = await fetch(`http://localhost:3000/file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, operation: "edit", content, startLine, endLine })
      });
      return await response.json() as FileOperationResult;
    }
  }),

  terminal: tool({
    description: "Execute a terminal command using `bash -c ...` and return the output.",
    parameters: z.object({
      command: z.string().describe("The terminal command to execute. Runs through bash -c.")
    }),
    execute: async ({ command }) => {
      const response = await fetch(`http://localhost:3000/terminal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command })
      });

      return response.body;
    }
  })
};