import { AppError } from "../../utils/app_error";
import httpStatus from "http-status";
import { Comment_Model } from "./comment.schema";
import { Signal_Model } from "./signal.schema";
import { contribution_services } from "../contribution/contribution.service";
import { Types } from "mongoose";

/**
 * Create a new comment on a signal
 */
const create_comment = async (
  userId: string,
  data: { signalId: string; message: string },
) => {
  // 1. Check if signal exists
  const signal = await Signal_Model.findById(data.signalId);
  if (!signal) {
    throw new AppError("Signal not found", httpStatus.NOT_FOUND);
  }

  // 2. Create the comment
  const comment = await Comment_Model.create({
    userId: new Types.ObjectId(userId),
    signalId: new Types.ObjectId(data.signalId),
    message: data.message,
  });

  // 3. Atomically increment comment count on Signal
  await Signal_Model.findByIdAndUpdate(data.signalId, {
    $inc: { commentCount: 1 },
  });

  // 4. Track contribution (engagement points)
  contribution_services.track_contribution(
    userId,
    "comment",
    comment._id.toString(),
  );

  return comment;
};

/**
 * Get paginated comments for a specific signal
 */
const get_comments_by_signal = async (
  signalId: string,
  page: number = 1,
  limit: number = 10,
) => {
  const skip = (page - 1) * limit;

  const comments = await Comment_Model.find({ signalId, isDeleted: false })
    .populate({
      path: "userId",
      select: "name userProfileUrl",
    })
    .sort({ createdAt: -1 }) // Latest first
    .skip(skip)
    .limit(limit);

  const total = await Comment_Model.countDocuments({
    signalId,
    isDeleted: false,
  });

  return {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    data: comments,
  };
};

export const comment_services = {
  create_comment,
  get_comments_by_signal,
};
