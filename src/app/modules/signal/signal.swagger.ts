export const signalSwaggerDocs = {
  "/api/v1/signals": {
    get: {
      tags: ["Signals"],
      summary: "List all signals (public)",
      description: "Get paginated list of signals with optional filters. Active signals shown by default.",
      parameters: [
        { name: "page", in: "query", schema: { type: "integer", default: 1 } },
        { name: "limit", in: "query", schema: { type: "integer", default: 20, maximum: 100 } },
        { name: "search", in: "query", schema: { type: "string" }, description: "Search by signal title or symbol" },
        { name: "assetType", in: "query", schema: { type: "string", enum: ["forex", "crypto", "stocks", "indices", "commodities"] } },
        { name: "signalType", in: "query", schema: { type: "string", enum: ["long", "short"] } },
        { name: "status", in: "query", schema: { type: "string", enum: ["draft", "scheduled", "active", "completed", "expired", "canceled"] } },
        { name: "publishType", in: "query", schema: { type: "string", enum: ["instant", "scheduled"] } },
        { name: "isPremium", in: "query", schema: { type: "boolean" } },
        { name: "authorId", in: "query", schema: { type: "string" }, description: "Filter by Master Trader ID" },
      ],
      responses: {
        200: {
          description: "Signals retrieved successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  message: { type: "string", example: "Signals retrieved successfully" },
                  data: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        _id: { type: "string" },
                        title: { type: "string", example: "EUR/USD Bullish Breakout" },
                        symbol: { type: "string", example: "EURUSD" },
                        assetType: { type: "string", example: "forex" },
                        signalType: { type: "string", example: "long" },
                        timeframe: { type: "string", example: "h4" },
                        entryPrice: { type: "number", example: 1.085 },
                        stopLoss: { type: "number", example: 1.082 },
                        takeProfit1: { type: "number", example: 1.09 },
                        takeProfit2: { type: "number", example: 1.093 },
                        takeProfit3: { type: "number", example: 1.097 },
                        status: { type: "string", example: "active" },
                        videoUrl: { type: "string", example: "https://bucket.s3.region.amazonaws.com/uploads/video.mp4" },
                        isFeatured: { type: "boolean", example: true },
                        viewCount: { type: "integer", example: 342 },
                        likeCount: { type: "integer", example: 28 },
                        commentCount: { type: "integer", example: 12 },
                        bookmarkCount: { type: "integer", example: 5 },
                        copierCount: { type: "integer", example: 8 },
                        authorId: {
                          type: "object",
                          properties: {
                            name: { type: "string" },
                            userProfileUrl: { type: "string" },
                          },
                        },
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
    post: {
      tags: ["Signals"],
      summary: "Create a new signal",
      description: "Create a trading signal. Requires MASTER role and approved Master profile.",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["title", "assetType", "symbol", "signalType", "timeframe", "entryPrice"],
              properties: {
                title: { type: "string", minLength: 3, maxLength: 255, example: "EUR/USD Bullish Breakout" },
                description: { type: "string", maxLength: 5000, example: "Strong bullish momentum detected..." },
                assetType: { type: "string", enum: ["forex", "crypto", "stocks", "indices", "commodities"], example: "forex" },
                symbol: { type: "string", maxLength: 20, example: "EURUSD" },
                signalType: { type: "string", enum: ["long", "short"], example: "long" },
                timeframe: { type: "string", enum: ["m1", "m5", "m15", "m30", "h1", "h4", "d1", "w1", "mn1"], example: "h4" },
                entryPrice: { type: "number", positive: true, example: 1.085 },
                entryNotes: { type: "string", maxLength: 1000, example: "Entry on H4 candle close above resistance" },
                stopLoss: { type: "number", nullable: true, example: 1.082 },
                takeProfit1: { type: "number", nullable: true, example: 1.09 },
                takeProfit2: { type: "number", nullable: true, example: 1.093 },
                takeProfit3: { type: "number", nullable: true, example: 1.097 },
                tags: { type: "array", items: { type: "string" }, maxItems: 10, example: ["breakout", "eurusd"] },
                externalChartUrl: { type: "string", format: "uri", example: "https://www.tradingview.com/chart/..." },
                videoUrl: { type: "string", format: "uri", example: "https://bucket.s3.region.amazonaws.com/uploads/video.mp4" },
                publishType: { type: "string", enum: ["instant", "scheduled"], default: "instant", example: "scheduled", description: "Publish mode: 'instant' (default) publishes immediately, 'scheduled' publishes at scheduledAt time" },
                scheduledAt: { type: "string", format: "date-time", example: "2026-04-08T10:00:00.000Z", description: "Required when publishType is 'scheduled'. Must be a future ISO 8601 datetime. Signal will auto-publish at this time." },
              },
            },
          },
        },
      },
      responses: {
        201: { description: "Signal created successfully" },
        400: { description: "Validation error" },
        403: { description: "Only approved Master Traders can create signals" },
      },
    },
  },

  "/api/v1/signals/{id}": {
    get: {
      tags: ["Signals"],
      summary: "Get single signal",
      description: "Get details of a specific signal by ID.",
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string" }, description: "Signal ID" },
      ],
      responses: {
        200: { description: "Signal retrieved successfully" },
        400: { description: "Invalid signal ID" },
        404: { description: "Signal not found" },
      },
    },
    patch: {
      tags: ["Signals"],
      summary: "Update or close a signal",
      description: "Update your own signal. To close a signal, set `status: 'completed'` and provide `resultPnl`. This triggers master win/loss stats update.",
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
              properties: {
                title: { type: "string", example: "Updated EUR/USD Signal" },
                description: { type: "string" },
                stopLoss: { type: "number", example: 1.081 },
                takeProfit1: { type: "number", example: 1.091 },
                tags: { type: "array", items: { type: "string" } },
                videoUrl: { type: "string", format: "uri" },
                status: { type: "string", enum: ["completed"], example: "completed", description: "Set to 'completed' to close the signal. Must include resultPnl." },                resultPnl: { type: "number", example: 2.5, description: "Required when closing. Profit/loss percentage. Positive = win." },
                closeNotes: { type: "string", example: "Hit TP2 target" },
              },
            },
          },
        },
      },
      responses: {
        200: { description: "Signal updated or closed successfully" },
        400: { description: "Invalid input or cannot update non-active signal" },
        403: { description: "You can only update your own signals" },
        404: { description: "Signal not found" },
      },
    },
    delete: {
      tags: ["Signals"],
      summary: "Delete a signal",
      description: "Soft-delete your own signal (sets status to canceled).",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string" } },
      ],
      responses: {
        200: { description: "Signal deleted" },
        403: { description: "You can only delete your own signals" },
        404: { description: "Signal not found" },
      },
    },
  },

  "/api/v1/signals/my/signals": {
    get: {
      tags: ["Signals"],
      summary: "Get my signals",
      description: "Get signals created by the authenticated Master Trader.",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "page", in: "query", schema: { type: "integer", default: 1 } },
        { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
        { name: "status", in: "query", schema: { type: "string", enum: ["active", "completed", "expired", "canceled"] } },
      ],
      responses: {
        200: { description: "My signals retrieved successfully" },
        401: { description: "Unauthorized" },
      },
    },
  },

  "/api/v1/signals/featured/{id}": {
    patch: {
      tags: ["Signals"],
      summary: "Toggle signal featured status (Admin)",
      description: "Admin only. Feature or un-feature a signal for homepage highlighting.",
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
        200: { description: "Signal featured status updated" },
        403: { description: "Admin access required" },
        404: { description: "Signal not found" },
      },
    },
  },

  "/api/v1/signals/{id}/like": {
    post: {
      tags: ["Signals"],
      summary: "Like a signal",
      description: "Like a signal (increments likeCount and tracks contribution).",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string" } },
      ],
      responses: {
        200: { description: "Signal liked successfully" },
        404: { description: "Signal not found" },
      },
    },
    delete: {
      tags: ["Signals"],
      summary: "Unlike a signal",
      description: "Remove like from a signal (decrements likeCount).",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string" } },
      ],
      responses: {
        200: { description: "Signal unliked successfully" },
        404: { description: "Signal not found" },
      },
    },
  },

  "/api/v1/signals/{id}/bookmark": {
    post: {
      tags: ["Signals"],
      summary: "Bookmark a signal",
      description: "Bookmark a signal for later reference (increments bookmarkCount and tracks contribution).",
      deprecated: true,
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string" } },
      ],
      responses: {
        200: { description: "Signal bookmarked successfully" },
        404: { description: "Signal not found" },
      },
    },
    delete: {
      tags: ["Signals"],
      summary: "Remove bookmark",
      description: "Remove bookmark from a signal (decrements bookmarkCount).",
      deprecated: true,
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string" } },
      ],
      responses: {
        200: { description: "Bookmark removed successfully" },
        404: { description: "Signal not found" },
      },
    },
  },

  "/api/v1/signals/{id}/share": {
    post: {
      tags: ["Signals"],
      summary: "Share a signal",
      description: "Track a share action on a signal (contribution tracking).",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string" } },
      ],
      responses: {
        200: { description: "Signal shared successfully" },
        404: { description: "Signal not found" },
      },
    },
  },

  "/api/v1/signals/review-queue": {
    get: {
      tags: ["Signals", "AI Workflow"],
      summary: "Get MT review queue",
      description: "Signals awaiting Master confirmation after AI validation.",
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: "Review queue" } },
    },
  },
  "/api/v1/signals/{id}/confirm": {
    post: {
      tags: ["Signals", "AI Workflow"],
      summary: "Confirm and publish signal",
      security: [{ bearerAuth: [] }],
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      responses: { 200: { description: "Signal published" } },
    },
  },
  "/api/v1/signals/{id}/reject": {
    post: {
      tags: ["Signals", "AI Workflow"],
      summary: "Reject signal",
      description:
        "Master rejects their own signal before publish (draft / ai_failed / mt_pending). Body optional. Cannot reject active or already-rejected signals.",
      security: [{ bearerAuth: [] }],
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      requestBody: {
        required: false,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                rejectionReason: { type: "string", maxLength: 500 },
              },
            },
          },
        },
      },
      responses: { 200: { description: "Signal rejected" } },
    },
  },
  "/api/v1/signals/{id}/resubmit-ai": {
    post: {
      tags: ["Signals", "AI Workflow"],
      summary: "Resubmit signal for AI validation",
      description:
        "Re-runs Groq validation. Allowed when workflowStatus is draft, ai_pending, ai_failed, or mt_pending (e.g. after editing levels).",
      security: [{ bearerAuth: [] }],
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      responses: { 200: { description: "AI validation rerun" } },
    },
  },
  "/api/v1/signals/{id}/ai-assist": {
    post: {
      tags: ["Signals", "AI Workflow"],
      summary: "Get AI setup assistance for draft signal",
      security: [{ bearerAuth: [] }],
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      responses: { 200: { description: "AI assist result" } },
    },
  },
};
