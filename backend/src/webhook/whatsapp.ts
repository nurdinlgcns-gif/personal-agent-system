import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
  type WASocket,
} from "@whiskeysockets/baileys";
import P from "pino";
import path from "path";
import fs from "fs";

import { logger } from "../utils/logger";
import { env } from "../config/env";
import { handleIncomingWhatsAppMessage } from "../services/whatsapp/messageHandler";
import {
  setWhatsAppConnected,
  setWhatsAppDisconnected,
  setWhatsAppError,
  setWhatsAppInitializing,
  setWhatsAppLoggedOut,
  setWhatsAppQrRequired,
  setWhatsAppReconnecting,
} from "../services/whatsapp/whatsappConnectionState";
import { ensureWhatsAppSendableText } from "../services/whatsapp/whatsappRuntimeGuardrails";

let socket: WASocket | null = null;
let isStarting = false;
let restartTimer: NodeJS.Timeout | null = null;
let activeSessionId = 0;

const baileysLogger = P({
  level: process.env.BAILEYS_LOG_LEVEL || "silent",
});

function getAuthDir() {
  return path.resolve(process.cwd(), env.WHATSAPP_AUTH_DIR);
}

function getReconnectDelayMs() {
  return Math.min(Math.max(env.WHATSAPP_RECONNECT_DELAY_MS, 1000), 30000);
}

function isStaleSession(sessionId: number) {
  return sessionId !== activeSessionId;
}

function clearRestartTimer() {
  if (!restartTimer) {
    return;
  }

  clearTimeout(restartTimer);
  restartTimer = null;
}

function scheduleRestart(reason?: string) {
  if (restartTimer) {
    logger.wa(`WhatsApp restart already scheduled. Reason: ${reason || "-"}`);
    return;
  }

  setWhatsAppReconnecting(reason);

  restartTimer = setTimeout(() => {
    restartTimer = null;

    if (socket) {
      logger.wa("WhatsApp restart skipped because socket already exists.");
      return;
    }

    startWhatsApp();
  }, getReconnectDelayMs());
}

async function closeCurrentSocket() {
  if (!socket) {
    return;
  }

  const currentSocket = socket;
  socket = null;
  activeSessionId += 1;

  try {
    currentSocket.end(new Error("Manual WhatsApp socket close"));
  } catch {
    // Ignore socket close errors.
  }
}

async function clearAuthSession() {
  const authDir = getAuthDir();

  if (!fs.existsSync(authDir)) {
    return;
  }

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      fs.rmSync(authDir, {
        recursive: true,
        force: true,
      });

      logger.wa(`WhatsApp auth session cleared: ${authDir}`);
      return;
    } catch (error) {
      logger.error(
        `Failed to clear WhatsApp auth session. Attempt ${attempt}`,
        error
      );

      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
}

export async function startWhatsApp() {
  if (!env.WHATSAPP_ENABLED) {
    logger.wa("WhatsApp disabled by env.");
    setWhatsAppDisconnected("WhatsApp disabled by env.");
    return;
  }

  if (isStarting) {
    logger.wa("WhatsApp start ignored, already starting.");
    return;
  }

  if (socket) {
    logger.wa("WhatsApp start ignored, socket already exists.");
    return;
  }

  isStarting = true;
  activeSessionId += 1;

  const sessionId = activeSessionId;

  setWhatsAppInitializing();

  try {
    const authDir = getAuthDir();

    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, {
        recursive: true,
      });
    }

    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    const { version } = await fetchLatestBaileysVersion();

    const nextSocket = makeWASocket({
      version,
      auth: state,
      logger: baileysLogger,
      printQRInTerminal: false,
      browser: ["Personal Agent System", "Chrome", "1.0.0"],
    });

    socket = nextSocket;

    nextSocket.ev.on("creds.update", saveCreds);

    nextSocket.ev.on("connection.update", async (update) => {
      if (isStaleSession(sessionId)) {
        return;
      }

      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        logger.wa("WhatsApp QR pairing required.");
        setWhatsAppQrRequired(qr);
      }

      if (connection === "open") {
        logger.wa("WhatsApp connected.");
        clearRestartTimer();
        setWhatsAppConnected();
      }

      if (connection === "close") {
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
        const reason = String(statusCode || "unknown");

        logger.wa(`WhatsApp disconnected. Reason: ${reason}`);

        if (socket === nextSocket) {
          socket = null;
        }

        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        if (!shouldReconnect) {
          setWhatsAppLoggedOut();
          return;
        }

        setWhatsAppDisconnected(`Disconnected: ${reason}`);

        if (statusCode === 440) {
          logger.wa(
            "WhatsApp conflict detected. This usually means another socket/session is using the same auth folder."
          );
        }

        scheduleRestart(`Disconnected: ${reason}`);
      }
    });

    nextSocket.ev.on("messages.upsert", async ({ messages }) => {
      if (isStaleSession(sessionId)) {
        return;
      }

      for (const message of messages) {
        try {
          const result = await handleIncomingWhatsAppMessage(message);

          if (!result.shouldReply || !result.chatId || !result.text) {
            continue;
          }

          if (!socket || socket !== nextSocket) {
            logger.wa("Reply skipped because WhatsApp socket is not ready.");
            continue;
          }

          const safeReplyText = ensureWhatsAppSendableText(result.text);

          if (!safeReplyText) {
            logger.wa("Reply skipped because final WhatsApp text is empty.");
            continue;
          }

          await nextSocket.sendMessage(result.chatId, {
            text: safeReplyText,
          });
        } catch (error) {
          logger.error("Failed to handle WhatsApp message", error);
        }
      }
    });

    logger.wa(`WhatsApp auth dir: ${authDir}`);
  } catch (error) {
    logger.error("Failed to start WhatsApp", error);
    setWhatsAppError(error);

    if (!isStaleSession(sessionId)) {
      socket = null;
      scheduleRestart("Start failed.");
    }
  } finally {
    isStarting = false;
  }
}

export async function restartWhatsApp() {
  logger.wa("WhatsApp restart requested.");
  clearRestartTimer();

  await closeCurrentSocket();

  setWhatsAppReconnecting("Manual reconnect requested.");

  await startWhatsApp();
}

export async function logoutWhatsApp() {
  logger.wa("WhatsApp logout requested.");
  clearRestartTimer();

  const currentSocket = socket;

  if (currentSocket) {
    try {
      await currentSocket.logout();
    } catch (error) {
      logger.error("WhatsApp logout failed", error);
    }
  }

  await closeCurrentSocket();
  await clearAuthSession();

  setWhatsAppLoggedOut();

  await startWhatsApp();
}