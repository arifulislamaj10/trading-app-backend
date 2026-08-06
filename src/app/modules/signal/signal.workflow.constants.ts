import { WorkflowStatus } from "./signal.schema";

/** Workflow states where MT may reject (not live / not already rejected). */
export const REJECTABLE_WORKFLOW_STATUSES: WorkflowStatus[] = [
  "draft",
  "ai_pending",
  "ai_failed",
  "mt_pending",
  "ai_passed",
];

/** Workflow states allowed to re-run Groq validation. */
export const RESUBMIT_AI_WORKFLOW_STATUSES: WorkflowStatus[] = [
  "draft",
  "ai_pending",
  "ai_failed",
  "mt_pending",
];

/** Workflow states allowed to confirm and publish. */
export const CONFIRMABLE_WORKFLOW_STATUSES: WorkflowStatus[] = [
  "mt_pending",
  "ai_passed",
];
