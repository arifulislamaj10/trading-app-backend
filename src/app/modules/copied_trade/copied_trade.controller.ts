import catchAsync from "../../utils/catch_async";
import manageResponse from "../../utils/manage_response";
import { copied_trade_services } from "./copied_trade.service";
import httpStatus from "http-status";
import { Request, Response } from "express";

const copy_signal = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const result = await copied_trade_services.copy_signal(
    userId,
    req.params.signalId as string,
  );

  manageResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: "Signal copied to your trade journal",
    data: result,
  });
});

const log_trade = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const result = await copied_trade_services.log_trade(userId, req.body);

  manageResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Trade result logged successfully",
    data: result,
  });
});

const get_trade_history = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;

  const filters: Record<string, string> = {};
  if (req.query.status) filters.status = req.query.status as string;
  if (req.query.outcome) filters.outcome = req.query.outcome as string;
  if (req.query.masterId) filters.masterId = req.query.masterId as string;
  if (req.query.assetType) filters.assetType = req.query.assetType as string;
  if (req.query.startDate) filters.startDate = req.query.startDate as string;
  if (req.query.endDate) filters.endDate = req.query.endDate as string;
  if (req.query.sortBy) filters.sortBy = req.query.sortBy as string;

  const result = await copied_trade_services.get_trade_history(
    userId,
    page,
    limit,
    filters,
  );

  manageResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Trade history retrieved",
    data: { trades: result.data, summary: result.summary },
    meta: result.meta,
  });
});

const get_trade_by_id = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const result = await copied_trade_services.get_trade_by_id(
    userId,
    req.params.id as string,
  );

  manageResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Trade detail retrieved",
    data: result,
  });
});

const delete_trade = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const result = await copied_trade_services.delete_trade(
    userId,
    req.params.id as string,
  );

  manageResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result.message,
  });
});

const cancel_copy = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const result = await copied_trade_services.cancel_copy(
    userId,
    req.params.id as string,
  );

  manageResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result.message,
  });
});

const get_signal_copiers = catchAsync(async (req: Request, res: Response) => {
  const masterId = req.user!.userId;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;

  const result = await copied_trade_services.get_signal_copiers(
    masterId,
    req.params.signalId as string,
    page,
    limit,
  );

  manageResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Signal copiers retrieved",
    data: { copiers: result.data, stats: result.stats },
    meta: result.meta,
  });
});

const get_master_copied_stats = catchAsync(
  async (req: Request, res: Response) => {
    const timeframe =
      (req.query.timeframe as "week" | "month" | "all") || "all";
    const result = await copied_trade_services.get_master_copied_stats(
      req.params.masterId as string,
      timeframe,
    );

    manageResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Master copier stats retrieved",
      data: result,
    });
  },
);

const get_signals_dashboard = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const timeframe =
      (req.query.timeframe as "week" | "month" | "all") || "all";
    const result = await copied_trade_services.get_signals_dashboard(
      userId,
      timeframe,
    );

    manageResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Signals dashboard retrieved",
      data: result,
    });
  },
);

export const copied_trade_controllers = {
  copy_signal,
  log_trade,
  get_trade_history,
  get_trade_by_id,
  delete_trade,
  cancel_copy,
  get_signal_copiers,
  get_master_copied_stats,
  get_signals_dashboard,
};
