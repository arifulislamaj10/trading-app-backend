import {
  TRAINING_LESSONS,
  TRAINING_PASS_SCORE,
} from "../app/modules/training/training.constants";
import { rejectSignalSchema } from "../app/modules/signal/signal.validation";
import {
  CONFIRMABLE_WORKFLOW_STATUSES,
  REJECTABLE_WORKFLOW_STATUSES,
  RESUBMIT_AI_WORKFLOW_STATUSES,
} from "../app/modules/signal/signal.workflow.constants";

describe("signal AI workflow config", () => {
  it("training curriculum has 4 lessons", () => {
    expect(TRAINING_LESSONS.length).toBe(4);
    expect(TRAINING_LESSONS[0].lessonId).toBe("intro_platform");
  });

  it("uses 70% pass score for training quiz", () => {
    expect(TRAINING_PASS_SCORE).toBe(70);
  });
});

describe("workflow status transitions", () => {
  const aiFailToMtPending = (aiStatus: string) =>
    aiStatus === "fail" ? "ai_failed" : "mt_pending";

  it("maps AI fail to ai_failed workflow", () => {
    expect(aiFailToMtPending("fail")).toBe("ai_failed");
  });

  it("maps AI pass to mt_pending workflow", () => {
    expect(aiFailToMtPending("pass")).toBe("mt_pending");
    expect(aiFailToMtPending("review")).toBe("mt_pending");
  });
});

describe("AI workflow status constants", () => {
  it("allows reject only before publish", () => {
    expect(REJECTABLE_WORKFLOW_STATUSES).toContain("mt_pending");
    expect(REJECTABLE_WORKFLOW_STATUSES).not.toContain("active");
    expect(REJECTABLE_WORKFLOW_STATUSES).not.toContain("rejected");
  });

  it("allows resubmit after edit in mt_pending", () => {
    expect(RESUBMIT_AI_WORKFLOW_STATUSES).toContain("mt_pending");
    expect(RESUBMIT_AI_WORKFLOW_STATUSES).toContain("ai_failed");
  });

  it("allows confirm from mt_pending", () => {
    expect(CONFIRMABLE_WORKFLOW_STATUSES).toContain("mt_pending");
  });
});

describe("rejectSignalSchema", () => {
  const parse = (body: unknown) => rejectSignalSchema.parseAsync(body ?? {});

  it("accepts empty body when Swagger sends no JSON", async () => {
    await expect(parse(undefined)).resolves.toEqual({});
    await expect(parse({})).resolves.toEqual({});
  });

  it("accepts optional rejectionReason", async () => {
    await expect(parse({ rejectionReason: "Too risky" })).resolves.toEqual({
      rejectionReason: "Too risky",
    });
  });
});
