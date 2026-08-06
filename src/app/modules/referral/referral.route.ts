import { Router } from "express";
import auth from "../../middlewares/auth";
import { UserRole } from "../../types/role";
import { referral_controllers } from "./referral.controller";

const router = Router();

router.get(
  "/stats",
  auth(UserRole.ADMIN, UserRole.MASTER, UserRole.USER),
  referral_controllers.get_referral_stats,
);

router.get(
  "/history",
  auth(UserRole.ADMIN, UserRole.MASTER, UserRole.USER),
  referral_controllers.get_referral_history,
);

export const referral_routes = router;
