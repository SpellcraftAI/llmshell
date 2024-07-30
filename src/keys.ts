import { EventEmitter } from "events";

export type Key = { 
  key: string; 
  ctrl: boolean; 
  alt: boolean; 
  shift: boolean 
} 

interface KeyHandlerEvents {
  keypress: [Key];
}

export class KeyHandler extends EventEmitter<KeyHandlerEvents> {
  private stdin: typeof process.stdin;

  constructor() {
    super();
    this.stdin = process.stdin;
    this.stdin.setRawMode(true);
    this.stdin.resume();
    this.stdin.on('data', this.handleKeyPress.bind(this));
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
    this.emit('keypress', keyEvent);
  }
}

// Helper function to compare arrays
function arrayEqual(arr1: number[], arr2: number[]): boolean {
  return arr1.length === arr2.length && arr1.every((value, index) => value === arr2[index]);
}