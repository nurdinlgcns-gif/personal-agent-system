import { useState } from "react";
import { sendManualTask } from "../../services/api";

type ManualTaskWidgetProps = {
  onTaskSent: () => Promise<void>;
};

export function ManualTaskWidget({ onTaskSent }: ManualTaskWidgetProps) {
  const [message, setMessage] = useState(
    "@design-agent create an ad copy for running shoes"
  );
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSendTask() {
    try {
      setIsSending(true);
      setResult(null);
      setError(null);

      if (!message.trim()) {
        setError("Message wajib diisi.");
        return;
      }

      if (!message.includes("@")) {
        setError("Message harus menyertakan mention agent, contoh: @design-agent halo");
        return;
      }

      const response = await sendManualTask(message);

      setResult(response.result);

      await onTaskSent();
    } catch (sendError) {
      const errorMessage =
        sendError instanceof Error
          ? sendError.message
          : "Failed to send manual task";

      setError(errorMessage);
    } finally {
      setIsSending(false);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      handleSendTask();
    }
  }

  return (
    <section className="manual-task-widget">
      <div className="manual-task-content">
        <div>
          <strong>Manual Task Test</strong>
          <p>Send task directly from dashboard without Postman or WhatsApp.</p>
        </div>

        <div className="manual-task-form">
          <input
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="@design-agent create an ad copy for running shoes"
          />

          <button onClick={handleSendTask} disabled={isSending}>
            {isSending ? "Sending..." : "Send Task"}
          </button>
        </div>

        {error && <div className="manual-task-error">{error}</div>}

        {result && (
          <div className="manual-task-result">
            <strong>Latest Result</strong>
            <p>{result}</p>
          </div>
        )}
      </div>
    </section>
  );
}