export const walletTransactionSwaggerDocs = {
  "/api/v1/transactions/history": {
    get: {
      tags: ["Transactions"],
      summary: "Get my wallet transaction history",
      description:
        "Retrieve a paginated list of all rewards and withdrawals associated with the current user's wallet.",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "page", in: "query", schema: { type: "integer", default: 1 } },
        {
          name: "limit",
          in: "query",
          schema: { type: "integer", default: 10 },
        },
      ],
      responses: {
        200: {
          description: "Transaction history retrieved successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  message: {
                    type: "string",
                    example: "Transaction history fetched successfully",
                  },
                  data: {
                    type: "array",
                    items: { $ref: "#/components/schemas/WalletTransaction" },
                  },
                  meta: { $ref: "#/components/schemas/PaginationMeta" },
                },
              },
            },
          },
        },
        401: { description: "Unauthorized" },
      },
    },
  },
};
