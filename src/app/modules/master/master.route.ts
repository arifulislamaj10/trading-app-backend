import { Router } from "express";
import { master_controllers } from "./master.controller";
import { master_validations } from "./master.validation";
import auth, { optionalAuth } from "../../middlewares/auth";
import RequestValidator from "../../middlewares/request_validator";

const masterRouter = Router();

// Public routes - view masters list
masterRouter.get("/", optionalAuth, master_controllers.get_all_masters);

// Master-only routes (defined before parameterized :id to avoid conflicts)
masterRouter.get(
  "/profile/me",
  auth("MASTER"),
  master_controllers.get_my_profile,
);
masterRouter.get("/stats", auth("MASTER"), master_controllers.get_my_stats);
masterRouter.get(
  "/analytics",
  auth("MASTER"),
  master_controllers.get_my_analytics,
);
masterRouter.patch(
  "/profile",
  auth("MASTER"),
  RequestValidator(master_validations.masterProfileSchema),
  master_controllers.create_or_update_profile,
);

// Public route - single master
masterRouter.get("/:id", optionalAuth, master_controllers.get_single_master);

// Admin-only routes
masterRouter.patch(
  "/featured/:id",
  auth("ADMIN"),
  master_controllers.toggle_featured,
);

masterRouter.delete(
  "/:id",
  auth("ADMIN"),
  RequestValidator(master_validations.delete_account_confirmation),
  master_controllers.delete_master,
);

export default masterRouter;
