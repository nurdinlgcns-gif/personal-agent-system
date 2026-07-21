const API_BASE_URL = "http://localhost:3000";

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

async function readErrorMessage(response: Response, fallbackMessage: string) {
  const errorText = await response.text();

  if (!errorText) {
    return `${fallbackMessage}. HTTP ${response.status}`;
  }

  try {
    const parsedError = JSON.parse(errorText) as {
      message?: string;
      error?: string;
    };

    return (
      parsedError.message ||
      parsedError.error ||
      `${fallbackMessage}. HTTP ${response.status}: ${errorText}`
    );
  } catch {
    return `${fallbackMessage}. HTTP ${response.status}: ${errorText}`;
  }
}

export async function fetchWhatsAppConnectionStatus() {
  const response = await fetch(`${API_BASE_URL}/api/whatsapp/status`);

  if (!response.ok) {
    const errorMessage = await readErrorMessage(
      response,
      "Failed to fetch WhatsApp connection status"
    );

    throw new Error(errorMessage);
  }

  const data: { status: WhatsAppConnectionSnapshot } = await response.json();
  return data.status;
}

export async function reconnectWhatsApp() {
  const response = await fetch(`${API_BASE_URL}/api/whatsapp/reconnect`, {
    method: "POST",
  });

  if (!response.ok) {
    const errorMessage = await readErrorMessage(
      response,
      "Failed to reconnect WhatsApp"
    );

    throw new Error(errorMessage);
  }

  const data: { ok: boolean; status: WhatsAppConnectionSnapshot } =
    await response.json();

  return data.status;
}

export async function logoutWhatsAppSession() {
  const response = await fetch(`${API_BASE_URL}/api/whatsapp/logout`, {
    method: "POST",
  });

  if (!response.ok) {
    const errorMessage = await readErrorMessage(
      response,
      "Failed to logout WhatsApp session"
    );

    throw new Error(errorMessage);
  }

  const data: { ok: boolean; status: WhatsAppConnectionSnapshot } =
    await response.json();

  return data.status;
}