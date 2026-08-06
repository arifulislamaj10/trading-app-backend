export const badgeSwaggerDocs = {
  "/api/v1/badges": {
    get: {
      tags: ["Badges"],
      summary: "Get badge catalog for the authenticated user",
      description:
        "Returns all badges for the user role (USER or MASTER) with earned status and optional progress.",
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: "Badges fetched successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  message: { type: "string" },
                  data: {
                    type: "object",
                    properties: {
                      role: { type: "string", enum: ["USER", "MASTER"] },
                      summary: {
                        type: "object",
                        properties: {
                          earned: { type: "number", example: 2 },
                          total: { type: "number", example: 7 },
                        },
                      },
                      badges: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            key: { type: "string", example: "first_signal" },
                            name: { type: "string", example: "First signal" },
                            description: {
                              type: "string",
                              example: "Log your first trade",
                            },
                            iconKey: { type: "string" },
                            iconUrl: { type: "string" },
                            earned: { type: "boolean" },
                            earnedAt: { type: "string", nullable: true },
                            progress: {
                              type: "object",
                              nullable: true,
                              properties: {
                                current: { type: "number" },
                                target: { type: "number" },
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
      },
    },
  },
  "/api/v1/badges/earned": {
    get: {
      tags: ["Badges"],
      summary: "Get earned badges only",
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: "Earned badges list" } },
    },
  },
  "/api/v1/badges/summary": {
    get: {
      tags: ["Badges"],
      summary: "Get badge summary with recently earned",
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: "Badge summary" } },
    },
  },
};
