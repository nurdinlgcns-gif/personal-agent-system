import { env } from "../config/env";
import { logger } from "../utils/logger";

const requestLog = new Map<string, number[]>();

export function isAuthorized(waNumber: string): boolean {
  const cleanNumber = normalizeWaNumber(waNumber);

  const allowed = env.ALLOWED_WA_NUMBERS.includes(cleanNumber);

  if (!allowed) {
    logger.security(`Unauthorized number: ${cleanNumber}`);
  }

  return allowed;
}

export function checkRateLimit(
  waNumber: string,
  maxPerMinute = env.WA_MAX_REQUEST_PER_MINUTE
): boolean {
  const cleanNumber = normalizeWaNumber(waNumber);
  const now = Date.now();

  const timestamps = (requestLog.get(cleanNumber) || []).filter(
    (timestamp) => now - timestamp < 60000
  );

  if (timestamps.length >= maxPerMinute) {
    logger.security(`Rate limit exceeded: ${cleanNumber}`);
    return false;
  }

  timestamps.push(now);
  requestLog.set(cleanNumber, timestamps);

  return true;
}

export function normalizeWaNumber(value: string): string {
  return value
    .replace("@s.whatsapp.net", "")
    .replace("@g.us", "")
    .replace(/\D/g, "");
}