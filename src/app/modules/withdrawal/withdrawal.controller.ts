import { Request, Response } from "express";
import manageResponse from "../../utils/manage_response";
import httpStatus from "http-status";
import { withdrawal_services } from "./withdrawal.service";
import catch_async from "../../utils/catch_async";

const create_withdrawal_request = catch_async(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const result = await withdrawal_services.create_withdrawal_request_in_db(
      userId as string,
      req.body,
    );

    manageResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Withdrawal request created successfully",
      data: result,
    });
  },
);

const get_my_withdrawals = catch_async(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const result = await withdrawal_services.get_my_withdrawals_from_db(
    userId as string,
    req.query,
  );

  manageResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Your withdrawal requests fetched successfully",
    data: result.data,
    meta: {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
    },
  });
});

const get_all_withdrawals = catch_async(async (req: Request, res: Response) => {
  const result = await withdrawal_services.get_all_withdrawals_from_db(
    req.query,
  );

  manageResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "All withdrawal requests fetched successfully",
    data: result.data,
    meta: {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
    },
  });
});

const update_withdrawal_status = catch_async(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await withdrawal_services.update_withdrawal_status_in_db(
      id as string,
      req.body,
    );

    manageResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: `Withdrawal request ${req.body.status.toLowerCase()} successfully`,
      data: result,
    });
  },
);

export const withdrawal_controllers = {
  create_withdrawal_request,
  get_my_withdrawals,
  get_all_withdrawals,
  update_withdrawal_status,
};
