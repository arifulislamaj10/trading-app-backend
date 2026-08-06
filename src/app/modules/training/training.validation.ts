import { z } from "zod";

export const completeTrainingSchema = z.object({
  quizScore: z.coerce.number().min(0).max(100).optional(),
  /** Swagger / testing: mark every lesson complete before running the quiz */
  markAllLessonsComplete: z.boolean().optional(),
});

export const training_validations = {
  completeTrainingSchema,
};
