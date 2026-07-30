import { z } from 'zod';

const masterProfileSchema = z.object({
  bio: z.string().min(10, 'Bio must be at least 10 characters').max(2000).optional(),
  specialties: z.array(z.string()).max(10).optional(),
  yearsOfExperience: z.coerce.number().min(0).max(50).optional(),
});

/** Require exact typed confirmation before permanent master/account deletion. */
const delete_account_confirmation = z.object({
  confirmation: z.literal('DELETE', {
    errorMap: () => ({ message: 'Type DELETE to confirm account deletion' }),
  }),
});

export const master_validations = {
  masterProfileSchema,
  delete_account_confirmation,
};
