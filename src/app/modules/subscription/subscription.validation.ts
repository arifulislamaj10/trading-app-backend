import { z } from "zod";

const create_checkout = z.object({
  planId: z.string({ required_error: "Plan ID is required" }).min(1),
  returnUrl: z.string().url().optional(),
});

const cancel_subscription = z.object({}).optional();

const resume_subscription = z.object({}).optional();

const upgrade_subscription = z.object({
  planId: z.string({ required_error: "Plan ID is required" }).min(1),
});

const downgrade_subscription = z.object({
  planId: z.string({ required_error: "Plan ID is required" }).min(1),
});

const create_billing_portal = z.object({
  returnUrl: z.string().url().optional(),
});

const get_payment_history = z.object({
  page: z
    .string()
    .optional()
    .refine(
      (val) => !val || (Number.isInteger(Number(val)) && Number(val) > 0),
      { message: "Page must be a positive integer" },
    ),
  limit: z
    .string()
    .optional()
    .refine(
      (val) =>
        !val ||
        (Number.isInteger(Number(val)) &&
          Number(val) > 0 &&
          Number(val) <= 100),
      { message: "Limit must be a positive integer between 1 and 100" },
    ),
});

export const subscription_validations = {
  create_checkout,
  cancel_subscription,
  resume_subscription,
  upgrade_subscription,
  downgrade_subscription,
  create_billing_portal,
  get_payment_history,
};
