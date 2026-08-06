import { Types } from "mongoose";
import httpStatus from "http-status";
import { AppError } from "../../utils/app_error";
import { Account_Model } from "../auth/auth.schema";
import { badge_services } from "../badge/badge.service";
import { notification_services } from "../notification/notification.service";
import { audit_services } from "../audit/audit.service";
import {
  TRAINING_LESSONS,
  TRAINING_PASS_SCORE,
  TRAINING_QUIZ_QUESTIONS,
} from "./training.constants";
import { Training_Progress_Model } from "./training.schema";
import logger from "../../configs/logger";

const getOrCreateProgress = async (accountId: string) => {
  let progress = await Training_Progress_Model.findOne({
    accountId: new Types.ObjectId(accountId),
  });

  if (!progress) {
    progress = await Training_Progress_Model.create({
      accountId: new Types.ObjectId(accountId),
      lessonsCompleted: [],
    });
  }

  return progress;
};

const buildProgressResponse = (progress: {
  lessonsCompleted: string[];
  quizScore: number | null;
  quizAttempts: number;
  completedAt: Date | null;
}) => {
  const totalLessons = TRAINING_LESSONS.length;
  const completedCount = progress.lessonsCompleted.length;
  const progressPercent =
    totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  return {
    lessons: TRAINING_LESSONS.map((lesson) => ({
      ...lesson,
      completed: progress.lessonsCompleted.includes(lesson.lessonId),
    })),
    lessonsCompleted: progress.lessonsCompleted,
    totalLessons,
    completedCount,
    progressPercent,
    quizScore: progress.quizScore,
    quizAttempts: progress.quizAttempts,
    passScore: TRAINING_PASS_SCORE,
    trainingCompleted: Boolean(progress.completedAt),
    completedAt: progress.completedAt?.toISOString() ?? null,
    canTakeFinalQuiz: completedCount >= totalLessons,
  };
};

const get_training = async (accountId: string) => {
  const progress = await getOrCreateProgress(accountId);
  const account = await Account_Model.findById(accountId).select(
    "tradingUnlocked trainingCompletedAt role",
  );

  return {
    ...buildProgressResponse(progress),
    tradingUnlocked: Boolean(account?.tradingUnlocked),
    quizQuestionCount: TRAINING_QUIZ_QUESTIONS,
  };
};

const markAllLessonsComplete = async (accountId: string) => {
  const progress = await getOrCreateProgress(accountId);
  const allLessonIds = TRAINING_LESSONS.map((l) => l.lessonId);
  const merged = new Set([...progress.lessonsCompleted, ...allLessonIds]);
  progress.lessonsCompleted = [...merged];
  await progress.save();
  return progress;
};

const complete_all_lessons = async (accountId: string) => {
  const progress = await markAllLessonsComplete(accountId);
  return buildProgressResponse(progress);
};

const complete_lesson = async (accountId: string, lessonId: string) => {
  const lesson = TRAINING_LESSONS.find((l) => l.lessonId === lessonId);
  if (!lesson) {
    throw new AppError("Lesson not found", httpStatus.NOT_FOUND);
  }

  const progress = await getOrCreateProgress(accountId);

  if (!progress.lessonsCompleted.includes(lessonId)) {
    progress.lessonsCompleted.push(lessonId);
    await progress.save();
  }

  return buildProgressResponse(progress);
};

const unlockTradingForUser = async (accountId: string) => {
  await Account_Model.findByIdAndUpdate(accountId, {
    tradingUnlocked: true,
    trainingCompletedAt: new Date(),
  });

  try {
    await badge_services.award_badge(accountId, "training_complete");
  } catch (err) {
    logger.warn("Training badge award failed", { accountId, err });
  }

  try {
    await notification_services.create_notification({
      accountId,
      type: "training_completed",
      title: "Training Complete",
      message: "You completed platform training. Trading is now unlocked!",
      link: "/training",
      data: { badgeKey: "training_complete" },
    });

    await notification_services.create_notification({
      accountId,
      type: "trading_unlocked",
      title: "Trading Unlocked",
      message: "You can now copy signals and log trades in your journal.",
      link: "/copied-trades",
      data: {},
    });
  } catch (err) {
    logger.warn("Training notifications failed", { accountId, err });
  }

  try {
    await audit_services.log(
      "training_completed",
      accountId,
      "account",
      accountId,
      {},
    );
  } catch (err) {
    logger.warn("Training audit log failed", { accountId, err });
  }
};

export interface CompleteTrainingOptions {
  quizScore?: number;
  markAllLessonsComplete?: boolean;
}

const complete_training = async (
  accountId: string,
  options: CompleteTrainingOptions = {},
) => {
  const account = await Account_Model.findById(accountId).select(
    "tradingUnlocked trainingCompletedAt",
  );

  if (account?.tradingUnlocked || account?.trainingCompletedAt) {
    const progress = await getOrCreateProgress(accountId);
    return {
      ...buildProgressResponse(progress),
      tradingUnlocked: true,
      message: "Training already completed. Trading is unlocked.",
      alreadyCompleted: true,
    };
  }

  const quizScore =
    options.quizScore !== undefined && !Number.isNaN(options.quizScore)
      ? options.quizScore
      : TRAINING_PASS_SCORE;

  if (quizScore < 0 || quizScore > 100) {
    throw new AppError(
      "Quiz score must be between 0 and 100",
      httpStatus.BAD_REQUEST,
    );
  }

  let progress = await getOrCreateProgress(accountId);

  if (options.markAllLessonsComplete) {
    progress = await markAllLessonsComplete(accountId);
  }

  const missingLessons = TRAINING_LESSONS.filter(
    (l) => !progress.lessonsCompleted.includes(l.lessonId),
  );

  if (missingLessons.length > 0) {
    throw new AppError(
      `Complete all lessons before the final quiz. Missing: ${missingLessons.map((l) => l.lessonId).join(", ")}. Or send markAllLessonsComplete: true.`,
      httpStatus.BAD_REQUEST,
    );
  }

  progress.quizAttempts += 1;
  progress.quizScore = quizScore;

  if (quizScore < TRAINING_PASS_SCORE) {
    await progress.save();
    throw new AppError(
      `Quiz score ${quizScore}% is below the pass mark of ${TRAINING_PASS_SCORE}%. Please try again.`,
      httpStatus.BAD_REQUEST,
    );
  }

  progress.completedAt = new Date();
  await progress.save();

  await unlockTradingForUser(accountId);

  return {
    ...buildProgressResponse(progress),
    tradingUnlocked: true,
    message: "Training completed successfully. Trading is now unlocked.",
    alreadyCompleted: false,
  };
};

export const training_services = {
  get_training,
  complete_lesson,
  complete_all_lessons,
  complete_training,
  TRAINING_QUIZ_QUESTIONS,
};
