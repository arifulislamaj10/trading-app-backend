import { Router } from "express";
import auth from "../../middlewares/auth";
import { UserRole } from "../../types/role";
import RequestValidator from "../../middlewares/request_validator";
import { training_controllers } from "./training.controller";
import { training_validations } from "./training.validation";

const trainingRouter = Router();

trainingRouter.use(auth(UserRole.USER, UserRole.MASTER, UserRole.ADMIN));

trainingRouter.get("/", training_controllers.get_training);
trainingRouter.post(
  "/lessons/complete-all",
  training_controllers.complete_all_lessons,
);
trainingRouter.post(
  "/lessons/:lessonId/complete",
  training_controllers.complete_lesson,
);
trainingRouter.post(
  "/complete",
  RequestValidator(training_validations.completeTrainingSchema),
  training_controllers.complete_training,
);

export default trainingRouter;
