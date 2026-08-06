export const masterSwaggerDocs = {
  "/api/v1/masters": {
    get: {
      tags: ["Masters"],
      summary: "List all masters (public)",
      description:
        "Get paginated list of Master Traders. Filterable by featured status.",
      parameters: [
        { name: "page", in: "query", schema: { type: "integer", default: 1 } },
        {
          name: "limit",
          in: "query",
          schema: { type: "integer", default: 10 },
        },
        {
          name: "isFeatured",
          in: "query",
          schema: { type: "boolean" },
          description: "Filter by featured status",
        },
        {
          name: "search",
          in: "query",
          schema: { type: "string" },
          description: "Search by master name",
        },
      ],
      responses: {
        200: {
          description: "Masters retrieved successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  message: {
                    type: "string",
                    example: "Masters retrieved successfully",
                  },
                  data: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        _id: { type: "string" },
                        accountId: {
                          type: "object",
                          properties: {
                            name: { type: "string" },
                            email: { type: "string" },
                            userProfileUrl: { type: "string" },
                          },
                        },
                        bio: {
                          type: "string",
                          example: "10+ years in forex trading...",
                        },
                        specialties: {
                          type: "array",
                          items: { type: "string" },
                          example: ["forex", "scalping"],
                        },
                        yearsOfExperience: { type: "integer", example: 10 },
                        totalSignals: { type: "integer", example: 156 },
                        winRate: { type: "number", example: 72.5 },
                        avgPnl: { type: "number", example: 3.2 },
                        followerCount: { type: "integer", example: 1240 },
                        isFeatured: { type: "boolean", example: true },
                        referralBadge: { type: "string", example: "Gold" },
                        badgeName: { type: "string", example: "Gold" },
                        createdAt: { type: "string", format: "date-time" },
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

  "/api/v1/masters/{id}": {
    get: {
      tags: ["Masters"],
      summary: "Get master by ID",
      description: "Get detailed information about a specific Master Trader.",
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string" },
          description: "Master profile ID",
        },
      ],
      responses: {
        200: { description: "Master details retrieved" },
        400: { description: "Invalid master ID" },
        404: { description: "Master profile not found" },
      },
    },
  },

  "/api/v1/masters/profile": {
    patch: {
      tags: ["Masters"],
      summary: "Create or update master profile",
      description:
        "Create or update your Master Trader profile. Requires MASTER role.",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                bio: {
                  type: "string",
                  minLength: 10,
                  maxLength: 2000,
                  example:
                    "Professional forex trader with 10+ years of experience in EUR/USD and GBP/USD pairs. Specializing in swing trading and price action strategies.",
                },
                specialties: {
                  type: "array",
                  items: { type: "string" },
                  maxItems: 10,
                  example: ["forex", "swing-trading", "price-action"],
                },
                yearsOfExperience: {
                  type: "integer",
                  minimum: 0,
                  maximum: 50,
                  example: 10,
                },
              },
            },
          },
        },
      },
      responses: {
        200: { description: "Master profile saved successfully" },
        400: { description: "Validation error" },
        403: {
          description: "Only MASTER role users can create master profiles",
        },
      },
    },
  },

  "/api/v1/masters/profile/me": {
    get: {
      tags: ["Masters"],
      summary: "Get my master profile",
      description: "Get your own Master Trader profile details.",
      security: [{ bearerAuth: [] }],
      responses: {
        200: { description: "Master profile retrieved" },
        404: { description: "Master profile not found" },
      },
    },
  },

  "/api/v1/masters/stats": {
    get: {
      tags: ["Masters"],
      summary: "Get my master stats",
      description: "Get performance statistics for your Master Trader profile.",
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: "Master stats retrieved",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  data: {
                    type: "object",
                    properties: {
                      totalSignals: { type: "integer", example: 156 },
                      winningSignals: { type: "integer", example: 113 },
                      losingSignals: { type: "integer", example: 43 },
                      winRate: { type: "number", example: 72.5 },
                      avgPnl: { type: "number", example: 3.2 },
                      followerCount: { type: "integer", example: 1240 },
                    },
                  },
                },
              },
            },
          },
        },
        404: { description: "Master profile not found" },
      },
    },
  },

  "/api/v1/masters/analytics": {
    get: {
      tags: ["Masters"],
      summary: "Get my master analytics",
      description:
        "Get detailed performance analytics including monthly PnL charts, asset distribution, and follower growth.",
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: "Master detailed analytics retrieved",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  data: {
                    type: "object",
                    properties: {
                      overview: { type: "object" },
                      performance: {
                        type: "object",
                        properties: {
                          monthly: { type: "array", items: { type: "object" } },
                          assetDistribution: {
                            type: "array",
                            items: { type: "object" },
                          },
                          topSymbols: {
                            type: "array",
                            items: { type: "object" },
                          },
                        },
                      },
                      followerGrowth: {
                        type: "array",
                        items: { type: "object" },
                      },
                      recentSignals: {
                        type: "array",
                        items: { type: "object" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        404: { description: "Master profile not found" },
      },
    },
  },

  "/api/v1/masters/featured/{id}": {
    patch: {
      tags: ["Masters (Admin)"],
      summary: "Toggle master featured status",
      description:
        "Admin only. Feature or un-feature a Master Trader for leaderboard highlighting.",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string" } },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["isFeatured"],
              properties: {
                isFeatured: { type: "boolean", example: true },
              },
            },
          },
        },
      },
      responses: {
        200: { description: "Master featured/unfeatured" },
        403: { description: "Admin access required" },
        404: { description: "Master profile not found" },
      },
    },
  },
};
