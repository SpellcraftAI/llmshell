import screenshot from "screenshot-desktop";
import terminalImage from "terminal-image";

export async function takeScreenshot(): Promise<Uint8Array> {
  const img = await screenshot({
    format: "png",
    screen: 0
  });

  return Uint8Array.from(img);
}

export async function toANSI(img: Uint8Array) {
  return terminalImage.buffer(img);
}