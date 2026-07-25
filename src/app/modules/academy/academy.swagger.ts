export const academySwaggerDocs = {
  '/api/v1/academy/categories': {
    get: {
      tags: ['Academy'],
      summary: 'List active academy categories',
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: 'Active categories' } },
    },
  },
  '/api/v1/academy/videos': {
    get: {
      tags: ['Academy'],
      summary: 'List active academy videos',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'categoryId',
          in: 'query',
          required: false,
          schema: { type: 'string' },
        },
      ],
      responses: { 200: { description: 'Active videos' } },
    },
  },
  '/api/v1/admin/academy/categories': {
    get: {
      tags: ['Admin Academy'],
      summary: 'List all academy categories (including inactive)',
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: 'Categories' } },
    },
    post: {
      tags: ['Admin Academy'],
      summary: 'Create academy category',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['name'],
              properties: {
                name: { type: 'string', example: 'Forex' },
                sortOrder: { type: 'number', example: 1 },
                isActive: { type: 'boolean', example: true },
              },
            },
          },
        },
      },
      responses: { 201: { description: 'Category created' } },
    },
  },
  '/api/v1/admin/academy/categories/{id}': {
    patch: {
      tags: ['Admin Academy'],
      summary: 'Update academy category',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: { 200: { description: 'Category updated' } },
    },
    delete: {
      tags: ['Admin Academy'],
      summary: 'Soft-delete academy category (isActive=false)',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: { 200: { description: 'Category deactivated' } },
    },
  },
  '/api/v1/admin/academy/videos': {
    get: {
      tags: ['Admin Academy'],
      summary: 'List all academy videos (including inactive)',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'categoryId',
          in: 'query',
          required: false,
          schema: { type: 'string' },
        },
      ],
      responses: { 200: { description: 'Videos' } },
    },
    post: {
      tags: ['Admin Academy'],
      summary: 'Create academy video',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['title', 'youtubeUrl', 'categoryId'],
              properties: {
                title: { type: 'string' },
                description: { type: 'string' },
                youtubeUrl: {
                  type: 'string',
                  example: 'https://www.youtube.com/watch?v=XXXXXXXXXXX',
                },
                thumbnailUrl: { type: 'string', nullable: true },
                categoryId: { type: 'string' },
                durationSeconds: { type: 'number', nullable: true },
                isActive: { type: 'boolean' },
              },
            },
          },
        },
      },
      responses: { 201: { description: 'Video created' } },
    },
  },
  '/api/v1/admin/academy/videos/{id}': {
    patch: {
      tags: ['Admin Academy'],
      summary: 'Update academy video',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: { 200: { description: 'Video updated' } },
    },
    delete: {
      tags: ['Admin Academy'],
      summary: 'Soft-delete academy video (isActive=false)',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: { 200: { description: 'Video deactivated' } },
    },
  },
};
