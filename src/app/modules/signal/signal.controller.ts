import catchAsync from "../../utils/catch_async";
import manageResponse from "../../utils/manage_response";
import { signal_services } from "./signal.service";
import httpStatus from "http-status";

const create_signal = catchAsync(async (req, res) => {
  const accountId = req.user!.userId;
  const result = await signal_services.create_signal(accountId, req.body);

  manageResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: "Signal created successfully",
    data: result,
  });
});

const create_signal_from_json = catchAsync(async (req, res) => {
  const accountId = req.user!.userId;
  const result = await signal_services.create_signal_from_json(accountId, req.body);

  manageResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: "Signal created from JSON successfully",
    data: result,
  });
});

const create_signal_from_loose_json = catchAsync(async (req, res) => {
  const accountId = req.user!.userId;
  const result = await signal_services.create_signal_from_loose_json(
    accountId,
    req.body,
  );

  manageResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: "Signal created from JSON with AI extraction",
    data: result,
  });
});

const update_signal = catchAsync(async (req, res) => {
  const accountId = req.user!.userId;
  const result = await signal_services.update_signal(
    accountId,
    req.params.id as string,
    req.body,
  );

  manageResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Signal updated successfully",
    data: result,
  });
});

const delete_signal = catchAsync(async (req, res) => {
  const accountId = req.user!.userId;
  const result = await signal_services.delete_signal(
    accountId,
    req.params.id as string,
  );

  manageResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result.message,
    data: null,
  });
});

const get_all_signals = catchAsync(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;

  const filters: Record<string, unknown> = {};
  if (req.query.search) filters.search = req.query.search;
  if (req.query.assetType) filters.assetType = req.query.assetType;
  if (req.query.signalType) filters.signalType = req.query.signalType;
  if (req.query.status) filters.status = req.query.status;
  if (req.query.isPremium !== undefined)
    filters.isPremium = req.query.isPremium === "true";
  if (req.query.authorId) filters.authorId = req.query.authorId as string;
  if (req.query.symbol) filters.symbol = req.query.symbol as string;
  if (req.query.sortBy) filters.sortBy = req.query.sortBy as string;

  const viewerAccountId = req.user?.userId;
  const result = await signal_services.get_signals(page, limit, filters, viewerAccountId);

  manageResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Signals retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const get_single_signal = catchAsync(async (req, res) => {
  const viewerAccountId = req.user?.userId;
  const result = await signal_services.get_signal_by_id(
    req.params.id as string,
    false,
    viewerAccountId,
  );

  manageResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Signal retrieved successfully",
    data: result,
  });
});

const get_my_signals = catchAsync(async (req, res) => {
  const accountId = req.user!.userId;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const { status, assetType, signalType, isPremium, search } = req.query;

  const result = await signal_services.get_my_signals(accountId, page, limit, {
    status: status as string,
    assetType: assetType as string,
    signalType: signalType as string,
    isPremium: isPremium !== undefined ? isPremium === "true" : undefined,
    search: search as string,
  });

  manageResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "My signals retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const toggle_featured = catchAsync(async (req, res) => {
  const result = await signal_services.toggle_featured_signal(
    req.params.id as string,
    req.body.isFeatured,
  );

  manageResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result.isFeatured ? "Signal featured" : "Signal unfeatured",
    data: result,
  });
});

const like_signal = catchAsync(async (req, res) => {
  const accountId = req.user!.userId;
  const result = await signal_services.like_signal(
    accountId,
    req.params.id as string,
  );

  manageResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result.message,
    data: {
      isLiked: result.isLiked,
      likeCount: result.likeCount,
    },
  });
});

const unlike_signal = catchAsync(async (req, res) => {
  const accountId = req.user!.userId;
  const result = await signal_services.unlike_signal(
    accountId,
    req.params.id as string,
  );

  manageResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result.message,
    data: {
      isLiked: result.isLiked,
      likeCount: result.likeCount,
    },
  });
});

const bookmark_signal = catchAsync(async (req, res) => {
  const accountId = req.user!.userId;
  const result = await signal_services.bookmark_signal(
    accountId,
    req.params.id as string,
  );

  manageResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result.message,
    data: {
      isBookmarked: result.isBookmarked,
      bookmarkCount: result.bookmarkCount,
    },
  });
});

const unbookmark_signal = catchAsync(async (req, res) => {
  const accountId = req.user!.userId;
  const result = await signal_services.unbookmark_signal(
    accountId,
    req.params.id as string,
  );

  manageResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result.message,
    data: {
      isBookmarked: result.isBookmarked,
      bookmarkCount: result.bookmarkCount,
    },
  });
});

const share_signal = catchAsync(async (req, res) => {
  const accountId = req.user!.userId;
  const result = await signal_services.share_signal(
    accountId,
    req.params.id as string,
  );

  manageResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result.message,
    data: null,
  });
});

const get_review_queue = catchAsync(async (req, res) => {
  const accountId = req.user!.userId;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const result = await signal_services.get_review_queue(accountId, page, limit);

  manageResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Review queue retrieved",
    data: result.data,
    meta: result.meta,
  });
});

const confirm_signal = catchAsync(async (req, res) => {
  const accountId = req.user!.userId;
  const result = await signal_services.confirm_signal(
    accountId,
    req.params.id as string,
  );

  manageResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Signal confirmed and published",
    data: result,
  });
});

const reject_signal = catchAsync(async (req, res) => {
  const accountId = req.user!.userId;
  const result = await signal_services.reject_signal(
    accountId,
    req.params.id as string,
    req.body.rejectionReason,
  );

  manageResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Signal rejected",
    data: result,
  });
});

const resubmit_ai_validation = catchAsync(async (req, res) => {
  const accountId = req.user!.userId;
  const result = await signal_services.resubmit_ai_validation(
    accountId,
    req.params.id as string,
  );

  manageResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Signal resubmitted for AI validation",
    data: result,
  });
});

const ai_assist_signal = catchAsync(async (req, res) => {
  const accountId = req.user!.userId;
  const result = await signal_services.ai_assist_signal(
    accountId,
    req.params.id as string,
  );

  manageResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "AI assist generated",
    data: result,
  });
});

export const signal_controllers = {
  create_signal,
  create_signal_from_json,
  create_signal_from_loose_json,
  update_signal,
  delete_signal,
  get_all_signals,
  get_single_signal,
  get_my_signals,
  get_review_queue,
  confirm_signal,
  reject_signal,
  resubmit_ai_validation,
  ai_assist_signal,
  toggle_featured,
  like_signal,
  unlike_signal,
  bookmark_signal,
  unbookmark_signal,
  share_signal,
};
