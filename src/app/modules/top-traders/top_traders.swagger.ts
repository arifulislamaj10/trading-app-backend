export const topTradersSwaggerDocs = {
  "/api/v1/top-traders": {
    get: {
      tags: ["Top Traders"],
      summary: "Get top traders",
      description:
        "Retrieve top approved Master Traders ranked by performance metrics. Use `limit=3` for top-3 widget, `limit=10` (default) for full paginated list.",
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
                            name: { type: "string" },
                            userProfileUrl: { type: "string" },
                            bio: { type: "string" },
                            specialties: {
                              type: "array",
                              items: { type: "string" },
                            },
                            winRate: { type: "number" },
                            avgPnl: { type: "number" },
                            totalSignals: { type: "integer" },
                            winningSignals: { type: "integer" },
                            losingSignals: { type: "integer" },
                            followerCount: { type: "integer" },
                            isFeatured: { type: "boolean" },
                            isFollow: { type: "boolean" },
                            recentSignalsCount: { type: "integer" },
                            rank: { type: "integer" },
                            badgeName: { type: "string", example: "Gold" },
                          },
                        },
                      },
                      meta: {
                        type: "object",
                        properties: {
                          page: { type: "integer" },
                          limit: { type: "integer" },
                          total: { type: "integer" },
                          totalPages: { type: "integer" },
                          timeframe: { type: "string" },
                          sortBy: { type: "string" },
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
    },
  },
  "/api/v1/top-traders/performance/{accountId}": {
    get: {
      tags: ["Top Traders"],
      summary: "Get trader performance details",
      description:
        "Detailed performance breakdown for a specific approved Master Trader.",
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
      description: "Side-by-side comparison of two approved Master Traders.",
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
