import httpStatus from "http-status";
import { Types } from "mongoose";
import { AppError } from "../../utils/app_error";
import { Academy_Category_Model, Academy_Video_Model } from "./academy.schema";

const get_categories = async (includeInactive = false) => {
  const query = includeInactive ? {} : { isActive: true };
  return Academy_Category_Model.find(query).sort({ sortOrder: 1, name: 1 });
};

const get_videos = async (categoryId?: string, includeInactive = false) => {
  const query: Record<string, unknown> = includeInactive
    ? {}
    : { isActive: true };

  if (categoryId) {
    if (!Types.ObjectId.isValid(categoryId)) {
      throw new AppError("Invalid category ID", httpStatus.BAD_REQUEST);
    }
    query.categoryId = new Types.ObjectId(categoryId);
  }

  return Academy_Video_Model.find(query).sort({ createdAt: -1 });
};

const create_category = async (data: {
  name: string;
  sortOrder?: number;
  isActive?: boolean;
}) => {
  try {
    return await Academy_Category_Model.create({
      name: data.name,
      sortOrder: data.sortOrder ?? 0,
      isActive: data.isActive ?? true,
    });
  } catch (error: any) {
    if (error?.code === 11000) {
      throw new AppError("Category name already exists", httpStatus.CONFLICT);
    }
    throw error;
  }
};

const update_category = async (
  id: string,
  data: { name?: string; sortOrder?: number; isActive?: boolean },
) => {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError("Invalid category ID", httpStatus.BAD_REQUEST);
  }

  const category = await Academy_Category_Model.findById(id);
  if (!category) {
    throw new AppError("Category not found", httpStatus.NOT_FOUND);
  }

  if (data.name !== undefined) category.name = data.name;
  if (data.sortOrder !== undefined) category.sortOrder = data.sortOrder;
  if (data.isActive !== undefined) category.isActive = data.isActive;

  try {
    await category.save();
  } catch (error: any) {
    if (error?.code === 11000) {
      throw new AppError("Category name already exists", httpStatus.CONFLICT);
    }
    throw error;
  }

  if (data.name !== undefined) {
    await Academy_Video_Model.updateMany(
      { categoryId: category._id },
      { $set: { categoryName: category.name } },
    );
  }

  return category;
};

const delete_category = async (id: string) => {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError("Invalid category ID", httpStatus.BAD_REQUEST);
  }

  const category = await Academy_Category_Model.findByIdAndUpdate(
    id,
    { $set: { isActive: false } },
    { new: true },
  );

  if (!category) {
    throw new AppError("Category not found", httpStatus.NOT_FOUND);
  }

  return category;
};

const create_video = async (data: {
  title: string;
  description?: string;
  youtubeUrl: string;
  thumbnailUrl?: string | null;
  categoryId: string;
  durationSeconds?: number | null;
  isActive?: boolean;
}) => {
  if (!Types.ObjectId.isValid(data.categoryId)) {
    throw new AppError("Invalid category ID", httpStatus.BAD_REQUEST);
  }

  const category = await Academy_Category_Model.findById(data.categoryId);
  if (!category) {
    throw new AppError("Category not found", httpStatus.NOT_FOUND);
  }

  const thumbnailUrl =
    data.thumbnailUrl === "" || data.thumbnailUrl === undefined
      ? null
      : data.thumbnailUrl;

  return Academy_Video_Model.create({
    title: data.title,
    description: data.description ?? "",
    youtubeUrl: data.youtubeUrl,
    thumbnailUrl,
    categoryId: category._id,
    categoryName: category.name,
    durationSeconds: data.durationSeconds ?? null,
    isActive: data.isActive ?? true,
  });
};

const update_video = async (
  id: string,
  data: {
    title?: string;
    description?: string;
    youtubeUrl?: string;
    thumbnailUrl?: string | null;
    categoryId?: string;
    durationSeconds?: number | null;
    isActive?: boolean;
  },
) => {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError("Invalid video ID", httpStatus.BAD_REQUEST);
  }

  const video = await Academy_Video_Model.findById(id);
  if (!video) {
    throw new AppError("Video not found", httpStatus.NOT_FOUND);
  }

  if (data.categoryId !== undefined) {
    if (!Types.ObjectId.isValid(data.categoryId)) {
      throw new AppError("Invalid category ID", httpStatus.BAD_REQUEST);
    }
    const category = await Academy_Category_Model.findById(data.categoryId);
    if (!category) {
      throw new AppError("Category not found", httpStatus.NOT_FOUND);
    }
    video.categoryId = category._id;
    video.categoryName = category.name;
  }

  if (data.title !== undefined) video.title = data.title;
  if (data.description !== undefined) video.description = data.description;
  if (data.youtubeUrl !== undefined) video.youtubeUrl = data.youtubeUrl;
  if (data.thumbnailUrl !== undefined) {
    video.thumbnailUrl = data.thumbnailUrl === "" ? null : data.thumbnailUrl;
  }
  if (data.durationSeconds !== undefined) {
    video.durationSeconds = data.durationSeconds;
  }
  if (data.isActive !== undefined) video.isActive = data.isActive;

  await video.save();
  return video;
};

const delete_video = async (id: string) => {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError("Invalid video ID", httpStatus.BAD_REQUEST);
  }

  const video = await Academy_Video_Model.findByIdAndUpdate(
    id,
    { $set: { isActive: false } },
    { new: true },
  );

  if (!video) {
    throw new AppError("Video not found", httpStatus.NOT_FOUND);
  }

  return video;
};

export const academy_services = {
  get_categories,
  get_videos,
  create_category,
  update_category,
  delete_category,
  create_video,
  update_video,
  delete_video,
};
