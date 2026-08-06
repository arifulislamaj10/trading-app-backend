import { model, Schema } from "mongoose";

export interface IStripeWebhookEvent {
  eventId: string;
  eventType: string;
  processedAt: Date;
}

const stripeWebhookEventSchema = new Schema<IStripeWebhookEvent>(
  {
    eventId: { type: String, required: true, unique: true },
    eventType: { type: String, required: true },
    processedAt: { type: Date, default: Date.now },
  },
  { versionKey: false, timestamps: false },
);

stripeWebhookEventSchema.index(
  { processedAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 7 },
);

export const StripeWebhookEvent_Model = model<IStripeWebhookEvent>(
  "stripe_webhook_event",
  stripeWebhookEventSchema,
);
