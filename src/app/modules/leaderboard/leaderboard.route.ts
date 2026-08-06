import { Router } from "express";
import { leaderboard_controllers } from "./leaderboard.controller";

const leaderboardRouter = Router();

// Public routes — anyone can view leaderboard
// Stats are embedded in the main response under `stats` field
leaderboardRouter.get("/", leaderboard_controllers.get_leaderboard);
leaderboardRouter.get(
  "/rank/:accountId",
  leaderboard_controllers.get_user_rank,
);

export default leaderboardRouter;
