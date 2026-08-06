import catchAsync from "../../utils/catch_async";
import manageResponse from "../../utils/manage_response";
import { comment_services } from "./comment.service";
import httpStatus from "http-status";

const create_comment = catchAsync(async (req, res) => {
  const userId = req.user!.userId;
  const result = await comment_services.create_comment(userId, req.body);

  manageResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: "Comment posted successfully",
    data: result,
  });
});

const get_comments = catchAsync(async (req, res) => {
  const { signalId, page, limit } = req.query;
  const result = await comment_services.get_comments_by_signal(
    signalId as string,
    Number(page) || 1,
    Number(limit) || 10,
  );

  manageResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Comments retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

export const comment_controllers = {
  create_comment,
  get_comments,
};
