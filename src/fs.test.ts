import { expect, test, describe, afterAll } from "bun:test";
import { startServer } from "./fs";
import type { Server } from "bun";

let server: Server;
try {
  server = startServer();
} catch (error) {}

const BASE_URL = `http://localhost:3000`;

describe("Server API", () => {
  afterAll(() => {
    server?.stop();
  });

  test("POST /terminal - tree command", async () => {
    const response = await fetch(`${BASE_URL}/terminal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command: "tree -L 1" })
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/plain");

    const result = await response.text();
    expect(result).toContain(".");
    expect(result.split("\n").length).toBeGreaterThan(0);
  });

  test("POST /file - write and read file", async () => {
    const testFilePath = "test_file.txt";
    const testContent = "Hello, World!";

    // Write file
    let response = await fetch(`${BASE_URL}/file`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: testFilePath, content: testContent })
    });

    expect(response.status).toBe(200);
    let result = await response.json();
    expect(result.success).toBe(true);
    expect(result.message).toContain("updated successfully");

    // Read file
    response = await fetch(`${BASE_URL}/file`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: testFilePath })
    });

    expect(response.status).toBe(200);
    result = await response.json();
    expect(result.success).toBe(true);
    expect(result.message).toContain("read successfully");
    expect(result.data).toBe(testContent);

    // Clean up
    await Bun.write(testFilePath, ""); // Clear file content
  });

  test("POST /file - edit file lines", async () => {
    const testFilePath = "test_file.txt";
    const initialContent = "Line 1\nLine 2\nLine 3\nLine 4\nLine 5";
    const newContent = "New Line 2 and 3";

    // Setup initial file
    await Bun.write(testFilePath, initialContent);

    // Edit lines
    const response = await fetch(`${BASE_URL}/file`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: testFilePath,
        content: newContent,
        startLine: 2,
        endLine: 3
      })
    });

    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.success).toBe(true);
    expect(result.message).toContain("updated successfully");

    // Verify file content
    const updatedContent = await Bun.file(testFilePath).text();
    expect(updatedContent).toBe("Line 1\nNew Line 2 and 3\nLine 4\nLine 5");

    // Clean up
    await Bun.write(testFilePath, ""); // Clear file content
  });

  test("POST /terminal - invalid command", async () => {
    const response = await fetch(`${BASE_URL}/terminal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command: "invalid_command" })
    });

    expect(response.status).toBe(200); // The stream starts before the command fails

    const result = await response.text();
    expect(result).toContain("command not found");
  });

  test("POST /terminal - command with no output", async () => {
    const response = await fetch(`${BASE_URL}/terminal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command: "echo -n" })
    });

    expect(response.status).toBe(200);

    const result = await response.text();
    expect(result).toEqual("");
  });

  test("POST /terminal - streaming output", async () => {
    const command = "echo 'Start' && sleep 1 && echo 'Middle' && sleep 1 && echo 'End'";
    
    const response = await fetch(`${BASE_URL}/terminal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command })
    });
  
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/plain");
  
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("Response body is not readable");
    }
  
    const decoder = new TextDecoder();
    let receivedParts = [];
    let fullOutput = '';
  
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      console.log({ chunk });
      fullOutput += chunk;
      receivedParts.push(chunk.trim());
  
      // Check if we've received partial output
      if (receivedParts.length === 1) {
        expect(fullOutput).toContain('Start');
        expect(fullOutput).not.toContain('End');
      }
    }
  
    // Check the final output
    expect(fullOutput).toContain('Start');
    expect(fullOutput).toContain('Middle');
    expect(fullOutput).toContain('End');
    expect(receivedParts.length).toBeGreaterThan(1);
  });
});