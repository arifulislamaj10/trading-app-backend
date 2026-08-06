/**
 * Migration Script: Remove TTL Indexes from Account Collection
 *
 * PRODUCTION FIX: This script removes the problematic TTL indexes that were
 * automatically deleting entire account documents when verification/reset codes expired.
 *
 * ISSUE: TTL indexes on verificationCodeExpires and resetPasswordExpire were causing
 * MongoDB to delete ENTIRE user accounts (both verified and unverified) after 10 minutes.
 *
 * SOLUTION:
 * 1. Drop TTL indexes from accounts collection
 * 2. Clean up any lingering TTL field values from existing accounts
 * 3. Ensure accounts remain in database unless explicitly deleted
 *
 * Run ONCE on your production database:
 * npx ts-node src/app/utils/migrate_remove_ttl_indexes.ts
 */

import mongoose from "mongoose";
import { configs } from "../configs";

const migrateRemoveTTLIndexes = async () => {
  try {
    console.log(
      "🚀 Starting migration: Remove TTL indexes from account collection...\n",
    );

    // Connect to database
    await mongoose.connect(configs.db_url as string);
    console.log("✅ Connected to MongoDB\n");

    const db = mongoose.connection.db;
    const collection = db!.collection("accounts");

    // ========================================
    // STEP 1: Identify and drop all TTL indexes
    // ========================================
    console.log(
      "📋 Step 1: Analyzing current indexes on accounts collection...",
    );
    const indexes = await collection.indexes();

    const ttlIndexes = indexes.filter(
      (idx: any) => idx.expireAfterSeconds !== undefined,
    );

    if (ttlIndexes.length > 0) {
      console.log(
        `\n⚠️  Found ${ttlIndexes.length} TTL index(es) that will be removed:`,
      );
      ttlIndexes.forEach((idx: any) => {
        console.log(
          `   - ${idx.name} (expireAfterSeconds: ${idx.expireAfterSeconds})`,
        );
      });
    } else {
      console.log("✅ No TTL indexes found on accounts collection");
    }

    // Drop all TTL indexes
    for (const index of ttlIndexes) {
      try {
        if (index.name) {
          await collection.dropIndex(index.name);
          console.log(`✅ Dropped TTL index: ${index.name}`);
        }
      } catch (error: any) {
        if (error.code === 27) {
          console.log(`ℹ️  Index ${index.name} does not exist, skipping...`);
        } else {
          console.error(
            `❌ Failed to drop index ${index.name}:`,
            error.message,
          );
        }
      }
    }

    // ========================================
    // STEP 2: Clean up TTL field values from existing accounts
    // ========================================
    console.log(
      "\n📋 Step 2: Cleaning up TTL field values from existing accounts...",
    );

    const cleanupResult = await collection.updateMany(
      {
        $or: [
          { verificationCodeExpires: { $exists: true } },
          { resetPasswordExpire: { $exists: true } },
        ],
      },
      {
        $unset: {
          verificationCodeExpires: "",
          resetPasswordExpire: "",
          verificationCode: "",
          resetPasswordCode: "",
        },
      },
    );

    console.log(
      `✅ Cleaned up TTL fields from ${cleanupResult.modifiedCount} account(s)`,
    );

    // ========================================
    // STEP 3: Verify final state
    // ========================================
    console.log("\n📋 Step 3: Verifying final indexes...");
    const remainingIndexes = await collection.indexes();
    console.log("✅ Remaining indexes on accounts collection:");
    remainingIndexes.forEach((index: any) => {
      const ttlNote =
        index.expireAfterSeconds !== undefined ? " ⚠️  TTL INDEX!" : "";
      console.log(`   - ${JSON.stringify(index.key)}${ttlNote}`);
    });

    // Check for any remaining TTL indexes
    const remainingTTL = remainingIndexes.filter(
      (idx: any) => idx.expireAfterSeconds !== undefined,
    );
    if (remainingTTL.length > 0) {
      console.log(
        "\n⚠️  WARNING: Some TTL indexes still exist. Manual removal may be required.",
      );
    } else {
      console.log("\n✅ No TTL indexes remain on accounts collection");
    }

    // ========================================
    // STEP 4: Summary
    // ========================================
    console.log("\n" + "=".repeat(60));
    console.log("✅ MIGRATION COMPLETED SUCCESSFULLY");
    console.log("=".repeat(60));
    console.log("\n📊 Summary:");
    console.log(`   • TTL indexes removed: ${ttlIndexes.length}`);
    console.log(`   • Accounts cleaned: ${cleanupResult.modifiedCount}`);
    console.log("\n💡 What changed:");
    console.log("   • Accounts will NO LONGER be automatically deleted");
    console.log(
      "   • Verification/reset codes still work (application-level expiry)",
    );
    console.log(
      "   • Users remain in database until explicitly deleted via API",
    );
    console.log("\n⚠️  Next steps:");
    console.log("   • Restart your application server");
    console.log("   • Monitor the accounts collection to confirm stability");
    console.log("   • This script does NOT need to be run again");

    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

// Run migration
migrateRemoveTTLIndexes();
