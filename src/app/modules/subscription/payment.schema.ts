import { model, Schema } from "mongoose";

export interface IPayment {
  accountId: Schema.Types.ObjectId;
  subscriptionId: Schema.Types.ObjectId;
  stripePaymentIntentId: string;
  stripeInvoiceId: string;
  amount: number;
  currency: string;
  status: "succeeded" | "failed" | "pending" | "refunded";
  paymentMethod: string;
  description: string;
  invoiceUrl: string;
  refundedAt: Date | null;
  refundedAmount: number | null;
  metadata: Record<string, any>;
}

const paymentSchema = new Schema<IPayment>(
  {
    accountId: { type: Schema.Types.ObjectId, ref: "account", required: true },
    subscriptionId: {
      type: Schema.Types.ObjectId,
      ref: "subscription",
      required: true,
    },
    stripePaymentIntentId: { type: String, required: true }, // Indexed via schema.index() below
    stripeInvoiceId: { type: String },
    amount: { type: Number, required: true }, // In cents
    currency: { type: String, default: "usd" },
    status: {
      type: String,
      enum: ["succeeded", "failed", "pending", "refunded"],
      default: "pending",
    },
    paymentMethod: { type: String, default: "card" },
    description: { type: String, required: true },
    invoiceUrl: { type: String },
    refundedAt: { type: Date, default: null },
    refundedAmount: { type: Number, default: null },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  {
    versionKey: false,
    timestamps: true,
  },
);

// Indexes for optimized queries (defined here to avoid duplicate index warnings)
paymentSchema.index({ accountId: 1, status: 1 }); // Account payment history
paymentSchema.index({ stripePaymentIntentId: 1 }, { unique: true }); // Unique constraint
paymentSchema.index({ createdAt: -1 }); // For history queries

export const Payment_Model = model<IPayment>("payment", paymentSchema);
