import { configs } from "./app/configs";
import { authSwaggerDocs } from "./app/modules/auth/auth.swagger";
import { userSwaggerDocs } from "./app/modules/user/user.swagger";
import { uploadSwaggerDocs } from "./app/modules/upload.ts/upload.swagger";
import { subscriptionSwaggerDocs } from "./app/modules/subscription/subscription.swagger";
import { signalSwaggerDocs } from "./app/modules/signal/signal.swagger";
import { commentSwaggerDocs } from "./app/modules/signal/comment.swagger";
import { masterSwaggerDocs } from "./app/modules/master/master.swagger";
import { followSwaggerDocs } from "./app/modules/follow/follow.swagger";
import { notificationSwaggerDocs } from "./app/modules/notification/notification.swagger";
import { adminSwaggerDocs } from "./app/modules/admin/admin.swagger";
import { referralSwaggerDocs } from "./app/modules/referral/referral.swagger";
import { withdrawalSwaggerDocs } from "./app/modules/withdrawal/withdrawal.swagger";
import { walletTransactionSwaggerDocs } from "./app/modules/wallet_transaction/wallet_transaction.swagger";
import { contributionSwaggerDocs } from "./app/modules/contribution/contribution.swagger";
import { leaderboardSwaggerDocs } from "./app/modules/leaderboard/leaderboard.swagger";
import { topTradersSwaggerDocs } from "./app/modules/top-traders/top_traders.swagger";
import { copiedTradeSwaggerDocs } from "./app/modules/copied_trade/copied_trade.swagger";
import { badgeSwaggerDocs } from "./app/modules/badge/badge.swagger";
import { trainingSwaggerDocs } from "./app/modules/training/training.swagger";
import { academySwaggerDocs } from "./app/modules/academy/academy.swagger";

export const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Trading Signal Platform API",
      version: "1.0.0",
      description:
        "Production-level SaaS trading signal platform. Users subscribe to the platform to access trading signals posted by approved Master Traders. All payments go to the Admin/Platform Stripe account.",
    },
    paths: {
      ...commentSwaggerDocs,
      ...authSwaggerDocs,
      ...userSwaggerDocs,
      ...uploadSwaggerDocs,
      ...subscriptionSwaggerDocs,
      ...signalSwaggerDocs,
      ...masterSwaggerDocs,
      ...followSwaggerDocs,
      ...notificationSwaggerDocs,
      ...adminSwaggerDocs,
      ...referralSwaggerDocs,
      ...withdrawalSwaggerDocs,
      ...walletTransactionSwaggerDocs,
      ...contributionSwaggerDocs,
      ...leaderboardSwaggerDocs,
      ...topTradersSwaggerDocs,
      ...copiedTradeSwaggerDocs,
      ...badgeSwaggerDocs,
      ...trainingSwaggerDocs,
      ...academySwaggerDocs,
    },
    servers:
      configs.env === "production"
        ? [
            { url: configs.jwt.front_end_url || "http://206.162.244.11:7777" },
            { url: "http://localhost:5000" },
          ]
        : [
            { url: "http://localhost:5000" },
            { url: "http://206.162.244.11:7777" },
          ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description:
            "Enter your JWT token. Example payload: { userId: '65f123...', email: 'user@example.com', role: 'USER' | 'ADMIN' | 'MASTER' }",
        },
      },
      schemas: {
        Role: {
          type: "string",
          enum: ["USER", "ADMIN", "MASTER"],
          description: "User role for authorization",
          example: "USER",
        },
        AccountStatus: {
          type: "string",
          enum: ["ACTIVE", "INACTIVE", "SUSPENDED"],
          description: "Account status",
          example: "ACTIVE",
        },
        JWTToken: {
          type: "object",
          properties: {
            userId: { type: "string", example: "65f1234567890abcdef12345" },
            email: { type: "string", example: "user@example.com" },
            role: {
              type: "string",
              enum: ["USER", "ADMIN", "MASTER"],
              example: "USER",
            },
            iat: { type: "integer", example: 1712345678 },
            exp: { type: "integer", example: 1712346578 },
          },
        },
        SubscriptionTier: {
          type: "string",
          enum: ["free", "basic", "pro", "master"],
          description: "Subscription tier level",
          example: "basic",
        },
        AssetType: {
          type: "string",
          enum: ["forex", "crypto", "stocks", "indices", "commodities"],
          description: "Asset type for trading signals",
          example: "forex",
        },
        SignalType: {
          type: "string",
          enum: ["long", "short"],
          description: "Direction of the trading signal",
          example: "long",
        },
        SignalTimeframe: {
          type: "string",
          enum: ["m1", "m5", "m15", "m30", "h1", "h4", "d1", "w1", "mn1"],
          description: "Chart timeframe for the signal",
          example: "h4",
        },
        SignalStatus: {
          type: "string",
          enum: ["active", "completed", "expired", "canceled"],
          description: "Status of a trading signal",
          example: "active",
        },
        NotificationType: {
          type: "string",
          enum: [
            "new_signal",
            "subscription_active",
            "subscription_expiring",
            "subscription_canceled",
            "payment_succeeded",
            "payment_failed",
            "system_announcement",
            "signal_copied",
            "trade_result_logged",
          ],
          description: "Type of notification",
          example: "new_signal",
        },
        PaginationMeta: {
          type: "object",
          properties: {
            page: { type: "integer", example: 1 },
            limit: { type: "integer", example: 20 },
            total: { type: "integer", example: 150 },
            totalPages: { type: "integer", example: 8 },
          },
        },
        StandardResponse: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            message: { type: "string" },
            data: { type: "object", nullable: true },
            meta: { $ref: "#/components/schemas/PaginationMeta" },
          },
        },
        ReferralStatus: {
          type: "string",
          enum: ["PENDING", "COMPLETED", "EXPIRED"],
          example: "PENDING",
        },
        ReferralStats: {
          type: "object",
          properties: {
            referralCode: { type: "string", example: "MY_TRADING_CODE_2024" },
            referralCodeChanged: {
              type: "boolean",
              example: false,
              description:
                "Whether the user has already changed their referral code once",
            },
            referralLink: {
              type: "string",
              example: "https://tradingapp.com/signup?ref=MY_TRADING_CODE_2024",
            },
            totalReferrals: { type: "integer", example: 10 },
            activeReferrals: { type: "integer", example: 5 },
            badge: { type: "string", example: "Bronze" },
            totalRewards: { type: "number", example: 50 },
            walletBalance: { type: "number", example: 150 },
            conversionRate: {
              type: "number",
              example: 50,
              description:
                "Personal conversion rate (% of referrals completed)",
            },
            campaignPerformance: {
              type: "object",
              description:
                "Platform-wide campaign progress plus personal monthly stats",
              properties: {
                goal: { type: "integer", example: 1000 },
                completed: { type: "integer", example: 250 },
                progressPercent: { type: "number", example: 25 },
                thisMonthCompleted: { type: "integer", example: 3 },
                lastMonthCompleted: { type: "integer", example: 2 },
                monthlyGrowthPercent: { type: "number", example: 50 },
              },
            },
          },
        },
        WithdrawalStatus: {
          type: "string",
          enum: ["PENDING", "APPROVED", "COMPLETED", "REJECTED"],
          example: "PENDING",
        },
        WithdrawalRequest: {
          type: "object",
          properties: {
            _id: { type: "string" },
            userId: { type: "string" },
            amount: { type: "number" },
            paymentMethod: { type: "string" },
            paymentDetails: { type: "string" },
            status: { $ref: "#/components/schemas/WithdrawalStatus" },
            adminNote: { type: "string" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        WalletTransactionType: {
          type: "string",
          enum: ["REWARD", "WITHDRAWAL"],
          example: "REWARD",
        },
        WalletTransactionStatus: {
          type: "string",
          enum: ["PENDING", "COMPLETED", "FAILED", "REJECTED"],
          example: "COMPLETED",
        },
        WalletTransaction: {
          type: "object",
          properties: {
            _id: { type: "string" },
            userId: { type: "string" },
            amount: { type: "number" },
            type: { $ref: "#/components/schemas/WalletTransactionType" },
            status: { $ref: "#/components/schemas/WalletTransactionStatus" },
            referenceId: { type: "string" },
            description: { type: "string" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        ReferralHistoryItem: {
          type: "object",
          properties: {
            _id: { type: "string" },
            inviteeName: { type: "string" },
            status: { $ref: "#/components/schemas/ReferralStatus" },
            rewardAmount: { type: "number" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        AdminReferralItem: {
          type: "object",
          properties: {
            _id: { type: "string" },
            referrerName: { type: "string" },
            inviteeName: { type: "string" },
            status: { $ref: "#/components/schemas/ReferralStatus" },
            rewardAmount: { type: "number" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        GlobalReferralStats: {
          type: "object",
          properties: {
            totalReferrals: { type: "integer" },
            activeReferrals: { type: "integer" },
            totalRewardsDistributed: { type: "number" },
            topReferrers: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  count: { type: "integer" },
                  rewards: { type: "number" },
                },
              },
            },
          },
        },
      },
    },
    tags: [
      {
        name: "Comments",
        description: "Signal engagement through user comments",
      },
      {
        name: "Authentication",
        description: "User registration, login, password management, and 2FA",
      },
      {
        name: "Two-Factor Authentication",
        description:
          "TOTP-based two-factor authentication setup and management",
      },
      {
        name: "Users",
        description: "User profile management and admin user operations",
      },
      { name: "Upload", description: "File upload to S3/local storage" },
      {
        name: "Subscriptions",
        description:
          "Platform subscription plans, checkout, and Stripe payment management",
      },
      {
        name: "Signals",
        description: "Trading signal creation, management, and viewing",
      },
      {
        name: "Masters",
        description: "Master Trader profiles and performance stats",
      },
      {
        name: "Masters (Admin)",
        description: "Admin operations for featuring Master Traders",
      },
      { name: "Follow", description: "Follow/unfollow Master Traders" },
      { name: "Notifications", description: "User notification management" },
      {
        name: "Referrals",
        description: "User referral system - invite friends and earn rewards",
      },
      {
        name: "Withdrawals",
        description: "User withdrawal requests and wallet management",
      },
      {
        name: "Withdrawals (Admin)",
        description: "Admin operations for processing withdrawal requests",
      },
      {
        name: "Transactions",
        description: "Wallet transaction history (rewards and withdrawals)",
      },
      {
        name: "Contributions",
        description: "User engagement tracking and top contributor rankings",
      },
      {
        name: "Leaderboard",
        description: "Overall platform leaderboard with composite scoring",
      },
      {
        name: "Top Traders",
        description: "Top Master Traders ranked by trading performance",
      },
      {
        name: "Copy Trades",
        description:
          "Copy trade intent tracking and trade journal for logging results",
      },
      {
        name: "Admin",
        description:
          "Admin dashboard — analytics, broadcasts, role management, payment logs",
      },
    ],
  },
  // Don't scan files - use manual swagger docs instead
  // This prevents EISDIR errors and improves performance
  apis: [],
};
