import mongoose, { ConnectOptions } from "mongoose";
import logger from "./logger";

interface DatabaseConfig {
  url: string;
  options: ConnectOptions;
}

class DatabaseConnection {
  private static instance: DatabaseConnection;
  private isConnected: boolean = false;

  private constructor() {}

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  /**
   * Build MongoDB connection URI with proper error handling
   * Supports both local MongoDB and MongoDB Atlas
   */
  private buildConnectionUrl(baseUri: string): string {
    const uri = baseUri.trim();

    // Validate URI format
    if (!uri.startsWith("mongodb://") && !uri.startsWith("mongodb+srv://")) {
      throw new Error(
        'Invalid MongoDB URI. Must start with "mongodb://" or "mongodb+srv://"',
      );
    }

    return uri;
  }

  /**
   * Get connection options optimized for production
   */
  private getConnectionOptions(): ConnectOptions {
    return {
      // Connection pool settings
      maxPoolSize: 10, // Maximum number of connections in the pool
      minPoolSize: 5, // Minimum number of connections in the pool
      maxIdleTimeMS: 30000, // Maximum time a connection can be idle

      // Socket settings
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of no I/O
      connectTimeoutMS: 20000, // Initial connection timeout

      // Server selection
      serverSelectionTimeoutMS: 5000, // How long to block for server selection

      // Heartbeat for monitoring
      heartbeatFrequencyMS: 10000, // Frequency of server checks

      // Retry settings (enabled by default in Mongoose 6+)
      retryWrites: true,
      retryReads: true,

      // Write concern (for replica sets)
      w: "majority",

      // Avoid deprecated options warnings
      family: 4, // Use IPv4
    };
  }

  /**
   * Connect to MongoDB with retry logic
   */
  public async connect(dbUrl: string, maxRetries: number = 3): Promise<void> {
    if (this.isConnected) {
      logger.info("Database already connected");
      return;
    }

    const url = this.buildConnectionUrl(dbUrl);
    const options = this.getConnectionOptions();

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await mongoose.connect(url, options);
        this.isConnected = true;
        logger.info(
          `✅ Database connected successfully (attempt ${attempt}/${maxRetries})`,
        );

        // Log connection info (without sensitive data)
        const dbName = mongoose.connection.name;
        const host = mongoose.connection.host;
        logger.info(`📦 Database: ${dbName} | Host: ${host}`);

        return;
      } catch (error) {
        lastError = error as Error;
        logger.warn(
          `❌ Database connection attempt ${attempt}/${maxRetries} failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        );

        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff: 1s, 2s, 4s (max 5s)
          logger.info(`⏳ Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed
    const errorMessage = `Failed to connect to MongoDB after ${maxRetries} attempts. Last error: ${lastError?.message}`;
    logger.error(`🚨 ${errorMessage}`);
    throw new Error(errorMessage);
  }

  /**
   * Disconnect from MongoDB
   */
  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      logger.info("Database not connected");
      return;
    }

    try {
      await mongoose.connection.close();
      this.isConnected = false;
      logger.info("🔌 Database disconnected");
    } catch (error) {
      logger.error("Error disconnecting from database:", error);
      throw error;
    }
  }

  /**
   * Get connection status
   */
  public get status(): boolean {
    return this.isConnected && mongoose.connection.readyState === 1;
  }

  /**
   * Get mongoose connection object for event listeners
   */
  public get connection() {
    return mongoose.connection;
  }

  /**
   * Setup connection event listeners
   */
  public setupEventListeners(): void {
    const connection = mongoose.connection;

    connection.on("error", (error) => {
      logger.error("🔴 MongoDB connection error:", error);
      this.isConnected = false;
    });

    connection.on("disconnected", () => {
      logger.warn("⚠️  MongoDB disconnected");
      this.isConnected = false;
    });

    connection.on("reconnected", () => {
      logger.info("✅ MongoDB reconnected");
      this.isConnected = true;
    });

    connection.on("timeout", () => {
      logger.warn("⏰ MongoDB connection timeout");
    });

    connection.on("close", () => {
      logger.info("🔒 MongoDB connection closed");
      this.isConnected = false;
    });
  }

  /**
   * Drop all indexes from a collection (for development/debugging)
   * WARNING: Use with caution in production
   */
  public async dropCollectionIndexes(collectionName: string): Promise<void> {
    try {
      const collection = mongoose.connection.collection(collectionName);
      await collection.dropIndexes();
      logger.info(`Dropped all indexes from collection: ${collectionName}`);
    } catch (error) {
      logger.error(`Failed to drop indexes from ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Sync indexes for a collection
   * Compares schema indexes with database indexes and creates missing ones
   */
  public async syncIndexes(modelName: string): Promise<void> {
    try {
      const model = mongoose.model(modelName);
      await model.syncIndexes({ background: true });
      logger.info(`✅ Indexes synchronized for model: ${modelName}`);
    } catch (error) {
      logger.error(`Failed to sync indexes for ${modelName}:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const databaseConnection = DatabaseConnection.getInstance();
export default databaseConnection;
