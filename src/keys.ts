import readline from 'readline';
import { EventEmitter } from "events";

Object.assign(globalThis, { readline });

export type CursorPosition = { x: number; y: number };

export type Key = { 
  key: string; 
  ctrl: boolean; 
  alt: boolean; 
  shift: boolean
}

export interface KeyPressEvent extends Key {
  cursor: CursorPosition;
  text: string;
}

export interface KeyHandlerEvents {
  keypress: [KeyPressEvent];
  textUpdate: [string];
}

export class KeyHandler extends EventEmitter<KeyHandlerEvents> {
  private readonly stdin: typeof process.stdin;
  private readonly stdout: typeof process.stdout;
  private cursorPosition: CursorPosition = { x: 0, y: 0 };
  private text: string = '';
  private lines: string[] = [''];

  constructor() {
    super();
    this.stdin = process.stdin;
    this.stdout = process.stdout;

    this.stdin.setRawMode(true);
    this.stdin.resume();
    this.stdin.on('data', this.handleKeyPress.bind(this));
  }

  clear() {
    this.text = '';
    this.lines = [''];
    this.cursorPosition = { x: 0, y: 0 };
  }

  private toKey(chunk: Buffer): Key {
    const charCodes = Array.from(chunk);

    let key = '';
    let ctrl = false;
    let alt = false;
    let shift = false;

    switch (true) {
    case arrayEqual(charCodes, [9]):
      key = 'tab';
      break;

    case arrayEqual(charCodes, [13]):
      key = 'enter';
      break;

    case arrayEqual(charCodes, [27]):
      key = 'esc';
      break;

    case arrayEqual(charCodes, [127]):
      key = 'backspace';
      break;

      // Arrow keys
    case arrayEqual(charCodes, [27, 91, 65]):
      key = 'up';
      break;
    case arrayEqual(charCodes, [27, 91, 66]):
      key = 'down';
      break;
    case arrayEqual(charCodes, [27, 91, 67]):
      key = 'right';
      break;
    case arrayEqual(charCodes, [27, 91, 68]):
      key = 'left';
      break;

      // Alt + key
    case charCodes[0] === 27 && charCodes.length === 2:
      alt = true;

      const keyEvent = this.toKey(Buffer.from([charCodes[1]]));
      key = keyEvent.key;
      break;

      // Ctrl + key
    case charCodes.length === 1 && charCodes[0] < 32:
      ctrl = true;
      key = String.fromCharCode(charCodes[0] + 64);
      break;

    default:
      key = chunk.toString();
      break;
    }

    return { key, ctrl, alt, shift };
  }

  private handleKeyPress(chunk: Buffer) {
    const keyEvent = this.toKey(chunk);
    let textUpdated = false;

    if (keyEvent.ctrl && (keyEvent.key === 'C' || keyEvent.key === 'D')) {
      Bun.write(Bun.stdout, '\n');
      process.exit(2);
    }

    switch (keyEvent.key) {
    case 'backspace':
      if (this.cursorPosition.x > 0) {
        const currentLine = this.lines[this.cursorPosition.y];
        this.lines[this.cursorPosition.y] = currentLine.slice(0, this.cursorPosition.x - 1) + currentLine.slice(this.cursorPosition.x);
        this.cursorPosition.x--;
        textUpdated = true;
      } else if (this.cursorPosition.y > 0) {
        const previousLine = this.lines[this.cursorPosition.y - 1];
        const currentLine = this.lines[this.cursorPosition.y];
        this.lines[this.cursorPosition.y - 1] = previousLine + currentLine;
        this.lines.splice(this.cursorPosition.y, 1);
        this.cursorPosition.y--;
        this.cursorPosition.x = previousLine.length;
        textUpdated = true;
      }
      break;
    case 'enter':
      const currentLine = this.lines[this.cursorPosition.y];
      const newLine = currentLine.slice(this.cursorPosition.x);
      this.lines[this.cursorPosition.y] = currentLine.slice(0, this.cursorPosition.x);
      this.lines.splice(this.cursorPosition.y + 1, 0, newLine);
      this.cursorPosition.y++;
      this.cursorPosition.x = 0;
      textUpdated = true;
      break;
    case 'up':
      if (this.cursorPosition.y > 0) {
        this.cursorPosition.y--;
        this.cursorPosition.x = Math.min(this.cursorPosition.x, this.lines[this.cursorPosition.y].length);
      }
      break;
    case 'down':
      if (this.cursorPosition.y < this.lines.length - 1) {
        this.cursorPosition.y++;
        this.cursorPosition.x = Math.min(this.cursorPosition.x, this.lines[this.cursorPosition.y].length);
      }
      break;
    case 'right':
      if (this.cursorPosition.x < this.lines[this.cursorPosition.y].length) {
        this.cursorPosition.x++;
      } else if (this.cursorPosition.y < this.lines.length - 1) {
        this.cursorPosition.y++;
        this.cursorPosition.x = 0;
      }
      break;
    case 'left':
      if (this.cursorPosition.x > 0) {
        this.cursorPosition.x--;
      } else if (this.cursorPosition.y > 0) {
        this.cursorPosition.y--;
        this.cursorPosition.x = this.lines[this.cursorPosition.y].length;
      }
      break;
    default:
      if (keyEvent.key.length === 1) {
        const currentLine = this.lines[this.cursorPosition.y];
        this.lines[this.cursorPosition.y] = currentLine.slice(0, this.cursorPosition.x) + keyEvent.key + currentLine.slice(this.cursorPosition.x);
        this.cursorPosition.x++;
        textUpdated = true;
      }
      break;
    }

    if (textUpdated) {
      this.text = this.lines.join('\n');
      this.emit('textUpdate', this.text);
    }

    this.updateDisplay();
    this.emit('keypress', { ...keyEvent, cursor: this.cursorPosition, text: this.text });
  }

  private updateDisplay() {
    // Clear the screen
    this.stdout.write('\x1b[2J');
    this.stdout.write('\x1b[0f');

    // Redraw the entire text content
    this.stdout.write(this.text);

    // Move the cursor to the correct position
    const absoluteX = this.cursorPosition.x;
    const absoluteY = this.cursorPosition.y;
    this.stdout.cursorTo(absoluteX, absoluteY);
  }

  public getText(): string {
    return this.text;
  }

  public getCursorPosition(): CursorPosition {
    return { ...this.cursorPosition };
  }
}

// Helper function to compare arrays
function arrayEqual(arr1: number[], arr2: number[]): boolean {
  return arr1.length === arr2.length && arr1.every((value, index) => value === arr2[index]);
}