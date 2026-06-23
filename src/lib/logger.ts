type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG";

class Logger {
  private formatMessage(level: LogLevel, message: string, context?: any) {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` | Context: ${JSON.stringify(context)}` : "";
    return `[${timestamp}] [${level}] ${message}${contextStr}`;
  }

  info(message: string, context?: any) {
    console.log(this.formatMessage("INFO", message, context));
  }

  warn(message: string, context?: any) {
    console.warn(this.formatMessage("WARN", message, context));
  }

  error(message: string, context?: any, error?: Error) {
    const errStack = error ? `\nStack: ${error.stack}` : "";
    console.error(this.formatMessage("ERROR", message, context) + errStack);
  }

  debug(message: string, context?: any) {
    if (process.env.NODE_ENV !== "production") {
      console.log(this.formatMessage("DEBUG", message, context));
    }
  }
}

export const logger = new Logger();
