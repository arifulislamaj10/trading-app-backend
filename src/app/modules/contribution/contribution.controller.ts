import { Request, Response } from "express";
import catchAsync from "../../utils/catch_async";
import { contribution_services } from "./contribution.service";
import { AppError } from "../../utils/app_error";
import httpStatus from "http-status";
import manageResponse from "../../utils/manage_response";

const get_top_contributors = catchAsync(async (req: Request, res: Response) => {
  const timeframe = (req.query.timeframe as "week" | "month" | "all") || "week";
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 10, 100);

  const result = await contribution_services.get_top_contributors(
    timeframe,
    page,
    limit,
  );

  manageResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Top contributors retrieved successfully",
    data: result,
  });
});

const get_my_contributions = catchAsync(async (req: Request, res: Response) => {
  const accountId = req.user?.userId;
  if (!accountId) {
    throw new AppError("Authentication required", httpStatus.UNAUTHORIZED);
  }

  const timeframe = (req.query.timeframe as "week" | "month" | "all") || "week";

  const result = await contribution_services.get_my_contributions(
    accountId,
    timeframe,
  );

  manageResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Your contributions retrieved successfully",
    data: result,
  });
});

const get_user_contribution_stats = catchAsync(
  async (req: Request, res: Response) => {
    const accountId = req.params.accountId as string;

    if (!accountId) {
      throw new AppError("Account ID is required", httpStatus.BAD_REQUEST);
    }

    const result =
      await contribution_services.get_user_contribution_stats(accountId);

    manageResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "User contribution stats retrieved successfully",
      data: result,
    });
  },
);

export const contribution_controllers = {
  get_top_contributors,
  get_my_contributions,
  get_user_contribution_stats,
};
