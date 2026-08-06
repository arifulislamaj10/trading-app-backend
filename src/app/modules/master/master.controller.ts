import catchAsync from "../../utils/catch_async";
import manageResponse from "../../utils/manage_response";
import { master_services } from "./master.service";
import httpStatus from "http-status";

const create_or_update_profile = catchAsync(async (req, res) => {
  const accountId = req.user!.userId;
  const result = await master_services.create_or_update_master_profile(
    accountId,
    req.body,
  );

  manageResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Master profile saved successfully",
    data: result,
  });
});

const get_my_profile = catchAsync(async (req, res) => {
  const accountId = req.user!.userId;
  const result = await master_services.get_master_profile(accountId);

  manageResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Master profile retrieved",
    data: result,
  });
});

const get_all_masters = catchAsync(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const currentUserId = req.user?.userId;
  const filters: { isFeatured?: boolean; search?: string } = {};

  if (req.query.isFeatured !== undefined) {
    filters.isFeatured = req.query.isFeatured === "true";
  }

  if (req.query.search && typeof req.query.search === "string") {
    filters.search = req.query.search;
  }

  const result = await master_services.get_all_masters(
    page,
    limit,
    filters,
    currentUserId,
  );

  manageResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Masters retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const get_single_master = catchAsync(async (req, res) => {
  const currentUserId = req.user?.userId;
  const result = await master_services.get_master_by_id(
    req.params.id as string,
    currentUserId,
  );

  manageResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Master details retrieved",
    data: result,
  });
});

const toggle_featured = catchAsync(async (req, res) => {
  const result = await master_services.toggle_featured(
    req.params.id as string,
    req.body.isFeatured,
  );

  manageResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result.isFeatured ? "Master featured" : "Master unfeatured",
    data: result,
  });
});

const get_my_stats = catchAsync(async (req, res) => {
  const accountId = req.user!.userId;
  const result = await master_services.get_master_stats(accountId);

  manageResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Master stats retrieved",
    data: result,
  });
});

const get_my_analytics = catchAsync(async (req, res) => {
  const accountId = req.user!.userId;
  const result = await master_services.get_master_analytics(accountId);

  manageResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Master detailed analytics retrieved",
    data: result,
  });
});

const delete_master = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await master_services.delete_master(id as string);

  manageResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result.message,
    data: null,
  });
});

export const master_controllers = {
  create_or_update_profile,
  get_my_profile,
  get_all_masters,
  get_single_master,
  toggle_featured,
  get_my_stats,
  get_my_analytics,
  delete_master,
};
