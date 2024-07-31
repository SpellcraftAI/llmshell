export class StreamingJSON extends TransformStream<string, string> {
  private buffer: string = '';
  private structureStack: string[] = [];
  private inString: boolean = false;
  private escaped: boolean = false;
  private leadingWhitespace: string = '';

  constructor() {
    super({
      transform: (chunk, controller) => this.processChunk(chunk, controller),
      flush: (controller) => this.flushRemaining(controller),
    });
  }

  private processChunk(chunk: string, controller: TransformStreamDefaultController<string>) {
    this.buffer += chunk;
    let validJSON = '';
    let lastValidIndex = -1;

    // Preserve leading whitespace
    const match = this.buffer.match(/^\s+/);
    if (match && this.structureStack.length === 0) {
      this.leadingWhitespace = match[0];
      this.buffer = this.buffer.slice(this.leadingWhitespace.length);
    }

    for (let i = 0; i < this.buffer.length; i++) {
      const char = this.buffer[i];

      if (this.escaped) {
        this.escaped = false;
        validJSON += char;
        continue;
      }

      if (char === '\\') {
        this.escaped = true;
        validJSON += char;
        continue;
      }

      if (char === '"' && !this.inString) {
        this.inString = true;
        validJSON += char;
      } else if (char === '"' && this.inString) {
        this.inString = false;
        validJSON += char;
        lastValidIndex = i;
      } else if (!this.inString) {
        if (char === '{' || char === '[') {
          this.structureStack.push(char);
          validJSON += char;
        } else if (char === '}' || char === ']') {
          if (this.structureStack.length > 0) {
            const lastOpen = this.structureStack[this.structureStack.length - 1];
            if ((char === '}' && lastOpen === '{') || (char === ']' && lastOpen === '[')) {
              this.structureStack.pop();
              validJSON += char;
              if (this.structureStack.length === 0) {
                lastValidIndex = i;
              }
            }
          }
        } else {
          validJSON += char;
        }
      } else {
        validJSON += char;
      }

      if (this.structureStack.length === 0 && !this.inString && lastValidIndex === i) {
        controller.enqueue(this.leadingWhitespace + validJSON);
        validJSON = '';
        this.buffer = this.buffer.slice(i + 1);
        i = -1;  // Reset the loop to start from the beginning of the new buffer
        lastValidIndex = -1;
        this.leadingWhitespace = '';
      }
    }

    this.buffer = validJSON;
  }

  private flushRemaining(controller: TransformStreamDefaultController<string>) {
    if (this.buffer) {
      // Don't emit incomplete JSON at the end
      if (this.isValidJSON(this.buffer)) {
        controller.enqueue(this.leadingWhitespace + this.buffer);
      }
    } else if (this.leadingWhitespace) {
      controller.enqueue(this.leadingWhitespace);
    }
  }

  private isValidJSON(json: string): boolean {
    try {
      JSON.parse(json);
      return true;
    } catch {
      return false;
    }
  }
}