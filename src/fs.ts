import { serve } from "bun";
import { spawn } from "child_process";

const ENCODER = new TextEncoder();

// Types
type FileContent = string;

interface FileOperation {
  path: string;
  content?: FileContent;
  startLine?: number;
  endLine?: number;
}

// File System Operations
class FileSystem {
  async readFile(path: string): Promise<FileContent> {
    return await Bun.file(path).text();
  }

  async writeFile(path: string, content: FileContent): Promise<void> {
    await Bun.write(path, content);
  }

  async editFileLines(
    path: string, 
    content: FileContent, 
    startLine: number, 
    endLine: number
  ): Promise<void> {
    const fileContent = await this.readFile(path);
    const lines = fileContent.split('\n');
    const newLines = [
      ...lines.slice(0, startLine - 1),
      content,
      ...lines.slice(endLine)
    ];
    await this.writeFile(path, newLines.join('\n'));
  }
}

export type FileOperationResult = { success: boolean; message: string; data?: string };

// API Handler
class ApiHandler {
  private fileSystem: FileSystem;

  constructor() {
    this.fileSystem = new FileSystem();
  }

  async handleFileOperation(operation: FileOperation): Promise<FileOperationResult> {
    try {
      let message: string;
      let data: string | undefined;

      if (operation.content !== undefined) {
        if (operation.startLine !== undefined && operation.endLine !== undefined) {
          await this.fileSystem.editFileLines(operation.path, operation.content, operation.startLine, operation.endLine);
          message = `Lines ${operation.startLine}-${operation.endLine} in ${operation.path} updated successfully`;
        } else {
          await this.fileSystem.writeFile(operation.path, operation.content);
          message = `File ${operation.path} updated successfully`;
        }
      } else {
        data = await this.fileSystem.readFile(operation.path);
        message = `File ${operation.path} read successfully`;
      }

      return { success: true, message, data };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : String(error) };
    }
  }

  handleTerminalCommand(command: string): ReadableStream<Uint8Array> {
    command = command.trim();
    // console.log(`calling: '${command}'`);

    return new ReadableStream<Uint8Array>({
      start(controller) {
        const process = spawn("bash", ["-c", command], { shell: false });

        process.stdout.on('data', (data) => {
          controller.enqueue(data);
        });

        process.stderr.on('data', (data) => {
          controller.enqueue(data);
        });

        process.on('close', (code) => {
          if (code !== 0) {
            controller.enqueue(ENCODER.encode(`Process exited with code ${code}\n`));
          }
          controller.close();
        });

        process.on('error', (err) => {
          controller.error(err);
        });
      }
    });
  }
}

// Server setup
const apiHandler = new ApiHandler();

export const startServer = () => serve({
  // port: 3000,
  async fetch(req: Request): Promise<Response> {
    if (req.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const url = new URL(req.url);
    const body = await req.json();
    // console.log(url.pathname, body);

    switch (url.pathname) {
    case '/file': {
      const result = await apiHandler.handleFileOperation(body as FileOperation);
      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    case '/terminal': {
      const { command } = body;
      if (!command) {
        return new Response('Bad Request', { status: 400 });
      }

      const stream = apiHandler.handleTerminalCommand(command);
      return new Response(stream, {
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    default:
      return new Response('Not Found', { status: 404 });
    }
  },
});