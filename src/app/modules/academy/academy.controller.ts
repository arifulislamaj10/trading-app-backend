import httpStatus from "http-status";
import catchAsync from "../../utils/catch_async";
import manageResponse from "../../utils/manage_response";
import { academy_services } from "./academy.service";

const get_categories = catchAsync(async (_req, res) => {
  const result = await academy_services.get_categories(false);
  manageResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Academy categories retrieved",
    data: result,
  });
});

const get_videos = catchAsync(async (req, res) => {
  const categoryId =
    typeof req.query.categoryId === "string" ? req.query.categoryId : undefined;
  const result = await academy_services.get_videos(categoryId, false);
  manageResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Academy videos retrieved",
    data: result,
  });
});

const admin_get_categories = catchAsync(async (_req, res) => {
  const result = await academy_services.get_categories(true);
  manageResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Academy categories retrieved",
    data: result,
  });
});

const admin_get_videos = catchAsync(async (req, res) => {
  const categoryId =
    typeof req.query.categoryId === "string" ? req.query.categoryId : undefined;
  const result = await academy_services.get_videos(categoryId, true);
  manageResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Academy videos retrieved",
    data: result,
  });
});

const create_category = catchAsync(async (req, res) => {
  const result = await academy_services.create_category(req.body);
  manageResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: "Academy category created",
    data: result,
  });
});

const update_category = catchAsync(async (req, res) => {
  const result = await academy_services.update_category(
    req.params.id as string,
    req.body,
  );
  manageResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Academy category updated",
    data: result,
  });
});

const delete_category = catchAsync(async (req, res) => {
  const result = await academy_services.delete_category(
    req.params.id as string,
  );
  manageResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Academy category deactivated",
    data: result,
  });
});

const create_video = catchAsync(async (req, res) => {
  const result = await academy_services.create_video(req.body);
  manageResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: "Academy video created",
    data: result,
  });
});

const update_video = catchAsync(async (req, res) => {
  const result = await academy_services.update_video(
    req.params.id as string,
    req.body,
  );
  manageResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Academy video updated",
    data: result,
  });
});

const delete_video = catchAsync(async (req, res) => {
  const result = await academy_services.delete_video(req.params.id as string);
  manageResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Academy video deactivated",
    data: result,
  });
});

export const academy_controllers = {
  get_categories,
  get_videos,
  admin_get_categories,
  admin_get_videos,
  create_category,
  update_category,
  delete_category,
  create_video,
  update_video,
  delete_video,
};
