import { z } from 'zod';

const youtubeUrlSchema = z
  .string()
  .url('youtubeUrl must be a valid URL')
  .refine(
    (url) =>
      /youtube\.com\/watch\?v=/.test(url) ||
      /youtu\.be\//.test(url) ||
      /youtube\.com\/embed\//.test(url) ||
      /youtube\.com\/shorts\//.test(url),
    'youtubeUrl must be a YouTube URL'
  );

export const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(100),
  sortOrder: z.coerce.number().int().optional(),
  isActive: z.boolean().optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  sortOrder: z.coerce.number().int().optional(),
  isActive: z.boolean().optional(),
});

export const createVideoSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(5000).optional().or(z.literal('')),
  youtubeUrl: youtubeUrlSchema,
  thumbnailUrl: z.string().url().nullable().optional().or(z.literal('')),
  categoryId: z.string().min(1),
  durationSeconds: z.coerce.number().int().positive().nullable().optional(),
  isActive: z.boolean().optional(),
});

export const updateVideoSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(5000).optional().or(z.literal('')),
  youtubeUrl: youtubeUrlSchema.optional(),
  thumbnailUrl: z.string().url().nullable().optional().or(z.literal('')),
  categoryId: z.string().min(1).optional(),
  durationSeconds: z.coerce.number().int().positive().nullable().optional(),
  isActive: z.boolean().optional(),
});

export const academy_validations = {
  createCategorySchema,
  updateCategorySchema,
  createVideoSchema,
  updateVideoSchema,
};
