import { z } from "zod";

const isValidTimezone = (tz: string) => {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

const update_user = z.object({
  name: z.string().optional(),
  userProfileUrl: z
    .string()
    .url("Must be a valid URL")
    .optional()
    .or(z.literal("")),
  referralCode: z
    .string()
    .min(3, "Referral code must be at least 3 characters")
    .max(20, "Referral code cannot exceed 20 characters")
    .regex(
      /^[A-Z0-9_]+$/,
      "Referral code can only contain uppercase letters, numbers, and underscores",
    )
    .optional(),
  timezone: z
    .string()
    .refine(isValidTimezone, "Invalid IANA timezone")
    .optional(),
});

const sync_timezone = z.object({
  timezone: z.string().refine(isValidTimezone, "Invalid IANA timezone"),
});

/** Require exact typed confirmation before permanent/soft account deletion. */
const delete_account_confirmation = z.object({
  confirmation: z.literal("DELETE", {
    errorMap: () => ({ message: "Type DELETE to confirm account deletion" }),
  }),
});

export const user_validations = {
  update_user,
  sync_timezone,
  delete_account_confirmation,
};
