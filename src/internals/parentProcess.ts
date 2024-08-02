import { execSync } from "child_process"

export function getParentProcessInfo(): string | null {
  let command: string
  let parser: (output: string) => string

  if (process.platform === "win32") {
    command = `wmic process where processid=${process.ppid} get commandline`
    parser = (output: string): string => output.split("\n")[1].trim()
  } else {
    command = `ps -p ${process.ppid} -o comm=`
    parser = (output: string): string => output.trim()
  }

  const output: string = execSync(command, { encoding: "utf-8" })
  return parser(output)
}
