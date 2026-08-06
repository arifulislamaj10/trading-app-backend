import { BADGE_DEFINITIONS } from "./badge.constants";
import { Badge_Model } from "./badge.schema";

/**
 * Idempotent seed for the badge catalog.
 */
export const seedBadges = async () => {
  for (const def of BADGE_DEFINITIONS) {
    await Badge_Model.findOneAndUpdate(
      { key: def.key },
      {
        $set: {
          key: def.key,
          name: def.name,
          description: def.description,
          iconKey: def.iconKey,
          iconUrl: `/assets/badges/${def.iconKey}.png`,
          role: def.role,
          category: def.category,
          sortOrder: def.sortOrder,
          isActive: true,
        },
      },
      { upsert: true, new: true },
    );
  }
};
