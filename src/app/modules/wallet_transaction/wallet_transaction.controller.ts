import { Request, Response } from "express";
import manageResponse from "../../utils/manage_response";
import httpStatus from "http-status";
import { wallet_transaction_services } from "./wallet_transaction.service";
import catch_async from "../../utils/catch_async";

const get_my_transactions = catch_async(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const result = await wallet_transaction_services.get_my_transactions_from_db(
    userId as string,
    req.query,
  );

  manageResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Transaction history fetched successfully",
    data: result.data,
    meta: {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
    },
  });
});

export const wallet_transaction_controllers = {
  get_my_transactions,
};
