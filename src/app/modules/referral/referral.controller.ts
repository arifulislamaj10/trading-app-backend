import { Request, Response } from "express";
import manageResponse from "../../utils/manage_response";
import httpStatus from "http-status";
import { referral_services } from "./referral.service";
import catch_async from "../../utils/catch_async";

const get_referral_stats = catch_async(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const result = await referral_services.get_referral_stats_from_db(
    userId as any,
  );

  manageResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Referral stats fetched successfully",
    data: result,
  });
});

const get_referral_history = catch_async(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const result = await referral_services.get_referral_history_from_db(
      userId as any,
      req.query,
    );

    manageResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Referral history fetched successfully",
      data: result.data,
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  },
);

export const referral_controllers = {
  get_referral_stats,
  get_referral_history,
};
