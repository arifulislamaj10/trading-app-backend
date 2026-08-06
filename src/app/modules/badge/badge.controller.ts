import { Request, Response } from "express";
import httpStatus from "http-status";
import catch_async from "../../utils/catch_async";
import manageResponse from "../../utils/manage_response";
import { badge_services } from "./badge.service";

const get_badges = catch_async(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const result = await badge_services.get_badges_for_account(userId);

  manageResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Badges fetched successfully",
    data: result,
  });
});

const get_earned_badges = catch_async(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const result = await badge_services.get_earned_badges(userId);

  manageResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Earned badges fetched successfully",
    data: result,
  });
});

const get_badge_summary = catch_async(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const result = await badge_services.get_badge_summary(userId);

  manageResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Badge summary fetched successfully",
    data: result,
  });
});

export const badge_controllers = {
  get_badges,
  get_earned_badges,
  get_badge_summary,
};
