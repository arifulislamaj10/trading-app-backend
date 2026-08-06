// Jest test setup file
import { jest } from "@jest/globals";
import mongoose from "mongoose";

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
// Set test environment variables
process.env.NODE_ENV = "test";
process.env.PORT = "5001";
process.env.DB_URL = "mongodb://localhost:27017/test_db";
process.env.ACCESS_TOKEN = "test-access-token-secret-key-min-32-characters";
process.env.REFRESH_TOKEN = "test-refresh-token-secret-key-min-32-characters";
process.env.RESET_SECRET = "test-reset-token-secret-key-min-32-characters";
process.env.VERIFIED_TOKEN = "test-verified-token-secret-key-min-32-characters";
process.env.ACCESS_EXPIRES = "15m";
process.env.REFRESH_EXPIRES = "7d";
process.env.RESET_EXPIRES = "10m";
process.env.FRONT_END_URL = "http://localhost:3000";
process.env.ALLOWED_ORIGINS = "http://localhost:3000";
process.env.STRIPE_SECRET_KEY = "sk_test_dummy_key_for_testing_12345678";
process.env.STRIPE_PUBLISHABLE_KEY = "pk_test_dummy_key_for_testing_12345678";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_webhook_secret_12345678";

// Optional DB for integration tests only (set JEST_INTEGRATION=true)
beforeAll(async () => {
  if (process.env.JEST_INTEGRATION !== "true") return;
  try {
    await mongoose.connect(process.env.DB_URL as string, {
      serverSelectionTimeoutMS: 3000,
    });
  } catch {
    // Integration tests require MongoDB; unit tests skip connection
  }
});

afterAll(async () => {
  if (process.env.JEST_INTEGRATION !== "true") return;
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
});

// Clear all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});
