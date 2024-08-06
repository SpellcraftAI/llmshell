/// <reference lib="dom" />

globalThis.TextDecoderStream = class {
  #handle: TextDecoder

  #transform = new TransformStream({
    transform: (chunk, controller) => {
      const value = this.#handle.decode(chunk, { stream: true })

      if (value) {
        controller.enqueue(value)
      }
    },
    flush: controller => {
      const value = this.#handle.decode()
      if (value) {
        controller.enqueue(value)
      }

      controller.terminate()
    }
  })

  constructor(encoding = "utf-8", options: TextDecoderOptions = {}) {
    this.#handle = new TextDecoder(encoding, options)
  }

  get encoding() {
    return this.#handle.encoding
  }

  get fatal() {
    return this.#handle.fatal
  }

  get ignoreBOM() {
    return this.#handle.ignoreBOM
  }

  get readable() {
    return this.#transform.readable
  }

  get writable() {
    return this.#transform.writable
  }

  get [Symbol.toStringTag]() {
    return "TextDecoderStream"
  }
}

globalThis.TextEncoderStream = class {
  #handle: TextEncoder
  #transform: TransformStream<string, Uint8Array>

  constructor() {
    this.#handle = new TextEncoder()
    this.#transform = new TransformStream({
      transform: (chunk, controller) => {
        if (typeof chunk !== "string") {
          throw new TypeError("The input must be a string")
        }
        const encoded = this.#handle.encode(chunk)
        controller.enqueue(encoded)
      }
    })
  }

  get encoding() {
    return this.#handle.encoding
  }

  get readable() {
    return this.#transform.readable
  }

  get writable() {
    return this.#transform.writable
  }

  get [Symbol.toStringTag]() {
    return "TextEncoderStream"
  }
}