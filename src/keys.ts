import { EventEmitter } from "events";

export type Key = { 
  key: string; 
  ctrl: boolean; 
  alt: boolean; 
  shift: boolean;
}

export interface KeyPressEvent extends Key {
  text: string;
}

export interface KeyHandlerEvents {
  keypress: [KeyPressEvent];
  textUpdate: [string];
}

export class KeyHandler extends EventEmitter<KeyHandlerEvents> {
  private readonly stdin = process.stdin;
  private readonly stdout = process.stdout;
  private text: string = '';
  private enabled: boolean = false;
  private prefix?: string;

  constructor(prefix: string = '') {
    super();

    this.prefix = prefix;
    this.resume();
  }

  resume() {
    this.stdin.setRawMode(true);
    this.stdin.on('data', this.handleKeyPress.bind(this));
  }

  enable() {
    this.enabled = true;
    this.stdin.resume();
    this.updateDisplay();
  }

  disable() {
    this.enabled = false;
    this.stdin.pause();
  }

  clear() {
    this.text = '';
    this.updateDisplay();
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
    if (!this.enabled) return;

    const keyEvent = this.toKey(chunk);

    if (keyEvent.ctrl && (keyEvent.key === 'C' || keyEvent.key === 'D')) {
      this.stdout.write('\n');
      process.exit(2);
    }

    switch (keyEvent.key) {
    case 'backspace':
      if (this.text.length > 0) {
        this.text = this.text.slice(0, -1);
      }
      break;
    case 'enter':
      // Handle enter key press (e.g., submit message)
      break;
    default:
      if (keyEvent.key.length === 1) {
        this.text += keyEvent.key;
      }
      break;
    }

    this.updateDisplay();
    this.emit('keypress', { ...keyEvent, text: this.text });
    this.emit('textUpdate', this.text);
  }

  private updateDisplay() {
    // Move cursor to the end of the current line
    this.stdout.write('\r\x1b[K');
    // Write the prefix and current text
    this.stdout.write(this.prefix + this.text);
  }

  public getText(): string {
    return this.text;
  }

  public setPrefix(prefix: string) {
    this.prefix = prefix;
  }
}


// Helper function to compare arrays
function arrayEqual(arr1: number[], arr2: number[]): boolean {
  return arr1.length === arr2.length && arr1.every((value, index) => value === arr2[index]);
}