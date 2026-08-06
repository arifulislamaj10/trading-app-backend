import { Request, Response } from "express";
import catchAsync from "../../utils/catch_async";
import { leaderboard_services } from "./leaderboard.service";
import { AppError } from "../../utils/app_error";
import httpStatus from "http-status";
import manageResponse from "../../utils/manage_response";

const get_leaderboard = catchAsync(async (req: Request, res: Response) => {
  const timeframe = (req.query.timeframe as "week" | "month" | "all") || "all";
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 10, 100);

  const result = await leaderboard_services.get_leaderboard(
    timeframe,
    page,
    limit,
  );

  manageResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Leaderboard retrieved successfully",
    data: result,
  });
});

const get_user_rank = catchAsync(async (req: Request, res: Response) => {
  const accountId = req.params.accountId as string;

  if (!accountId) {
    throw new AppError("Account ID is required", httpStatus.BAD_REQUEST);
  }

  const result = await leaderboard_services.get_user_rank(accountId);

  manageResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "User rank retrieved successfully",
    data: result,
  });
});

export const leaderboard_controllers = {
  get_leaderboard,
  get_user_rank,
};
