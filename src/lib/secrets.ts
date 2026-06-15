/**
 * Secrets Management — AES-256-GCM encryption for sensitive values.
 * Inspired by deco apps/website/loaders/secret.ts (Apache-2.0).
 *
 * Secrets are encrypted at rest in the database and decrypted only
 * at runtime when needed by API routes.
 *
 * Env: BRASA_CRYPTO_KEY — 32-byte hex key (64 hex chars)
 * Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function getKey(): Buffer {
  const hex = process.env.BRASA_CRYPTO_KEY;
  if (!hex) {
    throw new Error("BRASA_CRYPTO_KEY env var is required for secrets encryption");
  }
  if (hex.length !== 64) {
    throw new Error("BRASA_CRYPTO_KEY must be 64 hex characters (32 bytes)");
  }
  return Buffer.from(hex, "hex");
}

/**
 * Encrypt a plaintext string.
 * Returns: base64 string containing iv + ciphertext + authTag
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  // Pack: iv (12) + tag (16) + ciphertext
  const packed = Buffer.concat([iv, tag, encrypted]);
  return packed.toString("base64");
}

/**
 * Decrypt an encrypted string (produced by encrypt()).
 * Returns: original plaintext
 */
export function decrypt(encoded: string): string {
  const key = getKey();
  const packed = Buffer.from(encoded, "base64");

  if (packed.length < IV_LENGTH + TAG_LENGTH) {
    throw new Error("Invalid encrypted value: too short");
  }

  const iv = packed.subarray(0, IV_LENGTH);
  const tag = packed.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = packed.subarray(IV_LENGTH + TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

/**
 * Check if a value looks like an encrypted secret (base64 with min length).
 */
export function isEncrypted(value: string): boolean {
  if (value.length < 40) return false;
  try {
    const buf = Buffer.from(value, "base64");
    return buf.length >= IV_LENGTH + TAG_LENGTH;
  } catch {
    return false;
  }
}

/**
 * Safely decrypt a value — returns the original string if decryption fails
 * (e.g., not encrypted, or wrong key). Never throws.
 */
export function safeDecrypt(value: string): string {
  if (!value || !isEncrypted(value)) return value;
  if (!process.env.BRASA_CRYPTO_KEY) return value;

  try {
    return decrypt(value);
  } catch {
    return value;
  }
}

/**
 * Mask a secret for display: shows first 4 and last 4 chars.
 */
export function maskSecret(value: string): string {
  if (!value || value.length <= 8) return "••••••••";
  return value.slice(0, 4) + "••••" + value.slice(-4);
}
