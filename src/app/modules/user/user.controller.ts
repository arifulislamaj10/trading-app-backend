import catchAsync from "../../utils/catch_async";
import manageResponse from "../../utils/manage_response";
import { user_services } from "./user.service";
import httpStatus from "http-status";
import { AppError } from "../../utils/app_error";

const update_profile = catchAsync(async (req, res) => {
  const result = await user_services.update_profile_into_db(req);
  manageResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Profile update successful.",
    data: result,
  });
});

const get_all_users = catchAsync(async (req, res) => {
  const result = await user_services.get_all_users_from_db(req.query);

  manageResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Users retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const get_single_user = catchAsync(async (req, res) => {
  const { id } = req.params;

  const result = await user_services.get_single_user_from_db(id as string);

  manageResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "User details retrieved successfully",
    data: result,
  });
});

const update_user_status = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    manageResponse(res, {
      success: false,
      statusCode: httpStatus.BAD_REQUEST,
      message: "Status is required in request body. Use 'ACTIVE', 'INACTIVE', or 'SUSPENDED'",
      data: null,
    });
    return;
  }

  const result = await user_services.update_user_status(id as string, status);

  manageResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: `User status updated to ${result.status}`,
    data: result,
  });
});

const delete_user = catchAsync(async (req, res) => {
  const { id } = req.params;

  const result = await user_services.soft_delete_user(id as string);

  manageResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result.message,
    data: null,
  });
});

const sync_timezone = catchAsync(async (req, res) => {
  const email = req.user?.email;
  if (!email) {
    throw new AppError('User email not found', httpStatus.UNAUTHORIZED);
  }

  const result = await user_services.sync_timezone_to_profile(email, req.body.timezone);

  manageResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Timezone synced successfully',
    data: result,
  });
});

export const user_controllers = {
  update_profile,
  sync_timezone,
  get_all_users,
  get_single_user,
  update_user_status,
  delete_user,
};
