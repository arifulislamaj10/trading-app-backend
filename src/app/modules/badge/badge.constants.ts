export type BadgeRole = "USER" | "MASTER";

export type BadgeKey =
  | "training_complete"
  | "first_signal"
  | "hot_streak"
  | "elitist"
  | "perfect_week"
  | "consistent"
  | "ace_trader"
  | "signal_maestro"
  | "top_trader"
  | "rising_star";

export interface BadgeDefinition {
  key: BadgeKey;
  name: string;
  description: string;
  iconKey: string;
  role: BadgeRole;
  category: string;
  sortOrder: number;
}

/** All achievement badges from the product design (9 unique; duplicate Perfect week merged). */
export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    key: "training_complete",
    name: "Training Graduate",
    description: "Complete platform training to unlock trading",
    iconKey: "training_complete",
    role: "USER",
    category: "training",
    sortOrder: 0,
  },
  {
    key: "top_trader",
    name: "Top Trader",
    description: "Rank #1 on the Leaderboard",
    iconKey: "top_trader",
    role: "MASTER",
    category: "ranking",
    sortOrder: 1,
  },
  {
    key: "hot_streak",
    name: "Hot Streak",
    description: "10 Days win streak",
    iconKey: "hot_streak",
    role: "USER",
    category: "trading",
    sortOrder: 2,
  },
  {
    key: "elitist",
    name: "Elitist",
    description: "Unlock the Elite signal level",
    iconKey: "elitist",
    role: "USER",
    category: "subscription",
    sortOrder: 3,
  },
  {
    key: "first_signal",
    name: "First signal",
    description: "Log your first trade",
    iconKey: "first_signal",
    role: "USER",
    category: "trading",
    sortOrder: 4,
  },
  {
    key: "perfect_week",
    name: "Perfect week",
    description: "100% win rate in week",
    iconKey: "perfect_week",
    role: "USER",
    category: "trading",
    sortOrder: 5,
  },
  {
    key: "consistent",
    name: "Consistent",
    description: "Log trades for 30 days",
    iconKey: "consistent",
    role: "USER",
    category: "trading",
    sortOrder: 6,
  },
  {
    key: "rising_star",
    name: "Rising star",
    description: "Top 10 for the month",
    iconKey: "rising_star",
    role: "MASTER",
    category: "ranking",
    sortOrder: 7,
  },
  {
    key: "ace_trader",
    name: "Ace trader",
    description: "75% win rate overall",
    iconKey: "ace_trader",
    role: "USER",
    category: "trading",
    sortOrder: 8,
  },
  {
    key: "signal_maestro",
    name: "Signal Maestro",
    description: "Log 100 trades",
    iconKey: "signal_maestro",
    role: "USER",
    category: "trading",
    sortOrder: 9,
  },
];

export const PRO_TIERS = ["pro", "master"] as const;
export const ACTIVE_SUBSCRIPTION_STATUSES = ["active", "trialing"] as const;

export const BADGE_THRESHOLDS = {
  hotStreakDays: 10,
  consistentLogDays: 30,
  aceTraderMinTrades: 20,
  aceTraderWinRate: 0.75,
  signalMaestroTrades: 100,
  perfectWeekMinTrades: 3,
  risingStarMaxRank: 10,
} as const;
