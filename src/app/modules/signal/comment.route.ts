import express from "express";
import auth from "../../middlewares/auth";
import requestValidator from "../../middlewares/request_validator";
import { comment_validations } from "./comment.validation";
import { comment_controllers } from "./comment.controller";

const router = express.Router();

/**
 * @route POST /api/v1/comments
 * @desc Post a comment on a signal
 * @access Private (USER, MASTER, ADMIN)
 */
router.post(
  "/",
  auth("USER", "MASTER", "ADMIN"),
  requestValidator(comment_validations.createCommentSchema),
  comment_controllers.create_comment,
);

/**
 * @route GET /api/v1/comments
 * @desc Get all comments for a signal
 * @access Public
 */
router.get("/", comment_controllers.get_comments);

export const comment_routes = router;
