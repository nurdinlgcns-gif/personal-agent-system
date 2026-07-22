import { useMemo, useState } from "react";
import type {
  AgentStatusPayload,
  TaskEventPayload,
} from "../../types/websocket";

type CombinedEvent =
  | {
      type: "agent-status";
      status: string;
      agentName: string;
      timestamp: string;
    }
  | {
      type: "task-event";
      status: string;
      agentName: string;
      timestamp: string;
      source?: string;
      taskId?: string;
    };

type EventTimelineProps = {
  agentEvents: AgentStatusPayload[];
  taskEvents: TaskEventPayload[];
  onClearEvents: () => void;
  isProcessing: boolean;
};

const EVENTS_PAGE_SIZE = 10;

function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString();
}

function getEventLabel(type: CombinedEvent["type"]) {
  if (type === "agent-status") {
    return "Agent status";
  }

  return "Task event";
}

function EventDetailModal({
  event,
  onClose,
}: {
  event: CombinedEvent;
  onClose: () => void;
}) {
  return (
    <div className="dashboard-event-modal-backdrop">
      <section className="dashboard-event-modal">
        <header>
          <div>
            <span>Event Detail</span>
            <h2>{getEventLabel(event.type)}</h2>
            <p>
              @{event.agentName} is {event.status}
            </p>
          </div>

          <button type="button" onClick={onClose} aria-label="Close event detail">
            ×
          </button>
        </header>

        <div className="dashboard-event-detail-grid">
          <div>
            <span>Type</span>
            <strong>{getEventLabel(event.type)}</strong>
          </div>

          <div>
            <span>Agent</span>
            <strong>@{event.agentName}</strong>
          </div>

          <div>
            <span>Status</span>
            <strong>{event.status}</strong>
          </div>

          <div>
            <span>Timestamp</span>
            <strong>{formatDateTime(event.timestamp)}</strong>
          </div>

          {"source" in event && (
            <div>
              <span>Source</span>
              <strong>{event.source || "-"}</strong>
            </div>
          )}

          {"taskId" in event && (
            <div>
              <span>Task ID</span>
              <strong>{event.taskId || "-"}</strong>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export function EventTimeline({
  agentEvents,
  taskEvents,
  onClearEvents,
  isProcessing,
}: EventTimelineProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedEventKey, setSelectedEventKey] = useState<string | null>(null);

  const combinedEvents: CombinedEvent[] = useMemo(() => {
    return [
      ...agentEvents.map((event) => ({
        type: "agent-status" as const,
        status: event.status,
        agentName: event.agentName,
        timestamp: event.timestamp,
      })),
      ...taskEvents.map((event) => ({
        type: "task-event" as const,
        status: event.status,
        agentName: event.agentName,
        timestamp: event.timestamp,
        source: event.source,
        taskId: event.taskId,
      })),
    ].sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [agentEvents, taskEvents]);

  const totalPages = Math.max(
    1,
    Math.ceil(combinedEvents.length / EVENTS_PAGE_SIZE)
  );

  const normalizedPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (normalizedPage - 1) * EVENTS_PAGE_SIZE;
  const pageEndIndex = Math.min(
    pageStartIndex + EVENTS_PAGE_SIZE,
    combinedEvents.length
  );

  const paginatedEvents = combinedEvents.slice(pageStartIndex, pageEndIndex);

  const selectedEvent = useMemo(() => {
    if (!selectedEventKey) {
      return null;
    }

    return (
      combinedEvents.find(
        (event, index) =>
          `${event.timestamp}-${event.type}-${event.agentName}-${index}` ===
          selectedEventKey
      ) || null
    );
  }, [combinedEvents, selectedEventKey]);

  return (
    <section className="panel timeline-panel dashboard-events-polish">
      <div className="panel-header">
        <div>
          <h2>Realtime Event Timeline</h2>
          <p className="panel-subtitle">
            {isProcessing ? "Live processing active" : "Live WebSocket events"}
          </p>
        </div>

        <div className="panel-header-actions">
          <span className={`live-badge ${isProcessing ? "processing" : ""}`}>
            {isProcessing ? "Processing" : "Live"}
          </span>

          <button type="button" onClick={onClearEvents}>
            Clear
          </button>
        </div>
      </div>

      {combinedEvents.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">◇</div>
          <strong>No realtime events yet</strong>
          <p>Send a command from WhatsApp or Floating Assistant to see live events here.</p>
        </div>
      ) : (
        <>
          <div className="dashboard-event-table">
            <div className="dashboard-event-row header">
              <span>Time</span>
              <span>Type</span>
              <span>Agent</span>
              <span>Status</span>
              <span>Source</span>
              <span>Action</span>
            </div>

            {paginatedEvents.map((event, index) => {
              const eventKey = `${event.timestamp}-${event.type}-${event.agentName}-${index}`;

              return (
                <button
                  type="button"
                  key={eventKey}
                  className="dashboard-event-row"
                  onClick={() => setSelectedEventKey(eventKey)}
                >
                  <span>{formatTime(event.timestamp)}</span>
                  <span>{getEventLabel(event.type)}</span>
                  <span className="agent">@{event.agentName}</span>
                  <span>
                    <strong className={`dashboard-status-pill ${event.status}`}>
                      {event.status}
                    </strong>
                  </span>
                  <span>{"source" in event ? event.source || "-" : "websocket"}</span>
                  <span>
                    <strong className="dashboard-table-details">Details</strong>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="dashboard-table-pagination">
            <div>
              Showing{" "}
              <strong>
                {combinedEvents.length === 0 ? 0 : pageStartIndex + 1}
              </strong>{" "}
              to <strong>{pageEndIndex}</strong> of{" "}
              <strong>{combinedEvents.length}</strong> events
            </div>

            <div className="dashboard-table-pagination-actions">
              <button
                type="button"
                onClick={() => setCurrentPage((current) => Math.max(1, current - 1))}
                disabled={normalizedPage <= 1}
              >
                Previous
              </button>

              <span>
                Page {normalizedPage} / {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage((current) => Math.min(totalPages, current + 1))}
                disabled={normalizedPage >= totalPages}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEventKey(null)}
        />
      )}
    </section>
  );
}