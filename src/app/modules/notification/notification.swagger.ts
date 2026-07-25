export const notificationSwaggerDocs = {
  "/api/v1/notifications": {
    get: {
      tags: ["Notifications"],
      summary: "Get notifications (all or unread only)",
      description: "Retrieve paginated list of notifications for the authenticated user. Leave query empty for all notifications, or use `?isRead=true` for unread only.",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "page", in: "query", schema: { type: "integer", default: 1 } },
        { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
        { name: "isRead", in: "query", schema: { type: "boolean" }, description: "Filter by read status. Use `true` for unread only." },
        { name: "type", in: "query", schema: { type: "string", enum: ["new_signal", "subscription_active", "subscription_expiring", "subscription_canceled", "payment_succeeded", "payment_failed", "system_announcement"] } },
      ],
      responses: {
        200: {
          description: "Notifications retrieved",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  message: { type: "string", example: "Notifications retrieved" },
                  data: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        _id: { type: "string" },
                        type: { type: "string", example: "new_signal" },
                        title: { type: "string", example: "New Signal from MasterTrader1" },
                        message: { type: "string", example: "MasterTrader1 just posted a new EUR/USD long signal" },
                        isRead: { type: "boolean", example: false },
                        link: { type: "string", example: "/signals/abc123" },
                        createdAt: { type: "string", format: "date-time" },
                      },
                    },
                  },
                  unreadCount: { type: "integer", example: 5 },
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
    patch: {
      tags: ["Notifications"],
      summary: "Mark all notifications as read OR update a single notification",
      description: "Two behaviors merged into one endpoint:\n1. **Mark all as read**: Send `PATCH /notifications` with body `{ \"isRead\": true }`\n2. **Update single notification**: Send `PATCH /notifications/{id}` with body `{ \"isRead\": true/false }`",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "id", in: "path", required: false, schema: { type: "string" }, description: "Notification ID (omit or leave empty to mark all as read)" },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                isRead: { type: "boolean", example: true, description: "Set read status. Use `true` with no ID to mark all as read." },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: "Operation successful",
          content: {
            "application/json": {
              schema: {
                oneOf: [
                  {
                    type: "object",
                    properties: {
                      success: { type: "boolean", example: true },
                      message: { type: "string", example: "All notifications marked as read" },
                      data: {
                        type: "object",
                        properties: {
                          markedCount: { type: "integer", example: 5 },
                        },
                      },
                    },
                  },
                  {
                    type: "object",
                    properties: {
                      success: { type: "boolean", example: true },
                      message: { type: "string", example: "Notification marked as read" },
                      data: {
                        type: "object",
                        properties: {
                          _id: { type: "string" },
                          isRead: { type: "boolean" },
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
        400: { description: "Invalid notification ID" },
        404: { description: "Notification not found" },
      },
    },
  },

  "/api/v1/notifications/unread-count": {
    get: {
      tags: ["Notifications"],
      summary: "Get unread notification count",
      description: "Get the number of unread notifications for the authenticated user.",
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: "Unread count retrieved",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  data: {
                    type: "object",
                    properties: {
                      unreadCount: { type: "integer", example: 5 },
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

  "/api/v1/notifications/mark-all-read": {
    patch: {
      tags: ["Notifications"],
      summary: "Mark all notifications as read (Deprecated - use PATCH /notifications instead)",
      description: "⚠️ **Deprecated**: Use `PATCH /api/v1/notifications` with body `{ \"isRead\": true }` instead. This endpoint is kept for backward compatibility.\n\nMark all unread notifications for the authenticated user as read.",
      deprecated: true,
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: "All notifications marked as read",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  message: { type: "string", example: "All notifications marked as read" },
                  data: {
                    type: "object",
                    properties: {
                      markedCount: { type: "integer", example: 5 },
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

  "/api/v1/notifications/{id}": {
    delete: {
      tags: ["Notifications"],
      summary: "Delete a notification",
      description: "Permanently delete a notification.",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string" }, description: "Notification ID" },
      ],
      responses: {
        200: { description: "Notification deleted" },
        400: { description: "Invalid notification ID" },
        404: { description: "Notification not found" },
      },
    },
  },
};
