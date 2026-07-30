export const copiedTradeSwaggerDocs = {
  '/api/v1/copied-trades/signals/{signalId}/copy': {
    post: {
      tags: ['Copy Trades'],
      summary: 'Copy a signal to your trade journal',
      description: 'Records the user\'s intent to copy a signal. Creates a pending trade entry that can later be logged with a result.',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'signalId',
          in: 'path',
          required: true,
          schema: { type: 'string' },
          description: 'Signal ID to copy',
        },
      ],
      responses: {
        201: { description: 'Signal copied successfully' },
        400: { description: 'Invalid signal ID or signal not in copyable state' },
        404: { description: 'Signal not found' },
        409: { description: 'Already copied this signal' },
      },
    },
  },
  '/api/v1/copied-trades/log': {
    post: {
      tags: ['Copy Trades'],
      summary: 'Log a trade result',
      description:
        'Submit the actual execution result for a previously copied signal. Accepts stopLoss and targetPrice (Target alias; stored as exitPrice + targetPrice).',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['signalId', 'entryPrice', 'outcome'],
              properties: {
                signalId: { type: 'string' },
                entryPrice: { type: 'number', example: 108500 },
                stopLoss: { type: 'number', example: 107200 },
                exitPrice: { type: 'number', example: 109500 },
                targetPrice: { type: 'number', example: 109500 },
                lotSize: { type: 'number', example: 0.1 },
                resultPnl: { type: 'number', example: 120 },
                pnlUnit: { type: 'string', enum: ['usd', 'percent'] },
                outcome: { type: 'string', enum: ['win', 'loss', 'breakeven'] },
                notes: { type: 'string', example: 'Followed master\'s Target 2' },
                screenshotUrl: { type: 'string', example: 'https://example.com/screenshot.png' },
                externalPlatform: { type: 'string', example: 'bybit' },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Trade result logged successfully' },
        400: { description: 'Validation error' },
        404: { description: 'No copied trade found — click "Copy Trade" first' },
        409: { description: 'Trade already logged' },
      },
    },
  },
  '/api/v1/copied-trades/dashboard': {
    get: {
      tags: ['Copy Trades'],
      summary: 'Get Signals Dashboard',
      description:
        'Aggregated trading dashboard for the authenticated user: win rate, total trades, P/L, top traded asset, wins/losses chart data, and trades by asset.',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'timeframe',
          in: 'query',
          schema: { type: 'string', enum: ['week', 'month', 'all'], default: 'all' },
          description: 'Filter completed trades by period (UTC)',
        },
      ],
      responses: {
        200: {
          description: 'Signals dashboard data',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  message: { type: 'string', example: 'Signals dashboard retrieved' },
                  data: {
                    type: 'object',
                    properties: {
                      timeframe: { type: 'string', example: 'all' },
                      summary: {
                        type: 'object',
                        properties: {
                          winRate: { type: 'number', example: 72 },
                          totalTrades: { type: 'integer', example: 128 },
                          profitLossUsd: { type: 'number', example: 1250 },
                          profitLossPercent: { type: 'number', example: 15.5 },
                          profitLossFormatted: { type: 'string', example: '+$1,250' },
                          currency: { type: 'string', example: 'USD' },
                          topTradedAsset: {
                            type: 'object',
                            nullable: true,
                            properties: {
                              symbol: { type: 'string', example: 'AAPL' },
                              assetType: { type: 'string', example: 'stocks' },
                              tradeCount: { type: 'integer', example: 24 },
                            },
                          },
                        },
                      },
                      winsLosses: {
                        type: 'object',
                        properties: {
                          wins: {
                            type: 'object',
                            properties: {
                              count: { type: 'integer', example: 92 },
                              percentage: { type: 'number', example: 72 },
                            },
                          },
                          losses: {
                            type: 'object',
                            properties: {
                              count: { type: 'integer', example: 36 },
                              percentage: { type: 'number', example: 28 },
                            },
                          },
                        },
                      },
                      tradesByAsset: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            symbol: { type: 'string' },
                            assetType: { type: 'string' },
                            total: { type: 'integer' },
                            wins: { type: 'integer' },
                            losses: { type: 'integer' },
                            profitLossUsd: { type: 'number' },
                            profitLossPercent: { type: 'number' },
                            barColor: { type: 'string', enum: ['win', 'loss', 'neutral'] },
                          },
                        },
                      },
                      tradeBars: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            symbol: { type: 'string' },
                            assetType: { type: 'string' },
                            outcome: { type: 'string', nullable: true },
                            profitLoss: { type: 'number' },
                            pnlUnit: { type: 'string', enum: ['usd', 'percent'] },
                            barColor: { type: 'string', enum: ['win', 'loss', 'neutral'] },
                            loggedAt: { type: 'string', format: 'date-time' },
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
        401: { description: 'Unauthorized' },
      },
    },
  },
  '/api/v1/copied-trades': {
    get: {
      tags: ['Copy Trades'],
      summary: 'Get my trade journal',
      description: 'Retrieve your trade history with filters. Includes summary stats (win rate, total PnL).',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['pending', 'completed', 'failed'] } },
        { name: 'outcome', in: 'query', schema: { type: 'string', enum: ['win', 'loss', 'breakeven'] } },
        { name: 'masterId', in: 'query', schema: { type: 'string' }, description: 'Filter by master' },
        { name: 'assetType', in: 'query', schema: { type: 'string', enum: ['forex', 'crypto', 'stocks', 'indices', 'commodities'] } },
        { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date-time' } },
        { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date-time' } },
      ],
      responses: {
        200: { description: 'Trade history with summary stats' },
      },
    },
  },
  '/api/v1/copied-trades/{id}': {
    get: {
      tags: ['Copy Trades'],
      summary: 'Get single trade detail',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        200: { description: 'Trade detail retrieved' },
        404: { description: 'Trade not found' },
      },
    },
    delete: {
      tags: ['Copy Trades'],
      summary: 'Delete a trade log',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        200: { description: 'Trade deleted' },
        404: { description: 'Trade not found' },
      },
    },
  },
  '/api/v1/copied-trades/{id}/cancel': {
    delete: {
      tags: ['Copy Trades'],
      summary: 'Cancel a pending copy',
      description: 'Remove a pending trade entry before logging a result.',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        200: { description: 'Copy canceled' },
        400: { description: 'Trade is not in pending state' },
        404: { description: 'Trade not found' },
      },
    },
  },
  '/api/v1/copied-trades/signals/{signalId}/copiers': {
    get: {
      tags: ['Copy Trades'],
      summary: 'Get copiers of my signal (Master only)',
      description: 'View which users copied a specific signal. Only the signal author can access this.',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'signalId', in: 'path', required: true, schema: { type: 'string' } },
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
      ],
      responses: {
        200: { description: 'Signal copiers retrieved with stats' },
        403: { description: 'Not the signal author' },
        404: { description: 'Signal not found' },
      },
    },
  },
  '/api/v1/copied-trades/masters/{masterId}/copied-stats': {
    get: {
      tags: ['Copy Trades'],
      summary: 'Get master copier stats (public)',
      description: 'Aggregate statistics showing how many users copied this master\'s signals and their outcomes.',
      parameters: [
        { name: 'masterId', in: 'path', required: true, schema: { type: 'string' } },
        { name: 'timeframe', in: 'query', schema: { type: 'string', enum: ['week', 'month', 'all'], example: 'all' } },
      ],
      responses: {
        200: { description: 'Master copier stats retrieved' },
        404: { description: 'Master not found or not approved' },
      },
    },
  },
};
