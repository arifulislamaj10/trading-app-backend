export const subscriptionSwaggerDocs = {
  "/api/v1/subscription/plans": {
    get: {
      tags: ["Subscription"],
      summary: "Get all subscription plans",
      description:
        "Retrieve all available subscription plans. Public endpoint, no authentication required.",
      responses: {
        200: {
          description: "Subscription plans retrieved successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  message: {
                    type: "string",
                    example: "Subscription plans retrieved successfully",
                  },
                  data: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        planId: { type: "string", example: "basic_monthly" },
                        name: {
                          type: "string",
                          example: "Basic Plan (Monthly)",
                        },
                        description: {
                          type: "string",
                          example: "Perfect for beginner traders",
                        },
                        price: { type: "number", example: 2900 },
                        currency: { type: "string", example: "usd" },
                        interval: {
                          type: "string",
                          enum: ["month", "year"],
                          example: "month",
                        },
                        features: { type: "array", items: { type: "string" } },
                        signalLimit: { type: "number", example: 50 },
                        mediaAccess: { type: "boolean", example: true },
                        tier: {
                          type: "string",
                          enum: ["free", "basic", "pro", "master"],
                          example: "basic",
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
  "/api/v1/subscription/checkout": {
    post: {
      tags: ["Subscription"],
      summary: "Create checkout session",
      description:
        "Create a Stripe checkout session for subscribing to a plan. First-time subscribers get a 7-day free trial.",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["planId"],
              properties: {
                planId: {
                  type: "string",
                  description: "The plan ID to subscribe to",
                  example: "basic_monthly",
                },
                returnUrl: {
                  type: "string",
                  description: "URL to redirect after checkout (optional)",
                  example: "https://yourapp.com/subscription",
                },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: "Checkout session created successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  message: {
                    type: "string",
                    example: "Checkout session created successfully",
                  },
                  data: {
                    type: "object",
                    properties: {
                      checkoutUrl: {
                        type: "string",
                        example: "https://checkout.stripe.com/pay/cs_test_...",
                      },
                      sessionId: { type: "string", example: "cs_test_..." },
                      trialDays: { type: "number", example: 7 },
                    },
                  },
                },
              },
            },
          },
        },
        400: {
          description: "Bad Request - Plan not found or already subscribed",
        },
        401: { description: "Unauthorized" },
      },
    },
  },
  "/api/v1/subscription/current": {
    get: {
      tags: ["Subscription"],
      summary: "Get current subscription",
      description:
        "Retrieve the authenticated user's current subscription details and access status.",
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: "Subscription details retrieved successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  message: {
                    type: "string",
                    example: "Subscription details retrieved successfully",
                  },
                  data: {
                    type: "object",
                    properties: {
                      subscription: { type: "object" },
                      plan: { type: "object" },
                      hasAccess: { type: "boolean", example: true },
                      daysRemaining: { type: "number", example: 23 },
                      tier: { type: "string", example: "basic" },
                    },
                  },
                },
              },
            },
          },
        },
        401: { description: "Unauthorized" },
      },
    },
  },
  "/api/v1/subscription/status": {
    post: {
      tags: ["Subscription"],
      summary: "Update subscription status (cancel or resume)",
      description:
        "Cancel or resume your subscription. Use `{ action: 'cancel' }` to cancel at period end, or `{ action: 'resume' }` to resume a scheduled cancellation.",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["action"],
              properties: {
                action: {
                  type: "string",
                  enum: ["cancel", "resume"],
                  example: "cancel",
                },
              },
            },
          },
        },
      },
      responses: {
        200: { description: "Subscription status updated" },
        400: {
          description: "Bad Request — Invalid action or subscription state",
        },
        401: { description: "Unauthorized" },
      },
    },
  },
  "/api/v1/subscription/change-plan": {
    post: {
      tags: ["Subscription"],
      summary: "Change subscription plan (upgrade or downgrade)",
      description:
        "Upgrade or downgrade your subscription plan. Upgrades are immediate and prorated. Downgrades take effect at the end of the current billing period. If `direction` is not provided, it is auto-detected based on tier comparison.",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["planId"],
              properties: {
                planId: { type: "string", example: "pro_monthly" },
                direction: {
                  type: "string",
                  enum: ["upgrade", "downgrade"],
                  example: "upgrade",
                },
              },
            },
          },
        },
      },
      responses: {
        200: { description: "Subscription plan changed" },
        400: {
          description: "Bad Request — Invalid plan or direction mismatch",
        },
        401: { description: "Unauthorized" },
      },
    },
  },
  "/api/v1/subscription/cancel": {
    post: {
      tags: ["Subscription"],
      summary: "Cancel subscription (deprecated)",
      description:
        "Deprecated: Use `POST /subscription/status` with `{ action: 'cancel' }` instead. Cancel the current subscription. Access continues until the end of the billing period.",
      deprecated: true,
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: "Subscription canceled successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  message: {
                    type: "string",
                    example:
                      "Subscription will be canceled at the end of current billing period",
                  },
                  data: {
                    type: "object",
                    properties: {
                      currentPeriodEnd: { type: "string", format: "date-time" },
                    },
                  },
                },
              },
            },
          },
        },
        400: {
          description:
            "Bad Request - Subscription not found or already canceled",
        },
        401: { description: "Unauthorized" },
      },
    },
  },
  "/api/v1/subscription/resume": {
    post: {
      tags: ["Subscription"],
      summary: "Resume subscription (deprecated)",
      description:
        "Deprecated: Use `POST /subscription/status` with `{ action: 'resume' }` instead. Resume a subscription that was scheduled for cancellation.",
      deprecated: true,
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: "Subscription resumed successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  message: {
                    type: "string",
                    example: "Subscription has been resumed",
                  },
                  data: {
                    type: "object",
                    properties: {
                      nextBillingDate: { type: "string", format: "date-time" },
                    },
                  },
                },
              },
            },
          },
        },
        400: {
          description:
            "Bad Request - Subscription not found or not scheduled for cancellation",
        },
        401: { description: "Unauthorized" },
      },
    },
  },
  "/api/v1/subscription/upgrade": {
    post: {
      tags: ["Subscription"],
      summary: "Upgrade subscription (deprecated)",
      description:
        "Deprecated: Use `POST /subscription/change-plan` with `{ planId, direction: 'upgrade' }` instead. Upgrade to a higher subscription tier. Changes are prorated and effective immediately.",
      deprecated: true,
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["planId"],
              properties: {
                planId: {
                  type: "string",
                  description: "The higher tier plan ID to upgrade to",
                  example: "pro_monthly",
                },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: "Subscription upgraded successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  message: {
                    type: "string",
                    example: "Subscription upgraded successfully",
                  },
                  data: {
                    type: "object",
                    properties: {
                      newPlan: {
                        type: "string",
                        example: "Pro Plan (Monthly)",
                      },
                      prorated: { type: "boolean", example: true },
                    },
                  },
                },
              },
            },
          },
        },
        400: { description: "Bad Request - Plan not found or not an upgrade" },
        401: { description: "Unauthorized" },
      },
    },
  },
  "/api/v1/subscription/downgrade": {
    post: {
      tags: ["Subscription"],
      summary: "Downgrade subscription (deprecated)",
      description:
        "Deprecated: Use `POST /subscription/change-plan` with `{ planId, direction: 'downgrade' }` instead. Downgrade to a lower subscription tier. Changes take effect at the end of the current billing period.",
      deprecated: true,
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["planId"],
              properties: {
                planId: {
                  type: "string",
                  description: "The lower tier plan ID to downgrade to",
                  example: "basic_monthly",
                },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: "Subscription downgrade scheduled",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  message: {
                    type: "string",
                    example:
                      "Subscription will be downgraded at the end of current billing period",
                  },
                  data: {
                    type: "object",
                    properties: {
                      newPlan: {
                        type: "string",
                        example: "Basic Plan (Monthly)",
                      },
                      effectiveDate: { type: "string", format: "date-time" },
                    },
                  },
                },
              },
            },
          },
        },
        400: { description: "Bad Request - Plan not found or not a downgrade" },
        401: { description: "Unauthorized" },
      },
    },
  },
  "/api/v1/subscription/billing-portal": {
    post: {
      tags: ["Subscription"],
      summary: "Create billing portal session",
      description:
        "Create a Stripe Customer Portal session for users to manage their subscription, payment methods, and view invoices.",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: false,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                returnUrl: {
                  type: "string",
                  description: "URL to redirect after portal session",
                  example: "https://yourapp.com/subscription",
                },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: "Billing portal session created",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  message: {
                    type: "string",
                    example: "Billing portal session created",
                  },
                  data: {
                    type: "object",
                    properties: {
                      portalUrl: {
                        type: "string",
                        example: "https://billing.stripe.com/p/session_...",
                      },
                    },
                  },
                },
              },
            },
          },
        },
        400: { description: "Bad Request - Subscription not found" },
        401: { description: "Unauthorized" },
      },
    },
  },
  "/api/v1/subscription/payments": {
    get: {
      tags: ["Subscription"],
      summary: "Get payment history",
      description:
        "Retrieve the authenticated user's payment history with pagination.",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "page",
          in: "query",
          schema: { type: "integer", default: 1 },
          description: "Page number",
        },
        {
          name: "limit",
          in: "query",
          schema: { type: "integer", default: 10 },
          description: "Items per page",
        },
      ],
      responses: {
        200: {
          description: "Payment history retrieved successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  message: {
                    type: "string",
                    example: "Payment history retrieved successfully",
                  },
                  data: { type: "array", items: { type: "object" } },
                  meta: {
                    type: "object",
                    properties: {
                      page: { type: "integer", example: 1 },
                      limit: { type: "integer", example: 10 },
                      total: { type: "integer", example: 5 },
                      totalPages: { type: "integer", example: 1 },
                    },
                  },
                },
              },
            },
          },
        },
        401: { description: "Unauthorized" },
      },
    },
  },
  "/api/v1/subscription/usage": {
    get: {
      tags: ["Subscription"],
      summary: "Get subscription usage",
      description:
        "Retrieve the authenticated user's signal usage and remaining limits for the current billing period.",
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: "Subscription usage retrieved successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  message: {
                    type: "string",
                    example: "Subscription usage retrieved successfully",
                  },
                  data: {
                    type: "object",
                    properties: {
                      signalsUsed: { type: "number", example: 12 },
                      signalLimit: { type: "number", example: 50 },
                      signalsRemaining: { type: "number", example: 38 },
                      currentPeriodStart: {
                        type: "string",
                        format: "date-time",
                      },
                      currentPeriodEnd: { type: "string", format: "date-time" },
                      canViewMoreSignals: { type: "boolean", example: true },
                    },
                  },
                },
              },
            },
          },
        },
        400: { description: "Bad Request - Subscription not found" },
        401: { description: "Unauthorized" },
      },
    },
  },
};
