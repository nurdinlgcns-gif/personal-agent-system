import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import {
  fetchWhatsAppConnectionStatus,
  logoutWhatsAppSession,
  reconnectWhatsApp,
  type WhatsAppConnectionSnapshot,
} from "../../services/whatsappConnectionApi";

function formatDateTime(value?: string | null) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString();
}

function getStatusLabel(status: string) {
  if (status === "qr_required") {
    return "QR Required";
  }

  if (status === "logged_out") {
    return "Logged Out";
  }

  return status.replace(/_/g, " ");
}

function getStatusDescription(status?: WhatsAppConnectionSnapshot | null) {
  if (!status) {
    return "Waiting for WhatsApp connection state.";
  }

  if (status.status === "connected") {
    return "WhatsApp is connected and ready to process authorized incoming messages.";
  }

  if (status.status === "qr_required") {
    return "Scan this QR code from WhatsApp on your phone to pair the session.";
  }

  if (status.status === "initializing") {
    return "WhatsApp client is initializing.";
  }

  if (status.status === "reconnecting") {
    return "WhatsApp client is reconnecting.";
  }

  if (status.status === "logged_out") {
    return "WhatsApp session is logged out. Reconnect to generate a new QR code.";
  }

  if (status.status === "error") {
    return "WhatsApp client reported an error.";
  }

  return "WhatsApp client is currently disconnected.";
}

export function WhatsAppConnectionCard() {
  const [status, setStatus] = useState<WhatsAppConnectionSnapshot | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionRunning, setIsActionRunning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const shouldPollFast =
    status?.status === "qr_required" ||
    status?.status === "initializing" ||
    status?.status === "reconnecting";

  const statusClass = useMemo(() => {
    return status?.status || "unknown";
  }, [status]);

  async function loadStatus(isSilent = false) {
    try {
      if (!isSilent) {
        setIsLoading(true);
      }

      setErrorMessage(null);

      const nextStatus = await fetchWhatsAppConnectionStatus();
      setStatus(nextStatus);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to load WhatsApp connection status.";

      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleReconnect() {
    try {
      setIsActionRunning(true);
      setErrorMessage(null);

      const nextStatus = await reconnectWhatsApp();
      setStatus(nextStatus);

      await loadStatus(true);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to reconnect WhatsApp.";

      setErrorMessage(message);
    } finally {
      setIsActionRunning(false);
    }
  }

  async function handleLogout() {
    const shouldLogout = window.confirm(
      "Logout WhatsApp session and clear local pairing data? You will need to scan a new QR code."
    );

    if (!shouldLogout) {
      return;
    }

    try {
      setIsActionRunning(true);
      setErrorMessage(null);

      const nextStatus = await logoutWhatsAppSession();
      setStatus(nextStatus);

      await loadStatus(true);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to logout WhatsApp.";

      setErrorMessage(message);
    } finally {
      setIsActionRunning(false);
    }
  }

  useEffect(() => {
    loadStatus();
  }, []);

  useEffect(() => {
    const interval = window.setInterval(
      () => {
        loadStatus(true);
      },
      shouldPollFast ? 2500 : 8000
    );

    return () => {
      window.clearInterval(interval);
    };
  }, [shouldPollFast]);

  useEffect(() => {
    let isCancelled = false;

    async function buildQrDataUrl() {
      if (!status?.qr) {
        setQrDataUrl(null);
        return;
      }

      try {
        const dataUrl = await QRCode.toDataURL(status.qr, {
          margin: 2,
          width: 280,
          errorCorrectionLevel: "M",
        });

        if (!isCancelled) {
          setQrDataUrl(dataUrl);
        }
      } catch {
        if (!isCancelled) {
          setQrDataUrl(null);
        }
      }
    }

    buildQrDataUrl();

    return () => {
      isCancelled = true;
    };
  }, [status?.qr]);

  const showQrImage = status?.status === "qr_required" && Boolean(qrDataUrl);

  return (
    <section className="whatsapp-connection-card">
      <div className="whatsapp-connection-header">
        <div>
          <span>Connection + QR Pairing</span>
          <h3>WhatsApp Session</h3>
          <p>{getStatusDescription(status)}</p>
        </div>

        <div className={`whatsapp-connection-status ${statusClass}`}>
          {isLoading ? "Loading" : getStatusLabel(status?.status || "unknown")}
        </div>
      </div>

      <div className="whatsapp-connection-grid">
        <div className="whatsapp-connection-info">
          <div>
            <span>Status</span>
            <strong>{getStatusLabel(status?.status || "unknown")}</strong>
          </div>

          <div>
            <span>Last connected</span>
            <strong>{formatDateTime(status?.lastConnectedAt)}</strong>
          </div>

          <div>
            <span>Last disconnected</span>
            <strong>{formatDateTime(status?.lastDisconnectedAt)}</strong>
          </div>

          <div>
            <span>Updated</span>
            <strong>{formatDateTime(status?.updatedAt)}</strong>
          </div>
        </div>

        <div className="whatsapp-qr-panel">
          {showQrImage && qrDataUrl ? (
            <>
              {/* BAGIAN YANG SUDAH DIPERBAIKI */}
              <img src={qrDataUrl} alt="WhatsApp QR Code" />
              <span>Scan with WhatsApp mobile app</span>
            </>
          ) : status?.status === "connected" ? (
            <div className="whatsapp-qr-placeholder connected">
              <strong>Connected</strong>
              <span>QR hidden after successful pairing.</span>
            </div>
          ) : (
            <div className="whatsapp-qr-placeholder">
              <strong>No QR available</strong>
              <span>Reconnect if a new pairing QR is needed.</span>
            </div>
          )}
        </div>
      </div>

      {status?.lastError && (
        <div className="whatsapp-connection-warning">
          <strong>Last error</strong>
          <span>{status.lastError}</span>
        </div>
      )}

      {errorMessage && (
        <div className="whatsapp-connection-error">
          <strong>Connection error</strong>
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="whatsapp-connection-actions">
        <button
          type="button"
          onClick={() => loadStatus()}
          disabled={isActionRunning}
        >
          Refresh Status
        </button>

        <button
          type="button"
          onClick={handleReconnect}
          disabled={isActionRunning}
        >
          {isActionRunning ? "Running..." : "Reconnect"}
        </button>

        <button
          type="button"
          className="danger"
          onClick={handleLogout}
          disabled={isActionRunning}
        >
          Logout Session
        </button>
      </div>
    </section>
  );
}
