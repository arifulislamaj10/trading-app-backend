import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../utils/catch_async";
import manageResponse from "../../utils/manage_response";
import { training_services } from "./training.service";

const get_training = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const result = await training_services.get_training(userId);

  manageResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Training progress retrieved",
    data: result,
  });
});

const complete_all_lessons = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const result = await training_services.complete_all_lessons(userId);

  manageResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "All lessons marked complete",
    data: result,
  });
});

const complete_lesson = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const result = await training_services.complete_lesson(
    userId,
    req.params.lessonId as string,
  );

  manageResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Lesson marked complete",
    data: result,
  });
});

const complete_training = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { quizScore, markAllLessonsComplete } = req.body as {
    quizScore?: number;
    markAllLessonsComplete?: boolean;
  };

  const result = await training_services.complete_training(userId, {
    quizScore,
    markAllLessonsComplete: Boolean(markAllLessonsComplete),
  });

  manageResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: result,
  });
});

export const training_controllers = {
  get_training,
  complete_all_lessons,
  complete_lesson,
  complete_training,
};
