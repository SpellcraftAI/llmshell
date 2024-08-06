// @ts-check
// import Anthropic from "@anthropic-ai/sdk"

import { Readable } from "stream"

const params = {
  max_tokens: 1024,
  messages: [
    { role: "user", content: "write a long poem using echo" }
  ],
  model: "claude-3-5-sonnet-20240620",
  stream: true,
  tools: [
    {
      name: "terminal",
      description: "Call the terminal",
      input_schema: {
        type: "object",
        properties: {
          command: {
            type: "string",
            description: "The command to run in the terminal"
          }
        }
      }
    }
  ]
}

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error("Please set the ANTHROPIC_API_KEY environment variable")
}

const stream = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  body: JSON.stringify(params),
  headers: {
    "content-type": "application/json",
    "x-api-key": process.env.ANTHROPIC_API_KEY,
    "anthropic-version": "2023-06-01"
  }
})

// @ts-ignore
Readable.fromWeb(stream.body).pipe(process.stdout)