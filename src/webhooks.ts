import { Router } from "express";
import express from "express";
import { handleStripeWebhook } from "./app/modules/subscription/stripe.webhook";

const webhookRouter = Router();

// Stripe webhook needs raw body for signature verification
webhookRouter.post(
  "/stripe",
  express.raw({ type: "application/json" }),
  handleStripeWebhook,
);

export default webhookRouter;
