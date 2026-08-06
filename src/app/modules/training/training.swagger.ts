export const trainingSwaggerDocs = {
  "/api/v1/training": {
    get: {
      tags: ["Training"],
      summary: "Get training curriculum and user progress",
      security: [{ bearerAuth: [] }],
      responses: {
        200: { description: "Training progress" },
        401: { description: "Unauthorized" },
      },
    },
  },
  "/api/v1/training/lessons/complete-all": {
    post: {
      tags: ["Training"],
      summary: "Mark all training lessons complete",
      description:
        "One-step helper before POST /training/complete (e.g. Swagger testing).",
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: "All lessons completed" } },
    },
  },
  "/api/v1/training/lessons/{lessonId}/complete": {
    post: {
      tags: ["Training"],
      summary: "Mark a training lesson as complete",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "lessonId",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      responses: {
        200: { description: "Lesson completed" },
        404: { description: "Lesson not found" },
      },
    },
  },
  "/api/v1/training/complete": {
    post: {
      tags: ["Training"],
      summary: "Complete training (final quiz)",
      description:
        "Pass the final quiz (default 70% if quizScore omitted). All lessons must be done first, or send markAllLessonsComplete: true. Empty body is valid.",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: false,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                quizScore: {
                  type: "number",
                  minimum: 0,
                  maximum: 100,
                  example: 80,
                },
                markAllLessonsComplete: {
                  type: "boolean",
                  example: true,
                  description: "Mark every lesson complete in one request",
                },
              },
            },
          },
        },
      },
      responses: {
        200: { description: "Training completed, trading unlocked" },
        400: { description: "Lessons incomplete or quiz failed" },
      },
    },
  },
};
