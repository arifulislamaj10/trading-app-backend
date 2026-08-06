export interface TrainingLesson {
  lessonId: string;
  title: string;
  description: string;
  order: number;
  durationMinutes: number;
}

export const TRAINING_LESSONS: TrainingLesson[] = [
  {
    lessonId: "intro_platform",
    title: "Platform Introduction",
    description: "Learn how signals, masters, and your trade journal work.",
    order: 1,
    durationMinutes: 5,
  },
  {
    lessonId: "risk_basics",
    title: "Risk Management Basics",
    description: "Position sizing, stop loss, and protecting your capital.",
    order: 2,
    durationMinutes: 8,
  },
  {
    lessonId: "copy_log_trades",
    title: "Copy & Log Trades",
    description: "How to copy a signal and log your trade results accurately.",
    order: 3,
    durationMinutes: 6,
  },
  {
    lessonId: "reading_signals",
    title: "Reading Trading Signals",
    description: "Entry, target, stop loss, and signal types explained.",
    order: 4,
    durationMinutes: 7,
  },
];

export const TRAINING_PASS_SCORE = 70;
export const TRAINING_QUIZ_QUESTIONS = 5;
