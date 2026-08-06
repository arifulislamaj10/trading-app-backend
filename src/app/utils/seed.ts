import bcrypt from "bcrypt";
import { Account_Model } from "../modules/auth/auth.schema";
import {
  SubscriptionPlan_Model,
  DEFAULT_PLANS,
} from "../modules/subscription/subscription.plans";
import { configs } from "../configs";
import { stripeService } from "../modules/subscription/stripe.service";
import { seedBadges } from "../modules/badge/badge.seed";

/**
 * Seed admin user into the database
 */
const seedAdmin = async () => {
  const adminEmail = configs.seed.admin_email;
  const adminPassword = configs.seed.admin_password;

  if (!adminEmail || !adminPassword) {
    console.log(
      "⚠️  ADMIN_EMAIL or ADMIN_PASSWORD not found in env - skipping admin seed",
    );
    return;
  }

  const isExist = await Account_Model.findOne({ email: adminEmail });

  if (isExist) {
    console.log("✅ Admin user already exists:", adminEmail);
    return;
  }

  const hashedPassword = await bcrypt.hash(adminPassword, 12);

  await Account_Model.create({
    name: "Admin User",
    email: adminEmail,
    password: hashedPassword,
    role: "ADMIN",
    isVerified: true,
    accountStatus: "ACTIVE",
  });

  console.log("✅ Admin user created successfully:", adminEmail);
};

/**
 * Sync subscription plans with Stripe (create products/prices)
 */
const syncPlansWithStripe = async () => {
  try {
    // Check if Stripe is configured
    if (
      !configs.stripe.secretKey ||
      configs.stripe.secretKey === "sk_test_your_stripe_publishable_key"
    ) {
      console.log("⚠️  Stripe not configured - skipping Stripe sync");
      console.log(
        "   Configure STRIPE_SECRET_KEY in .env to enable Stripe integration",
      );
      return false;
    }

    console.log("\n🔄 Syncing subscription plans with Stripe...");

    const paidPlans = DEFAULT_PLANS.filter((plan) => plan.price > 0);
    let syncedCount = 0;

    for (const plan of paidPlans) {
      // Check if plan already exists with Stripe IDs
      const existingPlan = await SubscriptionPlan_Model.findOne({
        planId: plan.planId,
      });

      if (
        existingPlan?.syncedToStripe &&
        existingPlan.stripePriceId &&
        existingPlan.price === plan.price
      ) {
        console.log(`✅ Plan "${plan.name}" already synced to Stripe`);
        syncedCount++;
        continue;
      }

      // Sync with Stripe (now more robust - uses list instead of search)
      try {
        const stripeData = await stripeService.syncPlanWithStripe({
          planId: plan.planId,
          name: plan.name,
          description: plan.description,
          price: plan.price,
          currency: plan.currency,
          interval: plan.interval,
        });

        // Update or create plan in database with Stripe IDs
        await SubscriptionPlan_Model.findOneAndUpdate(
          { planId: plan.planId },
          {
            ...plan,
            stripeProductId: stripeData.stripeProductId,
            stripePriceId: stripeData.stripePriceId,
            syncedToStripe: true,
          },
          { upsert: true, new: true },
        );

        syncedCount++;
      } catch (error: any) {
        console.error(
          `❌ Failed to sync plan "${plan.name}" with Stripe:`,
          error.message,
        );
        // Continue with other plans even if one fails
      }
    }

    console.log(
      `\n✅ Synced ${syncedCount}/${paidPlans.length} paid plans with Stripe`,
    );
    return true;
  } catch (error: any) {
    console.error("❌ Stripe sync failed:", error.message);
    return false;
  }
};

/**
 * Seed subscription plans into the database
 */
const seedSubscriptionPlans = async () => {
  try {
    console.log("🌱 Syncing subscription plans with database...");

    const planIds = DEFAULT_PLANS.map((p) => p.planId);

    // Remove plans that are no longer in DEFAULT_PLANS
    const deleteResult = await SubscriptionPlan_Model.deleteMany({
      planId: { $nin: planIds },
    });

    if (deleteResult.deletedCount > 0) {
      console.log(
        `🗑️  Removed ${deleteResult.deletedCount} old subscription plans`,
      );
    }

    // Upsert default plans (ensure they are always up to date)
    for (const plan of DEFAULT_PLANS) {
      await SubscriptionPlan_Model.findOneAndUpdate(
        { planId: plan.planId },
        { $set: plan },
        { upsert: true, new: true },
      );
    }

    console.log(
      `✅ Database strictly supports ${DEFAULT_PLANS.length} subscription plans:`,
    );
    DEFAULT_PLANS.forEach((plan) => {
      console.log(`   • ${plan.name} - $${plan.price}/${plan.interval}`);
    });
  } catch (error) {
    console.error("❌ Failed to seed subscription plans:", error);
    throw error;
  }
};

/**
 * Seed demo/test users (optional)
 */
const seedDemoUsers = async () => {
  const demoUsers = [
    {
      name: "John Doe",
      email: "john@example.com",
      password: "DemoPass123!",
      role: "USER",
      isVerified: true,
      accountStatus: "ACTIVE",
    },
    {
      name: "Jane Smith",
      email: "jane@example.com",
      password: "DemoPass123!",
      role: "USER",
      isVerified: true,
      accountStatus: "ACTIVE",
    },
  ];

  for (const user of demoUsers) {
    const isExist = await Account_Model.findOne({ email: user.email });

    if (isExist) {
      console.log(`✅ Demo user already exists: ${user.email}`);
      continue;
    }

    const hashedPassword = await bcrypt.hash(user.password, 12);

    await Account_Model.create({
      ...user,
      password: hashedPassword,
    });

    console.log(`✅ Demo user created: ${user.email}`);
  }
};

/**
 * Run all seed operations
 */
const runAllSeeds = async () => {
  // Check if auto-seeding is enabled
  if (!configs.seed.auto_seed) {
    console.log("\n⏭️  Auto-seeding disabled - skipping seed operations\n");
    return;
  }

  console.log("\n🌱 Running seed operations...");
  console.log("─".repeat(50));

  try {
    await seedAdmin();
    await seedSubscriptionPlans();
    await seedBadges();

    // Try to sync with Stripe (will gracefully skip if Stripe not configured)
    await syncPlansWithStripe();

    await seedDemoUsers();

    console.log("─".repeat(50));
    console.log("✅ All seed operations completed successfully\n");
  } catch (error) {
    console.error("❌ Seed operation failed:", error);
    throw error;
  }
};

export default runAllSeeds;
export {
  seedAdmin,
  seedSubscriptionPlans,
  seedDemoUsers,
  syncPlansWithStripe,
  seedBadges,
};
