import { Router } from "express";
import { admin_controllers } from "./admin.controller";
import auth from "../../middlewares/auth";
import RequestValidator from "../../middlewares/request_validator";
import { admin_validations } from "./admin.validation";
import { academyAdminRouter } from "../academy/academy.route";

const adminRouter = Router();

// All admin routes require ADMIN role
adminRouter.use(auth("ADMIN"));

// Academy admin CRUD at /admin/academy (inherits ADMIN auth above)
adminRouter.use("/academy", academyAdminRouter);

adminRouter.get("/analytics", admin_controllers.get_platform_analytics);
adminRouter.post(
  "/broadcast",
  RequestValidator(admin_validations.broadcast_announcement),
  admin_controllers.broadcast_announcement,
);
adminRouter.patch("/change-role", admin_controllers.change_user_role);
adminRouter.get("/payments", admin_controllers.get_all_payments);
adminRouter.patch(
  "/plans/:id",
  RequestValidator(admin_validations.update_subscription_plan),
  admin_controllers.update_subscription_plan,
);
adminRouter.get("/subscribers", admin_controllers.get_all_subscribers);
adminRouter.get("/referrals/stats", admin_controllers.get_referral_stats);
adminRouter.get("/referrals", admin_controllers.get_all_referrals);
adminRouter.get("/referrals/:id", admin_controllers.get_user_referrals);

export default adminRouter;
