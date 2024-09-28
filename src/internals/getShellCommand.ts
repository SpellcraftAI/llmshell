export function getShellCommand() {
  switch (process.platform) {
  case "win32":
    return "cmd"
  case "darwin":
    return "bash"
  default:
    return "bash"
  }
}