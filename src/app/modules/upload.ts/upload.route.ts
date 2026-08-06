import express from "express";
import { uploadFile } from "./upload.controller";
import { uploader } from "../../middlewares/uploader";
import auth from "../../middlewares/auth";
import { fileUploadLimiter } from "../../middlewares/rate_limiter";

const router = express.Router();

// Helper to handle multer errors
const handleMulterError = (err: Error, res: express.Response) => {
  if (err instanceof Error && "code" in err) {
    const multerErr = err as { code?: string; message: string };
    if (multerErr.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File size too large. Maximum size is 200MB",
      });
    }
    if (multerErr.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        success: false,
        message: "Too many files. Maximum 10 files allowed",
      });
    }
    if (multerErr.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        success: false,
        message: "Unexpected file field",
      });
    }
  }
  if (err.message?.startsWith("Invalid file type")) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
  return res.status(400).json({
    success: false,
    message: err.message || "File upload failed",
  });
};

/*
single file
field name = file
*/

router.post(
  "/file",
  auth("USER", "ADMIN", "MASTER"),
  fileUploadLimiter,
  (req, res, next) => {
    uploader.single("file")(req, res, (err) => {
      if (err) {
        return handleMulterError(err, res);
      }
      next();
    });
  },
  uploadFile,
);

/*
multiple files
field name = files
*/

router.post(
  "/files",
  auth("USER", "ADMIN", "MASTER"),
  fileUploadLimiter,
  (req, res, next) => {
    uploader.array("files", 10)(req, res, (err) => {
      if (err) {
        return handleMulterError(err, res);
      }
      next();
    });
  },
  uploadFile,
);

export default router;
