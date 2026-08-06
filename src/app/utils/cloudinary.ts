import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import { configs } from "../configs";
import logger from "../configs/logger";

type ICloudinaryResponse = {
  asset_id: string;
  public_id: string;
  version: number;
  version_id: string;
  signature: string;
  width: number;
  height: number;
  format: string;
  resource_type: string;
  created_at: string;
  tags: string[];
  bytes: number;
  type: string;
  etag: string;
  placeholder: boolean;
  url: string;
  secure_url: string;
  folder: string;
  overwritten: boolean;
  original_filename: string;
  original_extension: string;
  api_key: string;
};

type IFile = {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  destination: string;
  filename: string;
  path: string;
  size: number;
};

// Configuration
cloudinary.config({
  cloud_name: configs.cloudinary.cloud_name!,
  api_key: configs.cloudinary.api_key!,
  api_secret: configs.cloudinary.api_secret!,
});

const uploadCloud = async (
  file: IFile,
): Promise<ICloudinaryResponse | undefined> => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(
      file.path,
      (error: Error, result: ICloudinaryResponse) => {
        // Delete temp file after upload (async with error handling)
        fs.unlink(file.path, (err) => {
          if (err && err.code !== "ENOENT") {
            logger.error("Error deleting temp file:", err);
          }
        });

        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      },
    );
  });
};

export default uploadCloud;
