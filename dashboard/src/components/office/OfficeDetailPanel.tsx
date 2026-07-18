import type { TaskSnapshot } from "../../types/api";
import { RuntimeMemoryTaskMetadata } from "../runtime/RuntimeMemoryTaskMetadata";

export type OfficeDetailItem = {
  type: "agent" | "source" | "skill" | "output" | "server" | "task";
  title: string;
  subtitle: string;
  status?: string;
  accent?:
  | "green"
  | "blue"
  | "purple"
  | "pink"
  | "yellow"
  | "cyan"
  | "orange"
  | "red";
  body?: string;
  runtimeMemoryTask?: TaskSnapshot | null;
  metadata: Array<{
    label: string;
    value: string;
  }>;
};

type OfficeDetailPanelProps = {
  item: OfficeDetailItem | null;
  onClose: () => void;
};

function getTypeLabel(type: OfficeDetailItem["type"]) {
  if (type === "agent") {
    return "Agent Detail";
  }

  if (type === "source") {
    return "Source Detail";
  }

  if (type === "skill") {
    return "Skill Detail";
  }

  if (type === "output") {
    return "Output Detail";
  }

  if (type === "server") {
    return "System Detail";
  }

  return "Task Detail";
}

export function OfficeDetailPanel({ item, onClose }: OfficeDetailPanelProps) {
  if (!item) {
    return null;
  }

  return (
    <aside
      className={`office-detail-panel ${item.accent || "blue"}`}
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <div className="office-detail-header">
        <div>
          <span className="office-detail-type">{getTypeLabel(item.type)}</span>
          <h3>{item.title}</h3>
          <p>{item.subtitle}</p>
        </div>

        <button onClick={onClose} aria-label="Close office detail panel">
          ×
        </button>
      </div>

      {item.status && (
        <div className={`office-detail-status ${item.status}`}>
          <span />
          {item.status}
        </div>
      )}

      {item.body && (
        <div className="office-detail-body">
          <strong>Summary</strong>
          <p>{item.body}</p>
        </div>
      )}

      {item.runtimeMemoryTask && (
        <div className="office-detail-body">
          <strong>Runtime Memory</strong>
          <RuntimeMemoryTaskMetadata task={item.runtimeMemoryTask} />
        </div>
      )}

      <div className="office-detail-metadata">
        {item.metadata.map((entry) => (
          <div key={`${entry.label}-${entry.value}`} className="office-detail-row">
            <small>{entry.label}</small>
            <strong title={entry.value}>{entry.value}</strong>
          </div>
        ))}
      </div>
    </aside>
  );
}