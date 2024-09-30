import { tool } from "ai"
import { z } from "zod"

import type { SearchResponse } from "azure-cognitiveservices-websearch/lib/models"
import { getShellCommand } from "@/internals/getShellCommand"
import { type Browser, type BrowserType }from "playwright"
import { ApiHandler } from "./api"

import { machineId } from "node-machine-id"
import { getConfig } from "./log"

/**
 * Initialize Chromium if available for faster search queries, terminate on
 * exit.
 */
export let browser: Browser | null = null
let chromium: BrowserType | null = null
try { 
  const playwright = await import("playwright")
  chromium = playwright.chromium
  browser = await chromium.launch({ headless: true })
} catch (error) {}

const apiHandler = new ApiHandler()

export const tools = {
  read: tool({
    description: "Read the contents of a file.",
    parameters: z.object({
      path: z.string().describe("The path to the file to read")
    }),
    execute: async ({ path }) => {
      return await apiHandler.read(new Response(JSON.stringify({ path })).body)
      // const response = await fetch("http://localhost:42069/read", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ path })
      // })
      // return response.body
      // return await response.text()
    }
  }),

  write: tool({
    description: "Write content to a file, overwriting if it exists.",
    parameters: z.object({
      path: z.string().describe("The path to the file to write"),
      content: z.string().describe("The content to write to the file")
    }),
    execute: async ({ path, content }) => {
      return await apiHandler.write(new Response(JSON.stringify({ path, content })).body)
      // const response = await fetch("http://localhost:42069/write", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ path, content })
      // })
      // return response.body
      // return await response.text()
    }
  }),

  // edit: tool({
  //   description: "Edit specific lines in a file.",
  //   parameters: z.object({
  //     path: z.string().describe("The path to the file to edit"),
  //     startLine: z.number().describe("The starting line number for the edit"),
  //     endLine: z.number().describe("The ending line number for the edit"),
  //     content: z.string().describe("The new content to replace the specified lines"),
  //   }),
  //   execute: async ({ path, content, startLine, endLine }) => {
  //     const response = await fetch("http://localhost:42069/edit", {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({ path, startLine, endLine, content })
  //     })
  //     return response.body
  //     // return await response.text()
  //   }
  // }),

  terminal: tool({
    description: `
      Type directly into the terminal's stdin. 
      The text you type is parsed as JSON and can contain ANSI escape codes. 
      Only use default libraries, MacOS. For instance, on MacOS, lscpu is NOT installed. 
      Run sequential shell commands as a series of INDIVIDUAL tool calls.
      For \`tree\` etc, or look at the top-level folders (depth: 1) first to see what needs to be excluded so stdout doesn't overflow.
      Prefer checking the git file tree to prevent trying to ls a huge directory. node_modules and Python venv directories will be common offenders. Watch out for these.
      Shell: ${getShellCommand()}`.trim(),
    parameters: z.object({
      command: z.string().describe("The terminal command to execute. Runs through bash -c.")
    }),
    execute: async ({ command }) => {
      return await apiHandler.shell(new Response(JSON.stringify({ command })).body)
      // const response = await fetch("http://localhost:42069/terminal", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ command })
      // })

      // return response.body
      // return await response.text()
    }
  }),

  bing: tool({
    description: "Search Bing for the provided query and return structured results.",
    parameters: z.object({
      query: z.string().describe("The query to search Bing for.")
    }),
    execute: async ({ query }) => {
      const config = getConfig()
      if (!config.licenseKey) {
        throw new Error("Missing License Key.")
      }

      const response = await fetch("https://api.llmshell.com/api/search", {
        method: "POST",
        body: JSON.stringify({ query }),
        headers: {
          "Authorization": config.licenseKey,
          "Machine-Id": await machineId()
        }
      })

      if (!response.ok) {
        console.log(response.statusText, await response.text())
        throw new Error("Failed to search Bing.")
      }
      
      const data = await response.json() as SearchResponse
      return JSON.stringify(data.webPages, null, 2)
    }
  }),

  // google: tool({
  //   description: "Search Google for the provided query and return structured results.",
  //   parameters: z.object({
  //     query: z.string().describe("The query to search Google for.")
  //   }),
  //   execute: async ({ query }) => {
  //     const searchGoogle = async (waitForCaptcha = false) => {
  //       if (!browser) {
  //         throw new Error("Chromium is not available. Run `bunx playwright install`.")
  //       }
      
  //       const context = await browser.newContext()
  //       const page = await context.newPage()
      
  //       await page.goto(`https://www.google.com/search?q=${encodeURIComponent(query)}`)

  //       if (waitForCaptcha) {
  //         await page.waitForTimeout(5000)
  //       }

  //       const results = await page.evaluate(() => {
  //         const searchResults = document.querySelectorAll("#search [data-async-context*=query] > div")
  //         return Array.from(searchResults).map((node) => {
  //           const titleNode = node.querySelector("h3")
  //           const linkNode = node.querySelector("a")
  //           const snippetNode = node.querySelector("div[style*=\"webkit-line-clamp\"]")
  
  //           if (!titleNode || !linkNode) return null
  
  //           const title = titleNode.innerText
  //           const primaryLink = linkNode.href
  //           const snippet = snippetNode ? snippetNode.textContent : ""
  
  //           // Extract all links
  //           const allLinks = Array.from(node.querySelectorAll("a")).map(a => ({
  //             text: a.innerText,
  //             href: a.href
  //           })).filter(link => link.href !== primaryLink)
  
  //           return {
  //             title,
  //             primaryLink,
  //             snippet,
  //             additionalLinks: allLinks
  //           }
  //         }).filter(result => result !== null)
  //       })
  
  //       await context.close()
  //       return JSON.stringify(results, null, 2)
  //     }
      
  //     try {
  //       return await searchGoogle()
  //     } catch (e) {
  //       if (chromium) {
  //         browser?.close()
  //         browser = await chromium.launch({ headless: true })
  //         return await searchGoogle(true)
  //       }
  //     }
  //   }
  // }),

  web: tool({
    description: "Browse to any provided URL and return the page content.",
    parameters: z.object({
      url: z.string().url().describe("The URL to browse to.")
    }),
    execute: async ({ url }) => {
      if (!browser) {
        throw new Error("Chromium is not available. Run `bunx playwright install`.")
      }
  
      const context = await browser.newContext()
      const page = await context.newPage()
      
      await page.goto(url)
      
      const content = await page.evaluate(() => {
        return {
          title: document.title,
          text: document.body.textContent,
          links: Array.from(document.links).map(link => ({
            text: link.innerText,
            href: link.href
          }))
        }
      })
  
      await context.close()
      return JSON.stringify(content, null, 2)
    }
  }),
}