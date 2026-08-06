import { Router } from "express";
import auth from "../../middlewares/auth";
import { wallet_transaction_controllers } from "./wallet_transaction.controller";

const router = Router();

router.get(
  "/history",
  auth("USER", "ADMIN", "MASTER"),
  wallet_transaction_controllers.get_my_transactions,
);

export const wallet_transaction_routes = router;
