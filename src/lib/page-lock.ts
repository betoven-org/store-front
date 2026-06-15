/**
 * Page Lock — Pessimistic locking for page editing.
 * Prevents two editors from editing the same page simultaneously.
 *
 * Simpler alternative to full realtime collaborative editing.
 * Lock expires after 5 minutes of inactivity (heartbeat required).
 */

import { db as appDb } from "@/db";
import { sql } from "drizzle-orm";

const LOCK_TTL_MS = 5 * 60 * 1000; // 5 minutes

// In-memory lock store (works for single-instance; use Redis for multi-instance)
const locks = new Map<string, { userId: number; userName: string; expiresAt: number }>();

function lockKey(tenantId: number, pageId: number) {
  return `${tenantId}:page:${pageId}`;
}

/**
 * Try to acquire a lock on a page.
 * Returns { acquired: true } if successful, or { acquired: false, lockedBy } if someone else has it.
 */
export function acquireLock(
  tenantId: number,
  pageId: number,
  userId: number,
  userName: string
): { acquired: boolean; lockedBy?: string; expiresAt?: number } {
  const key = lockKey(tenantId, pageId);
  const existing = locks.get(key);

  // Check if lock exists and is not expired
  if (existing && existing.expiresAt > Date.now() && existing.userId !== userId) {
    return {
      acquired: false,
      lockedBy: existing.userName,
      expiresAt: existing.expiresAt,
    };
  }

  // Acquire or renew lock
  locks.set(key, {
    userId,
    userName,
    expiresAt: Date.now() + LOCK_TTL_MS,
  });

  return { acquired: true };
}

/**
 * Refresh the lock TTL (heartbeat). Call every ~2 minutes from the editor.
 */
export function refreshLock(tenantId: number, pageId: number, userId: number): boolean {
  const key = lockKey(tenantId, pageId);
  const existing = locks.get(key);

  if (!existing || existing.userId !== userId) return false;

  existing.expiresAt = Date.now() + LOCK_TTL_MS;
  return true;
}

/**
 * Release a lock explicitly (on page leave).
 */
export function releaseLock(tenantId: number, pageId: number, userId: number): boolean {
  const key = lockKey(tenantId, pageId);
  const existing = locks.get(key);

  if (!existing || existing.userId !== userId) return false;

  locks.delete(key);
  return true;
}

/**
 * Check who holds the lock on a page.
 */
export function checkLock(
  tenantId: number,
  pageId: number
): { locked: boolean; userId?: number; userName?: string; expiresAt?: number } {
  const key = lockKey(tenantId, pageId);
  const existing = locks.get(key);

  if (!existing || existing.expiresAt <= Date.now()) {
    if (existing) locks.delete(key);
    return { locked: false };
  }

  return {
    locked: true,
    userId: existing.userId,
    userName: existing.userName,
    expiresAt: existing.expiresAt,
  };
}

/** Purge all expired locks (run periodically) */
export function purgeExpiredLocks() {
  const now = Date.now();
  for (const [key, lock] of locks) {
    if (lock.expiresAt <= now) locks.delete(key);
  }
}
