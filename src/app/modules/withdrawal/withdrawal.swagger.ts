export const withdrawalSwaggerDocs = {
  "/api/v1/withdrawals/request": {
    post: {
      tags: ["Withdrawals"],
      summary: "Create a withdrawal request",
      description:
        "Submit a new request to withdraw funds from the wallet balance.",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["amount", "paymentMethod", "paymentDetails"],
              properties: {
                amount: {
                  type: "number",
                  example: 10,
                  description: "Amount in dollars",
                },
                paymentMethod: { type: "string", example: "bKash" },
                paymentDetails: { type: "string", example: "017XXXXXXXX" },
              },
            },
          },
        },
      },
      responses: {
        201: {
          description: "Withdrawal request created successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  message: {
                    type: "string",
                    example: "Withdrawal request created successfully",
                  },
                  data: { $ref: "#/components/schemas/WithdrawalRequest" },
                },
              },
            },
          },
        },
        400: { description: "Insufficient balance or invalid amount" },
        401: { description: "Unauthorized" },
      },
    },
  },
  "/api/v1/withdrawals/my-requests": {
    get: {
      tags: ["Withdrawals"],
      summary: "Get my withdrawal requests",
      description:
        "Retrieve a paginated list of withdrawal requests made by the current user.",
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
          description: "Withdrawal requests retrieved successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  message: {
                    type: "string",
                    example: "Your withdrawal requests fetched successfully",
                  },
                  data: {
                    type: "array",
                    items: { $ref: "#/components/schemas/WithdrawalRequest" },
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
  "/api/v1/withdrawals/all-requests": {
    get: {
      tags: ["Withdrawals (Admin)"],
      summary: "Get all withdrawal requests",
      description:
        "Admin only: Retrieve a paginated list of all withdrawal requests in the system.",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "page", in: "query", schema: { type: "integer", default: 1 } },
        {
          name: "limit",
          in: "query",
          schema: { type: "integer", default: 10 },
        },
        {
          name: "status",
          in: "query",
          schema: { $ref: "#/components/schemas/WithdrawalStatus" },
        },
      ],
      responses: {
        200: {
          description: "All withdrawal requests retrieved successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  message: {
                    type: "string",
                    example: "All withdrawal requests fetched successfully",
                  },
                  data: {
                    type: "array",
                    items: { $ref: "#/components/schemas/WithdrawalRequest" },
                  },
                  meta: { $ref: "#/components/schemas/PaginationMeta" },
                },
              },
            },
          },
        },
        401: { description: "Unauthorized" },
        403: { description: "Forbidden - Admin only" },
      },
    },
  },
  "/api/v1/withdrawals/status/{id}": {
    patch: {
      tags: ["Withdrawals (Admin)"],
      summary: "Update withdrawal request status",
      description:
        "Admin only: Approve, reject, or complete a withdrawal request. Approving will deduct funds from the user's wallet.",
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
              required: ["status"],
              properties: {
                status: {
                  type: "string",
                  enum: ["APPROVED", "COMPLETED", "REJECTED"],
                },
                adminNote: {
                  type: "string",
                  example: "Payment sent via bKash",
                },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: "Withdrawal status updated successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  message: {
                    type: "string",
                    example: "Withdrawal request approved successfully",
                  },
                  data: { $ref: "#/components/schemas/WithdrawalRequest" },
                },
              },
            },
          },
        },
        401: { description: "Unauthorized" },
        403: { description: "Forbidden - Admin only" },
        404: { description: "Withdrawal request not found" },
      },
    },
  },
};
