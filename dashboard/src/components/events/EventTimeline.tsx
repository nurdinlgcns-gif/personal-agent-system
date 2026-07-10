import type { AgentStatusPayload, TaskEventPayload } from "../../types/websocket";

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
};

export function EventTimeline({
  agentEvents,
  taskEvents,
}: EventTimelineProps) {
  const combinedEvents: CombinedEvent[] = [
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
  ]
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
    .slice(0, 8);

  return (
    <section className="panel timeline-panel">
      <div className="panel-header">
        <h2>Realtime Event Timeline</h2>
        <span className="live-badge">Live</span>
      </div>

      <div className="timeline-list">
        {combinedEvents.length === 0 ? (
          <p className="muted">No realtime events yet.</p>
        ) : (
          combinedEvents.map((event, index) => (
            <div
              key={`${event.timestamp}-${index}`}
              className={`timeline-item ${event.status}`}
            >
              <span className="timeline-time">
                {new Date(event.timestamp).toLocaleTimeString()}
              </span>

              <div>
                <strong>{event.type}</strong>
                <p>
                  {event.agentName} is {event.status}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
