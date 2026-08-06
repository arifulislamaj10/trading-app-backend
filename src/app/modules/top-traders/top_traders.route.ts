import { Router } from "express";
import { top_traders_controllers } from "./top_traders.controller";
import { optionalAuth } from "../../middlewares/auth";

const topTradersRouter = Router();

// Public routes — anyone can view top traders
// Use optionalAuth to check follow status for logged-in users
topTradersRouter.get(
  "/",
  optionalAuth,
  top_traders_controllers.get_top_traders,
);
topTradersRouter.get(
  "/performance/:accountId",
  optionalAuth,
  top_traders_controllers.get_trader_performance,
);
topTradersRouter.get(
  "/compare/:accountId1/:accountId2",
  top_traders_controllers.compare_traders,
);

export default topTradersRouter;
