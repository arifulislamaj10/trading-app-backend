import { user_controllers } from "./user.controller";
import { user_validations } from "./user.validation";
import auth from "../../middlewares/auth";
import RequestValidator from "../../middlewares/request_validator";
import { Router } from "express";

const userRoute = Router();

// Profile management (any authenticated user)
userRoute.patch(
  "/update-profile",
  auth("ADMIN", "USER", "MASTER"),
  RequestValidator(user_validations.update_user),
  user_controllers.update_profile,
);

userRoute.patch(
  "/sync-timezone",
  auth("ADMIN", "USER", "MASTER"),
  RequestValidator(user_validations.sync_timezone),
  user_controllers.sync_timezone,
);

// Admin-only routes
userRoute.get("/", auth("ADMIN"), user_controllers.get_all_users);
userRoute.get("/:id", auth("ADMIN"), user_controllers.get_single_user);
userRoute.patch("/status/:id", auth("ADMIN"), user_controllers.update_user_status);
userRoute.delete("/:id", auth("ADMIN"), user_controllers.delete_user);

export default userRoute;
