import { TransformStream } from "stream/web";

export interface JSONPropertyPair {
  key: string;
  value: string;
}

export class JSONPropertyStream extends TransformStream<string, JSONPropertyPair> {
  private buffer: string = '';
  private currentKey: string | null = null;
  private currentValue: string = '';
  private inString: boolean = false;
  private escaped: boolean = false;
  private depth: number = 0;

  constructor() {
    super({
      transform: (chunk, controller) => this.processChunk(chunk, controller),
      flush: (controller) => this.flushRemaining(controller),
    });
  }

  private processChunk(chunk: string, controller: TransformStreamDefaultController<JSONPropertyPair>) {
    this.buffer += chunk;

    for (let i = 0; i < this.buffer.length; i++) {
      const char = this.buffer[i];

      if (this.escaped) {
        this.escaped = false;
        if (this.inString) {
          this.currentValue += char;
        }
        continue;
      }

      if (char === '\\') {
        this.escaped = true;
        if (this.inString) {
          this.currentValue += char;
        }
        continue;
      }

      if (char === '"') {
        if (!this.inString) {
          this.inString = true;
        } else {
          this.inString = false;
          if (this.currentKey === null) {
            this.currentKey = this.currentValue.trim();
            this.currentValue = '';
          } else if (this.depth === 1) {
            this.emitCurrentPair(controller);
          }
        }
      } else if (this.inString) {
        this.currentValue += char;
      } else if (char === '{') {
        this.depth++;
      } else if (char === '}') {
        this.depth--;
        if (this.depth === 0) {
          this.emitCurrentPair(controller);
        }
      } else if (char === ':' && this.currentKey === null) {
        this.currentKey = this.currentValue.trim();
        this.currentValue = '';
      } else if (char === ',' && this.depth === 1) {
        this.emitCurrentPair(controller);
      }
    }

    this.buffer = '';
  }

  private emitCurrentPair(controller: TransformStreamDefaultController<JSONPropertyPair>) {
    if (this.currentKey !== null && this.currentValue.trim() !== '') {
      controller.enqueue({ key: this.currentKey, value: this.currentValue.trim() });
      this.currentValue = '';
    }
  }

  private flushRemaining(controller: TransformStreamDefaultController<JSONPropertyPair>) {
    this.emitCurrentPair(controller);
  }
}