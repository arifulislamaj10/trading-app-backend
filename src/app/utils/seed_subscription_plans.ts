import {
  SubscriptionPlan_Model,
  DEFAULT_PLANS,
} from "../modules/subscription/subscription.plans";

/**
 * Seed subscription plans into the database
 * Run this once to populate default subscription plans
 *
 * Usage: npx ts-node src/app/utils/seed_subscription_plans.ts
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

    console.log("✅ Successfully synced subscription plans:");
    DEFAULT_PLANS.forEach((plan) => {
      console.log(
        `   - ${plan.name} (${plan.planId}) - $${plan.price}/${plan.interval}`,
      );
    });

    console.log("\n💡 Stripe Sync:");
    console.log(
      "   The system will automatically attempt to sync these plans with Stripe on server start.",
    );
  } catch (error) {
    console.error("❌ Failed to seed subscription plans:", error);
    throw error;
  }
};

export default seedSubscriptionPlans;
