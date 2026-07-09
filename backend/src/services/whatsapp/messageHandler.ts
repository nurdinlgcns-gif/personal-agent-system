import { routeTask } from "../../orchestrator";
import {
  checkRateLimit,
  isAuthorized,
  normalizeWaNumber,
} from "../../orchestrator/security";
import { env } from "../../config/env";
import { logger } from "../../utils/logger";

type WhatsAppHandleResult = {
  shouldReply: boolean;
  chatId?: string;
  text?: string;
};

function extractText(msg: any): string {
  return (
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    msg.message?.videoMessage?.caption ||
    ""
  ).trim();
}

function getChatId(msg: any): string {
  return msg.key.remoteJid || "";
}

function getSenderJid(msg: any): string {
  /**
   * Untuk group chat, sender asli biasanya ada di participant.
   * Untuk personal chat, sender biasanya ada di remoteJid.
   */
  return msg.key.participant || msg.key.remoteJid || "";
}

function isStatusBroadcast(msg: any): boolean {
  return msg.key.remoteJid === "status@broadcast";
}

function getMessageId(msg: any): string {
  return msg.key.id || "-";
}

export async function handleIncomingWhatsAppMessage(
  msg: any
): Promise<WhatsAppHandleResult> {
  if (!msg) {
    return { shouldReply: false };
  }

  if (!msg.message) {
    return { shouldReply: false };
  }

  if (isStatusBroadcast(msg)) {
    logger.wa("Status broadcast ignored");
    return { shouldReply: false };
  }

  const fromMe = Boolean(msg.key.fromMe);
  const messageId = getMessageId(msg);
  const chatId = getChatId(msg);
  const senderJid = getSenderJid(msg);
  const senderNumber = normalizeWaNumber(senderJid);

  /**
   * PENTING:
   * Kalau PROCESS_FROM_ME=false, pesan dari bot sendiri langsung diabaikan.
   * Ini mencegah:
   * - bot memproses balasannya sendiri
   * - terminal penuh oleh text output panjang
   * - loop reply tanpa akhir
   */
  if (fromMe && !env.PROCESS_FROM_ME) {
    logger.wa(`Outgoing/self message ignored. Message ID: ${messageId}`);
    return { shouldReply: false };
  }

  const text = extractText(msg);

  logger.wa("Incoming message detected");
  logger.wa(`Message ID: ${messageId}`);
  logger.wa(`Raw remoteJid: ${msg.key.remoteJid || "-"}`);
  logger.wa(`Raw participant: ${msg.key.participant || "-"}`);
  logger.wa(`Sender JID: ${senderJid || "-"}`);
  logger.wa(`Sender normalized: ${senderNumber || "unknown"}`);
  logger.wa(`From me: ${fromMe}`);
  logger.wa(`Text: ${text || "[empty]"}`);

  if (!text) {
    logger.wa("Empty message ignored");
    return { shouldReply: false };
  }

  if (!text.includes("@")) {
    logger.wa("Message ignored, no agent mention found");
    return { shouldReply: false };
  }

  /**
   * Security gate:
   * Nomor / ID sender harus ada di ALLOWED_WA_NUMBERS.
   *
   * Catatan:
   * WhatsApp/Baileys kadang pakai @lid ID, bukan nomor 628xxx.
   * Jadi kalau log menunjukkan Sender normalized: 259xxxx,
   * tambahkan juga ID itu ke .env ALLOWED_WA_NUMBERS.
   */
  if (!isAuthorized(senderNumber)) {
    logger.security(`Unauthorized WhatsApp access: ${senderNumber}`);

    return {
      shouldReply: true,
      chatId,
      text: "Maaf, nomor ini belum diizinkan menggunakan agent.",
    };
  }

  if (!checkRateLimit(senderNumber)) {
    logger.security(`Rate limit blocked: ${senderNumber}`);

    return {
      shouldReply: true,
      chatId,
      text: "Request terlalu banyak. Coba lagi sebentar.",
    };
  }

  logger.wa("Agent request detected");

  try {
    const result = await routeTask(text);

    return {
      shouldReply: true,
      chatId,
      text: result,
    };
  } catch (error) {
    logger.error("Failed to process WhatsApp message", error);

    return {
      shouldReply: true,
      chatId,
      text: "Terjadi error saat memproses request WhatsApp.",
    };
  }
}