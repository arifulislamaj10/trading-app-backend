import { Router } from "express";
import auth from "../../middlewares/auth";
import RequestValidator from "../../middlewares/request_validator";
import { system_config_controllers } from "./system_config.controller";
import { system_config_validations } from "./system_config.validation";

const router = Router();

router.get(
  "/",
  auth("ADMIN", "MASTER"),
  system_config_controllers.get_config
);

router.patch(
  "/referral-reward",
  auth("ADMIN", "MASTER"),
  RequestValidator(system_config_validations.update_referral_reward),
  system_config_controllers.update_referral_reward
);

router.patch(
  "/referral-rewards-by-tier",
  auth("ADMIN"),
  RequestValidator(system_config_validations.update_referral_rewards_by_tier),
  system_config_controllers.update_referral_rewards_by_tier
);

router.patch(
  "/referral-campaign-goal",
  auth("ADMIN"),
  RequestValidator(system_config_validations.update_referral_campaign_goal),
  system_config_controllers.update_referral_campaign_goal
);

export const system_config_routes = router;
