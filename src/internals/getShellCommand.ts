export function getShellCommand() {
  switch (process.platform) {
  case "win32":
    return "cmd"
  case "darwin":
    return "zsh"
  default:
    return "bash"
  }
}