export type WhatsAppConnectionStatus =
  | "initializing"
  | "qr_required"
  | "connected"
  | "disconnected"
  | "reconnecting"
  | "logged_out"
  | "error";

export type WhatsAppConnectionSnapshot = {
  status: WhatsAppConnectionStatus;
  qr: string | null;
  lastError: string | null;
  lastConnectedAt: string | null;
  lastDisconnectedAt: string | null;
  updatedAt: string;
};

const state: WhatsAppConnectionSnapshot = {
  status: "initializing",
  qr: null,
  lastError: null,
  lastConnectedAt: null,
  lastDisconnectedAt: null,
  updatedAt: new Date().toISOString(),
};

function touch() {
  state.updatedAt = new Date().toISOString();
}

export function getWhatsAppConnectionSnapshot(): WhatsAppConnectionSnapshot {
  return {
    ...state,
  };
}

export function setWhatsAppInitializing() {
  state.status = "initializing";
  state.qr = null;
  state.lastError = null;
  touch();
}

export function setWhatsAppQrRequired(qr: string) {
  state.status = "qr_required";
  state.qr = qr;
  state.lastError = null;
  touch();
}

export function setWhatsAppConnected() {
  state.status = "connected";
  state.qr = null;
  state.lastError = null;
  state.lastConnectedAt = new Date().toISOString();
  touch();
}

export function setWhatsAppDisconnected(reason?: string) {
  state.status = "disconnected";
  state.qr = null;
  state.lastError = reason || null;
  state.lastDisconnectedAt = new Date().toISOString();
  touch();
}

export function setWhatsAppReconnecting(reason?: string) {
  state.status = "reconnecting";
  state.qr = null;
  state.lastError = reason || null;
  touch();
}

export function setWhatsAppLoggedOut() {
  state.status = "logged_out";
  state.qr = null;
  state.lastError = null;
  state.lastDisconnectedAt = new Date().toISOString();
  touch();
}

export function setWhatsAppError(error: unknown) {
  const message =
    error instanceof Error ? error.message : String(error || "Unknown error");

  state.status = "error";
  state.qr = null;
  state.lastError = message;
  state.lastDisconnectedAt = new Date().toISOString();
  touch();
}