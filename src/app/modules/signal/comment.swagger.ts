export const commentSwaggerDocs = {
  "/api/v1/comments": {
    get: {
      tags: ["Comments"],
      summary: "Get comments for a signal",
      description:
        "Retrieve a paginated list of comments for a specific trading signal. Comments are sorted by latest first.",
      parameters: [
        {
          name: "signalId",
          in: "query",
          required: true,
          schema: { type: "string" },
          description: "The ID of the signal to get comments for",
        },
        {
          name: "page",
          in: "query",
          schema: { type: "integer", default: 1 },
          description: "Page number for pagination",
        },
        {
          name: "limit",
          in: "query",
          schema: { type: "integer", default: 10 },
          description: "Number of comments per page",
        },
      ],
      responses: {
        200: {
          description: "Comments retrieved successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  message: {
                    type: "string",
                    example: "Comments retrieved successfully",
                  },
                  data: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        _id: {
                          type: "string",
                          example: "65f1234567890abcdef12345",
                        },
                        signalId: {
                          type: "string",
                          example: "65f1234567890abcdef67890",
                        },
                        message: {
                          type: "string",
                          example:
                            "Great entry point! Watching the RSI carefully.",
                        },
                        userId: {
                          type: "object",
                          properties: {
                            _id: { type: "string" },
                            name: { type: "string", example: "John Doe" },
                            userProfileUrl: {
                              type: "string",
                              example:
                                "https://bucket.s3.amazonaws.com/profiles/avatar.png",
                            },
                          },
                        },
                        createdAt: {
                          type: "string",
                          format: "date-time",
                          example: "2026-05-11T10:00:00.000Z",
                        },
                      },
                    },
                  },
                  meta: { $ref: "#/components/schemas/PaginationMeta" },
                },
              },
            },
          },
        },
        400: {
          description: "Invalid signal ID or missing required query parameters",
        },
      },
    },
    post: {
      tags: ["Comments"],
      summary: "Post a comment on a signal",
      description:
        "Allow authenticated users to post a comment on a specific trading signal. Maximum length is 500 characters.",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["signalId", "message"],
              properties: {
                signalId: {
                  type: "string",
                  example: "65f1234567890abcdef67890",
                  description: "The ID of the signal to comment on",
                },
                message: {
                  type: "string",
                  minLength: 1,
                  maxLength: 500,
                  example: "I agree with this setup, target hit!",
                },
              },
            },
          },
        },
      },
      responses: {
        201: {
          description: "Comment posted successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  message: {
                    type: "string",
                    example: "Comment posted successfully",
                  },
                  data: {
                    type: "object",
                    properties: {
                      _id: { type: "string" },
                      signalId: { type: "string" },
                      userId: { type: "string" },
                      message: { type: "string" },
                      createdAt: { type: "string", format: "date-time" },
                    },
                  },
                },
              },
            },
          },
        },
        400: { description: "Validation error (e.g., message too long)" },
        401: { description: "Unauthorized" },
        404: { description: "Signal not found" },
      },
    },
  },
};
