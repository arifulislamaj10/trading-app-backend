import { Router } from "express";
import auth from "../../middlewares/auth";
import RequestValidator from "../../middlewares/request_validator";
import { academy_controllers } from "./academy.controller";
import { academy_validations } from "./academy.validation";

const academyRouter = Router();

academyRouter.get(
  "/categories",
  auth("USER", "MASTER", "ADMIN"),
  academy_controllers.get_categories,
);
academyRouter.get(
  "/videos",
  auth("USER", "MASTER", "ADMIN"),
  academy_controllers.get_videos,
);

export const academyAdminRouter = Router();

academyAdminRouter.get("/categories", academy_controllers.admin_get_categories);
academyAdminRouter.post(
  "/categories",
  RequestValidator(academy_validations.createCategorySchema),
  academy_controllers.create_category,
);
academyAdminRouter.patch(
  "/categories/:id",
  RequestValidator(academy_validations.updateCategorySchema),
  academy_controllers.update_category,
);
academyAdminRouter.delete(
  "/categories/:id",
  academy_controllers.delete_category,
);

academyAdminRouter.get("/videos", academy_controllers.admin_get_videos);
academyAdminRouter.post(
  "/videos",
  RequestValidator(academy_validations.createVideoSchema),
  academy_controllers.create_video,
);
academyAdminRouter.patch(
  "/videos/:id",
  RequestValidator(academy_validations.updateVideoSchema),
  academy_controllers.update_video,
);
academyAdminRouter.delete("/videos/:id", academy_controllers.delete_video);

export default academyRouter;
