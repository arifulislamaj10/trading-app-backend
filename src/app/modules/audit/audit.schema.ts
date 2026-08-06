import { model, Schema, Types } from "mongoose";

export type AuditAction =
  | "signal_ai_validated"
  | "signal_mt_confirmed"
  | "signal_mt_rejected"
  | "signal_ai_assist"
  | "training_completed";

export interface IAuditLog {
  action: AuditAction;
  actorId: Types.ObjectId;
  targetType: string;
  targetId: Types.ObjectId;
  metadata: Record<string, unknown>;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    action: { type: String, required: true, index: true },
    actorId: { type: Schema.Types.ObjectId, ref: "account", required: true },
    targetType: { type: String, required: true },
    targetId: { type: Schema.Types.ObjectId, required: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { versionKey: false, timestamps: true },
);

auditLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });
auditLogSchema.index({ actorId: 1, createdAt: -1 });

export const Audit_Log_Model = model<IAuditLog>("audit_log", auditLogSchema);
