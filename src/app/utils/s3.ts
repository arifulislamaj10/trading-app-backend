import {
  S3Client,
  PutObjectCommand,
  PutObjectCommandInput,
} from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import path from "path";
import { configs } from "../configs";
import logger from "../configs/logger";
import { resolveContentType } from "./media_types";
import { uploadToLocal } from "./local_storage";

type UploadStorageMode = "s3" | "local" | "auto";

const PLACEHOLDER_VALUES = new Set([
  "your_bucket_name",
  "your_aws_access_key_id",
  "your_aws_secret_access_key",
]);

const regionPatterns = new Set([
  "us-east-1",
  "us-east-2",
  "us-west-1",
  "us-west-2",
  "eu-west-1",
  "eu-west-2",
  "eu-west-3",
  "eu-central-1",
  "eu-north-1",
  "eu-south-1",
  "ap-south-1",
  "ap-southeast-1",
  "ap-southeast-2",
  "ap-northeast-1",
  "ap-northeast-2",
  "sa-east-1",
  "ca-central-1",
  "me-south-1",
  "af-south-1",
]);

export function getUploadStorageMode(): UploadStorageMode {
  const mode = (process.env.UPLOAD_STORAGE || "auto").toLowerCase();
  if (mode === "s3" || mode === "local") return mode;
  return "auto";
}

export function isAwsConfigured(): boolean {
  const bucketName = configs.aws.bucket_name || "";

  if (!bucketName || PLACEHOLDER_VALUES.has(bucketName)) {
    return false;
  }

  if (regionPatterns.has(bucketName.toLowerCase())) {
    return false;
  }

  const hasRegion = !!(configs.aws.region && configs.aws.region !== "");
  const hasAccessKey = !!(
    configs.aws.access_key_id &&
    configs.aws.access_key_id !== "" &&
    !PLACEHOLDER_VALUES.has(configs.aws.access_key_id)
  );
  const hasSecretKey = !!(
    configs.aws.secret_access_key &&
    configs.aws.secret_access_key !== "" &&
    !PLACEHOLDER_VALUES.has(configs.aws.secret_access_key)
  );

  return hasRegion && hasAccessKey && hasSecretKey;
}

export function shouldUseS3(): boolean {
  const mode = getUploadStorageMode();

  if (mode === "local") return false;
  if (mode === "s3") return true;
  return isAwsConfigured();
}

export function logUploadStorageConfig(): void {
  const mode = getUploadStorageMode();
  const s3Ready = isAwsConfigured();

  if (mode === "s3") {
    if (s3Ready) {
      logger.info(
        `📦 Upload storage: AWS S3 (bucket: ${configs.aws.bucket_name})`,
      );
    } else {
      logger.error(
        "📦 Upload storage: S3 required but AWS credentials are missing or invalid",
      );
    }
    return;
  }

  if (mode === "local") {
    logger.info("📦 Upload storage: local filesystem");
    return;
  }

  logger.info(
    s3Ready
      ? `📦 Upload storage: AWS S3 (bucket: ${configs.aws.bucket_name})`
      : "📦 Upload storage: local filesystem (AWS not configured)",
  );
}

function getS3PublicUrl(key: string): string {
  const publicBase = process.env.AWS_S3_PUBLIC_BASE_URL?.replace(/\/$/, "");
  if (publicBase) {
    return `${publicBase}/${key}`;
  }

  return `https://${configs.aws.bucket_name}.s3.${configs.aws.region}.amazonaws.com/${key}`;
}

export const s3 = isAwsConfigured()
  ? new S3Client({
      region: configs.aws.region!,
      credentials: {
        accessKeyId: configs.aws.access_key_id!,
        secretAccessKey: configs.aws.secret_access_key!,
      },
      followRegionRedirects: true,
    })
  : null;

async function putObjectToS3(
  file: Express.Multer.File,
  folder: string,
): Promise<string> {
  if (!isAwsConfigured() || !s3) {
    throw new Error(
      "AWS S3 is not configured. Set AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_BUCKET_NAME.",
    );
  }

  const ext = path.extname(file.originalname);
  const key = `${folder}/${randomUUID()}${ext}`;
  const contentType = resolveContentType(file);

  const params: PutObjectCommandInput = {
    Bucket: configs.aws.bucket_name!,
    Key: key,
    Body: file.buffer,
    ContentType: contentType,
  };

  try {
    await s3.send(new PutObjectCommand(params));
    logger.info(`File uploaded to S3: ${key} (${contentType})`);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown S3 error";
    logger.error(
      `S3 PutObject failed for bucket "${configs.aws.bucket_name}" and key "${key}": ${errorMessage}`,
      error,
    );
    throw error;
  }

  return getS3PublicUrl(key);
}

export const uploadToS3 = async (
  file: Express.Multer.File,
  folder = "uploads",
): Promise<string> => {
  const mode = getUploadStorageMode();
  const useS3 = shouldUseS3();

  if (!useS3) {
    if (mode === "s3") {
      throw new Error("UPLOAD_STORAGE=s3 but AWS S3 is not configured.");
    }

    logger.info("Using local storage for upload");
    return uploadToLocal(file, folder);
  }

  try {
    return await putObjectToS3(file, folder);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown S3 error";
    logger.error(`S3 upload failed: ${errorMessage}`, error);

    if (mode === "s3") {
      throw new Error(`S3 upload failed: ${errorMessage}`);
    }

    logger.info("Falling back to local storage due to S3 error");
    return uploadToLocal(file, folder);
  }
};
