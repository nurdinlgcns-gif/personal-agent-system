import {
    makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
  } from "@whiskeysockets/baileys";
  
  import { Boom } from "@hapi/boom";
  import qrcode from "qrcode-terminal";
  import pino from "pino";
  
  import { handleIncomingWhatsAppMessage } from "../services/whatsapp/messageHandler";
  import { logger } from "../utils/logger";
  
  let isStarting = false;
  
  export async function startWhatsApp() {
    if (isStarting) {
      logger.wa("Start ignored, WhatsApp is already starting");
      return;
    }
  
    isStarting = true;
  
    const { state, saveCreds } = await useMultiFileAuthState("auth_info");
  
    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      logger: pino({
        level: "silent",
      }),
      browser: ["Windows", "Chrome", "1.0.0"],
    });
  
    sock.ev.on("creds.update", saveCreds);
  
    sock.ev.on("connection.update", (update) => {
      const { connection, lastDisconnect, qr } = update;
  
      if (qr) {
        logger.wa("QR tersedia. Scan dari WhatsApp.");
  
        qrcode.generate(qr, {
          small: true,
        });
      }
  
      if (connection === "open") {
        isStarting = false;
        logger.wa("Connected");
      }
  
      if (connection === "close") {
        isStarting = false;
  
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
  
        logger.wa(`Disconnected. Reason: ${statusCode || "unknown"}`);
  
        if (statusCode === DisconnectReason.loggedOut) {
          logger.wa(
            "Logged out. Hapus folder auth_info lalu scan ulang QR."
          );
          return;
        }
  
        if (statusCode === 515) {
          logger.wa("Restart required by WhatsApp. Reconnecting...");
          setTimeout(() => {
            startWhatsApp();
          }, 2000);
          return;
        }
  
        logger.wa("Reconnecting...");
        setTimeout(() => {
          startWhatsApp();
        }, 3000);
      }
    });
  
    sock.ev.on("messages.upsert", async ({ messages }) => {
      const msg = messages[0];
  
      const result = await handleIncomingWhatsAppMessage(msg);
  
      if (!result.shouldReply || !result.chatId || !result.text) {
        return;
      }
  
      await sock.sendMessage(result.chatId, {
        text: result.text,
      });
  
      logger.wa("Reply sent");
    });
  }