import { tool } from "ai";
import { z } from "zod";
import { server } from "./fs";

export const tools = {
  terminal_command: tool({
    description: "Execute a terminal command and return the output.",
    parameters: z.object({
      command: z.string().describe("The terminal command to execute. Runs through bash -c.")
    }),
    execute: async ({ command }) => {
      const response = await fetch(`http://localhost:${server.port}/terminal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command })
      });

      return await response.text();
    }
  }),

  file_operation: tool({
    description: "Perform file operations such as reading, writing, or editing files.",
    parameters: z.object({
      path: z.string().describe("The path to the file"),
      operation: z.enum(["read", "write", "edit"]).describe("The operation to perform on the file"),
      content: z.string().optional().describe("The content to write or edit (required for write and edit operations)"),
      startLine: z.number().optional().describe("The starting line for edit operation (required for edit operation)"),
      endLine: z.number().optional().describe("The ending line for edit operation (required for edit operation)")
    }),
    execute: async (args) => {
      const response = await fetch(`http://localhost:${server.port}/file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args)
      });
      return await response.json();
    }
  })
};