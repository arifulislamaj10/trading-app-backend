import { Types } from "mongoose";
import { Audit_Log_Model, AuditAction } from "./audit.schema";

export const audit_services = {
  log: async (
    action: AuditAction,
    actorId: string,
    targetType: string,
    targetId: string,
    metadata: Record<string, unknown> = {},
  ) => {
    await Audit_Log_Model.create({
      action,
      actorId: new Types.ObjectId(actorId),
      targetType,
      targetId: new Types.ObjectId(targetId),
      metadata,
    });
  },
};
