import winston from "winston";
import path from "path";

const logDir = path.join(process.cwd(), "logs");

const { combine, timestamp, printf, colorize, errors } = winston.format;

const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level}]: ${stack || message}`;
});

const logger = winston.createLogger({
  format: combine(
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    errors({ stack: true }),
    logFormat,
  ),
  transports: [
    new winston.transports.Console({
      level: process.env.NODE_ENV === "production" ? "info" : "debug",
      format: combine(colorize(), logFormat),
    }),
    new winston.transports.File({
      filename: path.join(logDir, "error.log"),
      level: "error",
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(logDir, "combined.log"),
      level: "info",
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
  exitOnError: false,
});

export default logger;
