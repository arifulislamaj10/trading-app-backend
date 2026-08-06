export const contributionSwaggerDocs = {
  "/api/v1/contributions/top-contributors": {
    get: {
      tags: ["Contributions"],
      summary: "Get top contributors",
      description:
        "Retrieve top contributors ranked by engagement points. Supports timeframe filtering.",
      parameters: [
        {
          name: "timeframe",
          in: "query",
          schema: {
            type: "string",
            enum: ["week", "month", "all"],
            default: "week",
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
          description: "Top contributors retrieved successfully",
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
                      data: { type: "array" },
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
  "/api/v1/contributions/my-contributions": {
    get: {
      tags: ["Contributions"],
      summary: "Get my contributions",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "timeframe",
          in: "query",
          schema: {
            type: "string",
            enum: ["week", "month", "all"],
            default: "week",
          },
        },
      ],
      responses: {
        200: {
          description: "Your contributions retrieved successfully",
        },
        401: { description: "Authentication required" },
      },
    },
  },
  "/api/v1/contributions/stats/{accountId}": {
    get: {
      tags: ["Contributions"],
      summary: "Get user contribution stats",
      parameters: [
        {
          name: "accountId",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      responses: {
        200: { description: "User contribution stats retrieved successfully" },
        400: { description: "Account ID is required" },
      },
    },
  },
};

export const leaderboardSwaggerDocs = {
  "/api/v1/leaderboard": {
    get: {
      tags: ["Leaderboard"],
      summary: "Get leaderboard",
      description:
        "Retrieve ranked Master Traders based on composite performance score.",
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
                      data: { type: "array" },
                      topThree: { type: "array" },
                      rest: { type: "array" },
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
  "/api/v1/leaderboard/stats": {
    get: {
      tags: ["Leaderboard"],
      summary: "Get leaderboard stats",
      description:
        "Get overall leaderboard statistics (total masters, avg win rate, etc.)",
      responses: {
        200: { description: "Leaderboard stats retrieved successfully" },
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
        200: { description: "User rank retrieved successfully" },
        404: { description: "Master profile not found or not approved" },
      },
    },
  },
};

export const topTradersSwaggerDocs = {
  "/api/v1/top-traders": {
    get: {
      tags: ["Top Traders"],
      summary: "Get top traders",
      description: "Retrieve top Master Traders ranked by performance metrics.",
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
        {
          name: "sortBy",
          in: "query",
          schema: {
            type: "string",
            enum: ["winRate", "avgPnl", "totalSignals", "followerCount"],
            default: "winRate",
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
          description: "Top traders retrieved successfully",
        },
      },
    },
  },
  "/api/v1/top-traders/top-three": {
    get: {
      tags: ["Top Traders"],
      summary: "Get top 3 traders",
      description:
        "Quick widget endpoint for top 3 traders (homepage display).",
      parameters: [
        {
          name: "sortBy",
          in: "query",
          schema: {
            type: "string",
            enum: ["winRate", "avgPnl", "totalSignals", "followerCount"],
            default: "winRate",
          },
        },
      ],
      responses: {
        200: { description: "Top 3 traders retrieved successfully" },
      },
    },
  },
  "/api/v1/top-traders/performance/{accountId}": {
    get: {
      tags: ["Top Traders"],
      summary: "Get trader performance",
      description: "Detailed performance breakdown for a specific trader.",
      parameters: [
        {
          name: "accountId",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      responses: {
        200: { description: "Trader performance retrieved successfully" },
        404: { description: "Trader not found or not approved" },
      },
    },
  },
  "/api/v1/top-traders/compare/{accountId1}/{accountId2}": {
    get: {
      tags: ["Top Traders"],
      summary: "Compare two traders",
      description: "Side-by-side comparison of two Master Traders.",
      parameters: [
        {
          name: "accountId1",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
        {
          name: "accountId2",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      responses: {
        200: { description: "Trader comparison retrieved successfully" },
        404: { description: "One or both traders not found" },
      },
    },
  },
};
