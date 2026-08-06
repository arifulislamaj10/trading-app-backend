import catchAsync from "../../utils/catch_async";
import manageResponse from "../../utils/manage_response";
import { follow_services } from "./follow.service";
import httpStatus from "http-status";

const toggle_follow = catchAsync(async (req, res) => {
  const followerId = req.user!.userId;
  const result = await follow_services.toggle_follow(
    followerId,
    req.params.id as string,
  );

  manageResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result.message,
    data: { action: result.action },
  });
});

const get_following = catchAsync(async (req, res) => {
  const followerId = req.user!.userId;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;

  const result = await follow_services.get_following(followerId, page, limit);

  manageResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Following list retrieved",
    data: result.data,
    meta: result.meta,
  });
});

const get_followers = catchAsync(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;

  const result = await follow_services.get_followers(
    req.params.id as string,
    page,
    limit,
  );

  manageResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Followers list retrieved",
    data: result.data,
    meta: result.meta,
  });
});

const check_follow_status = catchAsync(async (req, res) => {
  const followerId = req.user!.userId;
  const result = await follow_services.is_following(
    followerId,
    req.params.id as string,
  );

  manageResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Follow status retrieved",
    data: result,
  });
});

export const follow_controllers = {
  toggle_follow,
  get_following,
  get_followers,
  check_follow_status,
};
