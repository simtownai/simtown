import { isDevelopment } from "./config"
import * as path from "path"
import * as stackTrace from "stack-trace"
import { config, createLogger, format, transports } from "winston"

const logLevels = ["ERROR", "WARN", "INFO", "HTTP", "DEBUG", "SILLY"]
const maxLevelLength = Math.max(...logLevels.map((level) => level.length))

let customFormat

if (isDevelopment) {
  // Include caller info in development
  function getCallerInfo() {
    const stack = stackTrace.get()
    // Find the first stack frame outside of this module
    let callerFrame
    for (const frame of stack) {
      const fileName = frame.getFileName()
      if (fileName && !fileName.includes("node_modules") && !fileName.includes("logger.ts")) {
        callerFrame = frame
        break
      }
    }

    if (callerFrame) {
      const fileName = path.basename(callerFrame.getFileName() || "")
      const lineNumber = callerFrame.getLineNumber()
      return `${fileName}:${lineNumber}`
    } else {
      return ""
    }
  }

  const colorizer = format.colorize()

  customFormat = format.combine(
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    format.printf((info) => {
      const callerInfo = getCallerInfo()
      // Pad the log level to the maximum length
      const level = info.level.toUpperCase()
      const paddedLevel = level.padEnd(maxLevelLength, " ")
      // Apply colorization to the padded level
      const coloredLevel = colorizer.colorize(info.level, paddedLevel)
      return `[${info.timestamp}] ${coloredLevel} [${callerInfo}]: ${info.message}`
    }),
  )
} else {
  // Exclude caller info in production
  customFormat = format.combine(
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    format.printf((info) => {
      const level = info.level.toUpperCase().padEnd(maxLevelLength, " ")
      return `${info.timestamp} [${level}] ${info.message}`
    }),
  )
}

const logger = createLogger({
  level: isDevelopment ? "debug" : "info",
  levels: config.npm.levels,
  format: customFormat,
  transports: [new transports.Console()],
})

export default logger
