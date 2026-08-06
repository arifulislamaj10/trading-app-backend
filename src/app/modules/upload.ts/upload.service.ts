import { uploadToS3 } from "../../utils/s3";
import { resolveUploadFolder } from "../../utils/media_types";
import logger from "../../configs/logger";

export const uploadSingleFile = async (
  file: Express.Multer.File,
): Promise<string> => {
  if (!file) {
    throw new Error("No file provided");
  }

  if (!file.buffer) {
    throw new Error("File buffer is missing");
  }

  if (!file.originalname) {
    throw new Error("File name is missing");
  }

  try {
    const folder = resolveUploadFolder(file);
    const url = await uploadToS3(file, folder);
    return url;
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    logger.error(`Failed to upload single file: ${errorMessage}`, error);
    throw new Error(`File upload failed: ${errorMessage}`);
  }
};

export const uploadMultipleFiles = async (
  files: Express.Multer.File[],
): Promise<string[]> => {
  if (!files || files.length === 0) {
    throw new Error("No files provided");
  }

  // Validate all files have required properties
  for (const file of files) {
    if (!file.buffer) {
      throw new Error("File buffer is missing for one of the files");
    }
    if (!file.originalname) {
      throw new Error("File name is missing for one of the files");
    }
  }

  try {
    const urls = await Promise.all(
      files.map(async (file) => {
        try {
          const folder = resolveUploadFolder(file);
          return await uploadToS3(file, folder);
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          logger.error(
            `Failed to upload file ${file.originalname}: ${errorMessage}`,
            error,
          );
          throw new Error(
            `Failed to upload ${file.originalname}: ${errorMessage}`,
          );
        }
      }),
    );
    return urls;
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    logger.error(`Failed to upload multiple files: ${errorMessage}`, error);
    throw new Error(`Multiple files upload failed: ${errorMessage}`);
  }
};
