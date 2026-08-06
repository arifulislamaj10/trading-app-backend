import { Request, Response } from "express";
import catchAsync from "../../utils/catch_async";
import { top_traders_services } from "./top_traders.service";
import { AppError } from "../../utils/app_error";
import httpStatus from "http-status";
import manageResponse from "../../utils/manage_response";

const get_top_traders = catchAsync(async (req: Request, res: Response) => {
  const timeframe = (req.query.timeframe as "week" | "month" | "all") || "all";
  const sortBy =
    (req.query.sortBy as
      | "winRate"
      | "avgPnl"
      | "totalSignals"
      | "followerCount") || "winRate";
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 10, 100);
  const currentUserId = req.user?.userId;

  const result = await top_traders_services.get_top_traders(
    timeframe,
    sortBy,
    page,
    limit,
    currentUserId,
  );

  manageResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Top traders retrieved successfully",
    data: result,
  });
});

const get_trader_performance = catchAsync(
  async (req: Request, res: Response) => {
    const accountId = req.params.accountId as string;
    const currentUserId = req.user?.userId;

    if (!accountId) {
      throw new AppError("Account ID is required", httpStatus.BAD_REQUEST);
    }

    const result = await top_traders_services.get_trader_performance(
      accountId,
      currentUserId,
    );

    if (!result) {
      throw new AppError(
        "Trader not found or not approved",
        httpStatus.NOT_FOUND,
      );
    }

    manageResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Trader performance retrieved successfully",
      data: result,
    });
  },
);

const compare_traders = catchAsync(async (req: Request, res: Response) => {
  const accountId1 = req.params.accountId1 as string;
  const accountId2 = req.params.accountId2 as string;

  if (!accountId1 || !accountId2) {
    throw new AppError("Both account IDs are required", httpStatus.BAD_REQUEST);
  }

  const result = await top_traders_services.compare_traders(
    accountId1,
    accountId2,
  );

  if (!result) {
    throw new AppError("One or both traders not found", httpStatus.NOT_FOUND);
  }

  manageResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Trader comparison retrieved successfully",
    data: result,
  });
});

export const top_traders_controllers = {
  get_top_traders,
  get_trader_performance,
  compare_traders,
};
