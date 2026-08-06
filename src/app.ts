import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Request, Response } from "express";
import helmet from "helmet";
import morgan from "morgan";
import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import path from "path";
import { configs } from "./app/configs";
import globalErrorHandler from "./app/middlewares/global_error_handler";
import { apiLimiter } from "./app/middlewares/rate_limiter";
import appRouter from "./routes";
import webhookRouter from "./webhooks";
import logger from "./app/configs/logger";
import { swaggerOptions } from "./swaggerOptions";
import notFound from "./app/middlewares/not_found_api";

// define app
const app = express();
const swaggerSpec = swaggerJSDoc(swaggerOptions);
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Serve uploaded files statically
const uploadDir = path.join(process.cwd(), "uploads");
app.use("/uploads", express.static(uploadDir));

// Security middleware
app.use(helmet()); // Add security headers

// CORS configuration
const corsOrigins = configs.allowed_origins
  ? configs.allowed_origins.split(",").filter(Boolean)
  : [configs.jwt.front_end_url || "http://localhost:3000"];

app.use(
  cors({
    origin: corsOrigins.length > 0 ? corsOrigins : "http://localhost:3000",
    // Allow all origins for development, but in production, you should specify allowed origins
    // origin: "*",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
// app.use(
//   cors({
//     origin: corsOrigins.length > 0 ? corsOrigins : 'http://localhost:3000',
//     credentials: true,
//     methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
//     allowedHeaders: ["Content-Type", "Authorization"],
//   }),
// );

// Request logging middleware...
app.use(
  morgan("combined", {
    stream: { write: (message) => logger.info(message.trim()) },
  }),
);

// Rate limiting
app.use("/api/", apiLimiter);

// Webhook endpoints (MUST be before express.json() to use raw body)
// Stripe webhook requires raw body for signature verification
app.use("/webhooks", webhookRouter);

// Body parsing middleware (applies to all routes EXCEPT webhooks above)
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// Trust first proxy hop only (Nginx) — avoids permissive trust-proxy rate-limit warnings
app.set("trust proxy", 1);

app.use("/api/v1", appRouter);

// stating point
app.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    status: "success",
    message: "Server is running successfully",
    data: null,
  });
});

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// global error handler
app.use(globalErrorHandler);
app.use(notFound);

// export app
export default app;
