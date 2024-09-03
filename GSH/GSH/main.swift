import Foundation

let bundlePath = Bundle.main.bundlePath
let bunPath = bundlePath + "/bun"

print("Bundle path: \(bundlePath)")
print("Bun path: \(bunPath)")
print("Does bun exist? \(FileManager.default.fileExists(atPath: bunPath))")

let process = Process()
process.executableURL = URL(fileURLWithPath: bunPath)
process.arguments = ["bin.js"]

// Set environment variables
process.environment = ProcessInfo.processInfo.environment
process.environment?["NODE_ENV"] = "production"

// Inherit terminal size
if let columns = ProcessInfo.processInfo.environment["COLUMNS"],
   let lines = ProcessInfo.processInfo.environment["LINES"] {
    process.environment?["COLUMNS"] = columns
    process.environment?["LINES"] = lines
}

// Set standard I/O to use current TTY
process.standardInput = FileHandle.standardInput
process.standardOutput = FileHandle.standardOutput
process.standardError = FileHandle.standardError

do {
    try process.run()
    process.waitUntilExit()
} catch {
    print("Error: \(error)")
    exit(1)
}
