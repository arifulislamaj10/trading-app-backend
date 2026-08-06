import { Router } from "express";
import { contribution_controllers } from "./contribution.controller";
import auth from "../../middlewares/auth";

const contributionRouter = Router();

// Public routes — anyone can view top contributors
contributionRouter.get(
  "/top-contributors",
  contribution_controllers.get_top_contributors,
);

// Authenticated routes
contributionRouter.get(
  "/my-contributions",
  auth("ADMIN", "USER", "MASTER"),
  contribution_controllers.get_my_contributions,
);

// Public — view any user's contribution stats
contributionRouter.get(
  "/stats/:accountId",
  contribution_controllers.get_user_contribution_stats,
);

export default contributionRouter;
