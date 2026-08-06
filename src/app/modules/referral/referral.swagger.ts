export const referralSwaggerDocs = {
  "/api/v1/referrals/stats": {
    get: {
      tags: ["Referrals"],
      summary: "Get personal referral statistics",
      description:
        "Retrieve the current user's unique referral code, generated link, and high-level stats.",
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: "Referral stats retrieved successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  message: {
                    type: "string",
                    example: "Referral stats retrieved",
                  },
                  data: { $ref: "#/components/schemas/ReferralStats" },
                },
              },
            },
          },
        },
        401: { description: "Unauthorized" },
        403: { description: "Forbidden" },
      },
    },
  },
  "/api/v1/referrals/history": {
    get: {
      tags: ["Referrals"],
      summary: "Get personal referral history",
      description:
        "Retrieve a paginated list of friends referred by the current user.",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "page", in: "query", schema: { type: "integer", default: 1 } },
        {
          name: "limit",
          in: "query",
          schema: { type: "integer", default: 20 },
        },
        {
          name: "search",
          in: "query",
          schema: { type: "string" },
          description: "Filter by invitee name",
        },
      ],
      responses: {
        200: {
          description: "Referral history retrieved successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  message: {
                    type: "string",
                    example: "Referral history retrieved",
                  },
                  data: {
                    type: "array",
                    items: { $ref: "#/components/schemas/ReferralHistoryItem" },
                  },
                  meta: { $ref: "#/components/schemas/PaginationMeta" },
                },
              },
            },
          },
        },
        401: { description: "Unauthorized" },
        403: { description: "Forbidden" },
      },
    },
  },
};
