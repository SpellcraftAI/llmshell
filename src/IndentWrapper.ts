import { Transform } from 'stream';

type TransformCallback = (error?: Error | null, data?: any) => void;

export class IndentWrapTransform extends Transform {
  private indent: string;
  private wrapWidth: number;
  private currentLine: string;
  private currentLineWidth: number;
  private isStartOfLine: boolean;

  constructor(indent: number = 0, wrapWidth: number = 80) {
    super();
    this.indent = ' '.repeat(indent);
    this.wrapWidth = wrapWidth - this.indent.length;
    this.currentLine = '';
    this.currentLineWidth = 0;
    this.isStartOfLine = true;
  }

  private processChar(char: string): string {
    if (this.isStartOfLine) {
      this.currentLine = this.indent;
      this.currentLineWidth = this.indent.length;
      this.isStartOfLine = false;
    }

    if (char === '\n') {
      const output = this.currentLine + char;
      this.currentLine = '';
      this.currentLineWidth = 0;
      this.isStartOfLine = true;
      return output;
    }

    if (this.currentLineWidth + 1 > this.wrapWidth) {
      const lastSpaceIndex = this.currentLine.lastIndexOf(' ');
      if (lastSpaceIndex > this.indent.length) {
        const output = this.currentLine.slice(0, lastSpaceIndex) + '\n';
        this.currentLine = this.indent + this.currentLine.slice(lastSpaceIndex + 1);
        this.currentLineWidth = this.currentLine.length;
        return output + this.processChar(char);
      } else {
        const output = this.currentLine + '-\n';
        this.currentLine = this.indent;
        this.currentLineWidth = this.indent.length;
        return output + this.processChar(char);
      }
    }

    this.currentLine += char;
    this.currentLineWidth++;
    return '';
  }

  _transform(chunk: Buffer, encoding: string, callback: TransformCallback): void {
    let output = '';
    for (const char of chunk.toString()) {
      output += this.processChar(char);
    }
    if (output) {
      this.push(output);
    }
    callback();
  }

  _flush(callback: TransformCallback): void {
    if (this.currentLine) {
      this.push(this.currentLine);
    }
    callback();
  }
}