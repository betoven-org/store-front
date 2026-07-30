import { db } from "@brasa/core/db";
import { auditLogs } from "@/db/schema";

type LogParams = {
  tenantId: number;
  userId?: number;
  userName: string;
  action: string;
  resource: string;
  resourceId?: string | number;
  resourceTitle?: string;
  details?: Record<string, unknown>;
  ip?: string | null;
};

/**
 * Fire-and-forget audit log. Never throws — failures are silently ignored
 * so audit logging never blocks or breaks the main operation.
 */
export function logAction(params: LogParams): void {
  db.insert(auditLogs)
    .values({
      tenantId: params.tenantId,
      userId: params.userId,
      userName: params.userName,
      action: params.action,
      resource: params.resource,
      resourceId: params.resourceId != null ? String(params.resourceId) : null,
      resourceTitle: params.resourceTitle || null,
      details: params.details || null,
      ip: params.ip || null,
      createdAt: new Date().toISOString(),
    })
    .catch(() => {});
}
