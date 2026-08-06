export const adminSwaggerDocs = {
  "/api/v1/admin/analytics": {
    get: {
      tags: ["Admin"],
      summary: "Get platform analytics",
      description:
        "Admin only. Retrieve comprehensive platform statistics including users, masters, subscriptions, signals, revenue, and recent activity.",
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: "Platform analytics retrieved",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  message: {
                    type: "string",
                    example: "Platform analytics retrieved",
                  },
                  data: {
                    type: "object",
                    properties: {
                      users: {
                        type: "object",
                        properties: {
                          total: { type: "integer", example: 1523 },
                        },
                      },
                      masters: {
                        type: "object",
                        properties: {
                          total: { type: "integer", example: 45 },
                          approved: { type: "integer", example: 38 },
                          pending: { type: "integer", example: 7 },
                        },
                      },
                      subscriptions: {
                        type: "object",
                        properties: {
                          active: { type: "integer", example: 892 },
                          byTier: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                _id: { type: "string", example: "pro_monthly" },
                                count: { type: "integer", example: 234 },
                              },
                            },
                          },
                        },
                      },
                      signals: {
                        type: "object",
                        properties: {
                          total: { type: "integer", example: 4521 },
                          active: { type: "integer", example: 312 },
                        },
                      },
                      follows: {
                        type: "object",
                        properties: {
                          total: { type: "integer", example: 3210 },
                        },
                      },
                      revenue: {
                        type: "object",
                        properties: {
                          total: {
                            type: "number",
                            example: 25890,
                            description: "Total revenue in dollars",
                          },
                          transactionCount: { type: "integer", example: 1456 },
                        },
                      },
                      referrals: {
                        type: "object",
                        properties: {
                          total: { type: "integer", example: 450 },
                          active: { type: "integer", example: 125 },
                          totalRewards: {
                            type: "number",
                            example: 2250,
                            description: "Total rewards distributed in dollars",
                          },
                        },
                      },
                      recentSubscriptions: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            _id: { type: "string" },
                            planId: { type: "string" },
                            status: { type: "string" },
                            accountId: {
                              type: "object",
                              properties: {
                                name: { type: "string" },
                                email: { type: "string" },
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
        403: { description: "Admin access required" },
      },
    },
  },

  "/api/v1/admin/broadcast": {
    post: {
      tags: ["Admin"],
      summary: "Broadcast system announcement",
      description:
        "Send a notification announcement to all users (or filtered by role). Creates a notification for each targeted user.",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["title", "message"],
              properties: {
                title: {
                  type: "string",
                  maxLength: 255,
                  example: "Scheduled Maintenance",
                },
                message: {
                  type: "string",
                  example:
                    "The platform will undergo scheduled maintenance on April 10th from 2:00-4:00 AM UTC.",
                },
                link: {
                  type: "string",
                  example: "/announcements/maintenance-april-10",
                },
                targetRole: {
                  type: "string",
                  enum: ["USER", "MASTER", "ADMIN"],
                  example: "USER",
                  description: "Optional: send only to specific role",
                },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: "Announcement sent",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  message: {
                    type: "string",
                    example: "Announcement sent to 1523 users",
                  },
                  data: {
                    type: "object",
                    properties: {
                      sentCount: { type: "integer", example: 1523 },
                    },
                  },
                },
              },
            },
          },
        },
        403: { description: "Admin access required" },
      },
    },
  },

  "/api/v1/admin/change-role": {
    patch: {
      tags: ["Admin"],
      summary: "Change user role",
      description:
        "Admin only. Promote or demote a user's role (USER, MASTER, ADMIN).",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["userId", "role"],
              properties: {
                userId: { type: "string", example: "65f1234567890abcdef12345" },
                role: {
                  type: "string",
                  enum: ["USER", "ADMIN", "MASTER"],
                  example: "MASTER",
                },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: "User role changed",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  message: {
                    type: "string",
                    example: "User role changed to MASTER",
                  },
                  data: {
                    type: "object",
                    properties: {
                      _id: { type: "string" },
                      name: { type: "string" },
                      email: { type: "string" },
                      role: { type: "string", example: "MASTER" },
                      accountStatus: { type: "string", example: "ACTIVE" },
                    },
                  },
                },
              },
            },
          },
        },
        403: { description: "Admin access required" },
        404: { description: "User not found" },
      },
    },
  },

  "/api/v1/admin/payments": {
    get: {
      tags: ["Admin"],
      summary: "Get all payment logs",
      description:
        "Admin only. View all payment transactions across the platform with pagination and status filter.",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "page", in: "query", schema: { type: "integer", default: 1 } },
        {
          name: "limit",
          in: "query",
          schema: { type: "integer", default: 20, maximum: 100 },
        },
        {
          name: "status",
          in: "query",
          schema: {
            type: "string",
            enum: ["succeeded", "failed", "pending", "refunded"],
          },
        },
      ],
      responses: {
        200: {
          description: "Payment logs retrieved",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  message: {
                    type: "string",
                    example: "Payment logs retrieved",
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
                          },
                        },
                        subscriptionId: {
                          type: "object",
                          properties: {
                            planId: { type: "string" },
                            status: { type: "string" },
                          },
                        },
                        stripePaymentIntentId: { type: "string" },
                        amount: {
                          type: "number",
                          example: 29,
                          description: "Amount in dollars",
                        },
                        currency: { type: "string", example: "usd" },
                        status: { type: "string", example: "succeeded" },
                        description: {
                          type: "string",
                          example: "Subscription renewal - pro_monthly",
                        },
                        invoiceUrl: { type: "string" },
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
        403: { description: "Admin access required" },
      },
    },
  },

  "/api/v1/admin/plans/{id}": {
    patch: {
      tags: ["Admin"],
      summary: "Update subscription plan",
      description: "Admin only. Update existing subscription plan details.",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string" },
          description: "Subscription plan MongoDB _id",
        },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                name: { type: "string", example: "Pro Plan Updated" },
                price: {
                  type: "number",
                  example: 89,
                  description: "Price in dollars",
                },
                durationInDays: { type: "integer", example: 30 },
                features: {
                  type: "array",
                  items: { type: "string" },
                  example: ["Feature 1", "Feature 2"],
                },
                isActive: { type: "boolean", example: true },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: "Subscription plan updated successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  message: {
                    type: "string",
                    example: "Subscription plan updated successfully",
                  },
                  data: { type: "object" },
                },
              },
            },
          },
        },
        403: { description: "Admin access required" },
        404: { description: "Plan not found" },
      },
    },
  },

  "/api/v1/admin/subscribers": {
    get: {
      tags: ["Admin"],
      summary: "Get all subscribers",
      description:
        "Admin only. View all users who have active or past subscriptions.",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "page", in: "query", schema: { type: "integer", default: 1 } },
        {
          name: "limit",
          in: "query",
          schema: { type: "integer", default: 20 },
        },
        {
          name: "status",
          in: "query",
          schema: {
            type: "string",
            enum: ["active", "canceled", "past_due", "trialing", "paused"],
          },
        },
      ],
      responses: {
        200: {
          description: "All subscribers retrieved",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  message: {
                    type: "string",
                    example: "All subscribers retrieved",
                  },
                  data: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        userId: { type: "string" },
                        userInfo: {
                          type: "object",
                          properties: {
                            name: { type: "string" },
                            email: { type: "string" },
                          },
                        },
                        planId: { type: "string" },
                        planName: { type: "string" },
                        startDate: { type: "string", format: "date-time" },
                        endDate: { type: "string", format: "date-time" },
                        status: { type: "string" },
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
        403: { description: "Admin access required" },
      },
    },
  },

  "/api/v1/admin/referrals/stats": {
    get: {
      tags: ["Admin"],
      summary: "Get global referral statistics",
      description:
        "Admin only. Retrieve global platform-wide stats for the referral campaign.",
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: "Global referral stats retrieved",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  message: {
                    type: "string",
                    example: "Global referral stats retrieved",
                  },
                  data: { $ref: "#/components/schemas/GlobalReferralStats" },
                },
              },
            },
          },
        },
        403: { description: "Admin access required" },
      },
    },
  },

  "/api/v1/admin/referrals": {
    get: {
      tags: ["Admin"],
      summary: "Get all referrals",
      description:
        "Admin only. Retrieve a paginated list of every referral in the system.",
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
          description: "Filter by referrer or invitee name",
        },
        {
          name: "status",
          in: "query",
          schema: { type: "string", enum: ["PENDING", "COMPLETED", "EXPIRED"] },
        },
      ],
      responses: {
        200: {
          description: "All referrals retrieved",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  message: {
                    type: "string",
                    example: "All referrals retrieved",
                  },
                  data: {
                    type: "array",
                    items: { $ref: "#/components/schemas/AdminReferralItem" },
                  },
                  meta: { $ref: "#/components/schemas/PaginationMeta" },
                },
              },
            },
          },
        },
        403: { description: "Admin access required" },
      },
    },
  },
};
