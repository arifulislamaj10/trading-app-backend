import { z } from "zod";

const createCommentSchema = z.object({
  signalId: z.string({
    required_error: "Signal ID is required",
  }),
  message: z
    .string({
      required_error: "Message is required",
    })
    .min(1, "Message cannot be empty")
    .max(500, "Message cannot exceed 500 characters"),
});

const getCommentsSchema = z.object({
  signalId: z.string({
    required_error: "Signal ID is required in query parameters",
  }),
  page: z.string().optional(),
  limit: z.string().optional(),
});

export const comment_validations = {
  createCommentSchema,
  getCommentsSchema,
};
