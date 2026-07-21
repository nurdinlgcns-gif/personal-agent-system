import { Router } from "express";
import { getWhatsAppConnectionSnapshot } from "../services/whatsapp/whatsappConnectionState";
import { logoutWhatsApp, restartWhatsApp } from "../webhook/whatsapp";

export const whatsappRoutes = Router();

whatsappRoutes.get("/status", (_request, response) => {
  response.json({
    status: getWhatsAppConnectionSnapshot(),
  });
});

whatsappRoutes.post("/reconnect", async (_request, response) => {
  await restartWhatsApp();

  response.json({
    ok: true,
    status: getWhatsAppConnectionSnapshot(),
  });
});

whatsappRoutes.post("/logout", async (_request, response) => {
  await logoutWhatsApp();

  response.json({
    ok: true,
    status: getWhatsAppConnectionSnapshot(),
  });
});