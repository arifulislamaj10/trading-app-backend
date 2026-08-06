export const leaderboardSwaggerDocs = {
  "/api/v1/leaderboard": {
    get: {
      tags: ["Leaderboard"],
      summary: "Get leaderboard",
      description:
        "Retrieve ranked Master Traders based on composite performance score (win rate 40%, avg PnL 30%, followers 20%, activity 10%). Platform stats are included in the response under the `stats` field.",
      parameters: [
        {
          name: "timeframe",
          in: "query",
          schema: {
            type: "string",
            enum: ["week", "month", "all"],
            default: "all",
          },
        },
        { name: "page", in: "query", schema: { type: "integer", default: 1 } },
        {
          name: "limit",
          in: "query",
          schema: { type: "integer", default: 10, maximum: 100 },
        },
      ],
      responses: {
        200: {
          description: "Leaderboard retrieved successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean" },
                  message: { type: "string" },
                  data: {
                    type: "object",
                    properties: {
                      data: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            _id: { type: "string" },
                            accountId: { type: "object" },
                            bio: { type: "string" },
                            specialties: {
                              type: "array",
                              items: { type: "string" },
                            },
                            winRate: { type: "number" },
                            avgPnl: { type: "number" },
                            followerCount: { type: "integer" },
                            totalSignals: { type: "integer" },
                            isFeatured: { type: "boolean" },
                            leaderboardScore: { type: "number" },
                            badgeName: { type: "string", example: "Gold" },
                          },
                        },
                      },
                      topThree: {
                        type: "array",
                        description: "Top 3 highlighted traders",
                      },
                      rest: { type: "array", description: "Remaining traders" },
                      stats: {
                        type: "object",
                        description: "Platform-wide leaderboard statistics",
                        properties: {
                          totalMasters: { type: "integer" },
                          avgWinRate: { type: "number" },
                          totalSignals: { type: "integer" },
                          totalFollowers: { type: "integer" },
                        },
                      },
                      meta: { $ref: "#/components/schemas/PaginationMeta" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  "/api/v1/leaderboard/rank/{accountId}": {
    get: {
      tags: ["Leaderboard"],
      summary: "Get user rank",
      parameters: [
        {
          name: "accountId",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      responses: {
        200: {
          description: "User rank retrieved successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean" },
                  message: { type: "string" },
                  data: {
                    type: "object",
                    properties: {
                      rank: { type: "integer" },
                      score: { type: "number" },
                      totalMasters: { type: "integer" },
                      masterProfile: {
                        type: "object",
                        properties: {
                          winRate: { type: "number" },
                          avgPnl: { type: "number" },
                          followerCount: { type: "integer" },
                          totalSignals: { type: "integer" },
                          badgeName: { type: "string", example: "Platinum" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        404: { description: "Master profile not found or not approved" },
      },
    },
  },
};
