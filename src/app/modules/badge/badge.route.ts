import { Router } from "express";
import auth from "../../middlewares/auth";
import { UserRole } from "../../types/role";
import { badge_controllers } from "./badge.controller";

const badgeRouter = Router();

badgeRouter.use(auth(UserRole.USER, UserRole.MASTER, UserRole.ADMIN));

badgeRouter.get("/", badge_controllers.get_badges);
badgeRouter.get("/earned", badge_controllers.get_earned_badges);
badgeRouter.get("/summary", badge_controllers.get_badge_summary);

export default badgeRouter;
