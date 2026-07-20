import { useMemo, useState } from "react";
import type {
  MemoryVaultChunk,
  MemoryVaultItem,
} from "../../services/memoryVaultApi";

type KnowledgeSourceAuditPanelProps = {
  memories: MemoryVaultItem[];
  chunks: MemoryVaultChunk[];
  selectedMemoryId?: string | null;
  onSelectMemory: (memoryId: string) => void;
};

type KnowledgeSourceAuditItem = {
  memory: MemoryVaultItem;
  chunks: MemoryVaultChunk[];
  embeddedCount: number;
  pendingCount: number;
  failedCount: number;
  totalTokens: number;
  totalChars: number;
};

function normalizeSearch(value: string) {
  return value.toLowerCase().trim();
}

function getKnowledgeTitle(memory: MemoryVaultItem) {
  const firstTitleLine = memory.content
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.toLowerCase().startsWith("knowledge source title:"));

  if (firstTitleLine) {
    return firstTitleLine.replace(/^knowledge source title:\s*/i, "").trim();
  }

  if (memory.sourceRef) {
    return memory.sourceRef.replace(/^knowledge-source\//, "");
  }

  return memory.type.replace(/_/g, " ");
}

function getShortContentPreview(memory: MemoryVaultItem) {
  const cleaned = memory.content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.toLowerCase().startsWith("knowledge source title:"))
    .filter((line) => !line.toLowerCase().startsWith("source reference:"))
    .join(" ");

  if (cleaned.length <= 220) {
    return cleaned;
  }

  return `${cleaned.slice(0, 220).trim()}...`;
}

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((left, right) =>
    left.localeCompare(right)
  );
}

function buildAuditItems(memories: MemoryVaultItem[], chunks: MemoryVaultChunk[]) {
  const chunksByMemoryId = chunks.reduce<Record<string, MemoryVaultChunk[]>>(
    (accumulator, chunk) => {
      if (!accumulator[chunk.memoryId]) {
        accumulator[chunk.memoryId] = [];
      }

      accumulator[chunk.memoryId].push(chunk);
      return accumulator;
    },
    {}
  );

  return memories
    .filter(
      (memory) =>
        memory.type === "knowledge_source" ||
        memory.sourceType === "knowledge_source"
    )
    .map<KnowledgeSourceAuditItem>((memory) => {
      const memoryChunks = chunksByMemoryId[memory.id] || [];

      return {
        memory,
        chunks: memoryChunks,
        embeddedCount: memoryChunks.filter(
          (chunk) => chunk.embeddingStatus === "embedded"
        ).length,
        pendingCount: memoryChunks.filter(
          (chunk) => chunk.embeddingStatus === "pending"
        ).length,
        failedCount: memoryChunks.filter(
          (chunk) => chunk.embeddingStatus === "error"
        ).length,
        totalTokens: memoryChunks.reduce(
          (total, chunk) => total + chunk.tokenEstimate,
          0
        ),
        totalChars: memoryChunks.reduce(
          (total, chunk) => total + chunk.charCount,
          0
        ),
      };
    })
    .sort((left, right) =>
      getKnowledgeTitle(left.memory).localeCompare(getKnowledgeTitle(right.memory))
    );
}

function AuditMetric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="knowledge-audit-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function AuditPills({
  values,
  emptyLabel = "none",
}: {
  values: string[];
  emptyLabel?: string;
}) {
  if (values.length === 0) {
    return (
      <div className="knowledge-audit-pills">
        <span>{emptyLabel}</span>
      </div>
    );
  }

  return (
    <div className="knowledge-audit-pills">
      {values.slice(0, 5).map((value) => (
        <span key={value}>{value}</span>
      ))}

      {values.length > 5 && <span>+{values.length - 5}</span>}
    </div>
  );
}

export function KnowledgeSourceAuditPanel({
  memories,
  chunks,
  selectedMemoryId,
  onSelectMemory,
}: KnowledgeSourceAuditPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [agentFilter, setAgentFilter] = useState("all");
  const [scopeFilter, setScopeFilter] = useState("all");

  const auditItems = useMemo(
    () => buildAuditItems(memories, chunks),
    [memories, chunks]
  );

  const agentOptions = useMemo(
    () => uniqueSorted(auditItems.map((item) => item.memory.agentName)),
    [auditItems]
  );

  const scopeOptions = useMemo(
    () => uniqueSorted(auditItems.map((item) => item.memory.scope)),
    [auditItems]
  );

  const filteredItems = useMemo(() => {
    const normalizedSearch = normalizeSearch(searchQuery);

    return auditItems.filter((item) => {
      const agentMatches =
        agentFilter === "all" || item.memory.agentName === agentFilter;

      const scopeMatches =
        scopeFilter === "all" || item.memory.scope === scopeFilter;

      const searchableText = [
        getKnowledgeTitle(item.memory),
        item.memory.agentName,
        item.memory.scope,
        item.memory.sourceRef || "",
        item.memory.allowedAgents.join(" "),
        item.memory.linkedSkillNames.join(" "),
        item.memory.sensitivityLevel,
        item.memory.content,
      ]
        .join(" ")
        .toLowerCase();

      const searchMatches =
        !normalizedSearch || searchableText.includes(normalizedSearch);

      return agentMatches && scopeMatches && searchMatches;
    });
  }, [auditItems, agentFilter, scopeFilter, searchQuery]);

  const totalChunks = auditItems.reduce(
    (total, item) => total + item.chunks.length,
    0
  );

  const embeddedChunks = auditItems.reduce(
    (total, item) => total + item.embeddedCount,
    0
  );

  const pendingChunks = auditItems.reduce(
    (total, item) => total + item.pendingCount,
    0
  );

  const failedChunks = auditItems.reduce(
    (total, item) => total + item.failedCount,
    0
  );

  function clearFilters() {
    setSearchQuery("");
    setAgentFilter("all");
    setScopeFilter("all");
  }

  return (
    <section className="knowledge-source-audit-card">
      <div className="memory-section-title">
        <div>
          <span>Import audit</span>
          <h3>Knowledge Source Registry</h3>
        </div>

        <div className="memory-page-badge">
          {auditItems.length} sources
        </div>
      </div>

      <p>
        Audit imported knowledge sources, chunk readiness, embedding status,
        source references, linked skills, and retrieval scope.
      </p>

      <div className="knowledge-audit-summary-grid">
        <AuditMetric label="Sources" value={auditItems.length} />
        <AuditMetric label="Chunks" value={totalChunks} />
        <AuditMetric label="Embedded" value={embeddedChunks} />
        <AuditMetric label="Pending" value={pendingChunks} />
        <AuditMetric label="Failed" value={failedChunks} />
      </div>

      <div className="knowledge-audit-filter-grid">
        <label className="memory-filter-field search-field">
          <span>Search sources</span>
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search title, sourceRef, skill, content..."
          />
        </label>

        <label className="memory-filter-field">
          <span>Agent</span>
          <select
            value={agentFilter}
            onChange={(event) => setAgentFilter(event.target.value)}
          >
            <option value="all">All agents</option>
            {agentOptions.map((agent) => (
              <option key={agent} value={agent}>
                @{agent}
              </option>
            ))}
          </select>
        </label>

        <label className="memory-filter-field">
          <span>Scope</span>
          <select
            value={scopeFilter}
            onChange={(event) => setScopeFilter(event.target.value)}
          >
            <option value="all">All scopes</option>
            {scopeOptions.map((scope) => (
              <option key={scope} value={scope}>
                {scope}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className="knowledge-audit-clear-button"
          onClick={clearFilters}
          disabled={
            !searchQuery.trim() && agentFilter === "all" && scopeFilter === "all"
          }
        >
          Clear filters
        </button>
      </div>

      {auditItems.length === 0 ? (
        <div className="knowledge-audit-empty">
          <strong>No imported knowledge source yet.</strong>
          <span>
            Use the Knowledge Source Import panel to import text, markdown, or
            backend files into the RAG pipeline.
          </span>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="knowledge-audit-empty">
          <strong>No knowledge source matched the filters.</strong>
          <span>Try another keyword, agent, or scope.</span>
        </div>
      ) : (
        <div className="knowledge-audit-list">
          {filteredItems.map((item) => {
            const isActive = selectedMemoryId === item.memory.id;

            return (
              <button
                type="button"
                key={item.memory.id}
                className={`knowledge-audit-item ${isActive ? "active" : ""}`}
                onClick={() => onSelectMemory(item.memory.id)}
              >
                <div className="knowledge-audit-item-header">
                  <div>
                    <span>@{item.memory.agentName}</span>
                    <strong>{getKnowledgeTitle(item.memory)}</strong>
                  </div>

                  <div className="knowledge-audit-source-status">
                    {item.embeddedCount}/{item.chunks.length} embedded
                  </div>
                </div>

                <p>{getShortContentPreview(item.memory)}</p>

                <div className="knowledge-audit-stat-row">
                  <AuditMetric label="Scope" value={item.memory.scope} />
                  <AuditMetric label="Chunks" value={item.chunks.length} />
                  <AuditMetric label="Tokens" value={item.totalTokens} />
                  <AuditMetric label="Chars" value={item.totalChars} />
                </div>

                <div className="knowledge-audit-detail-grid">
                  <div>
                    <span>Source Ref</span>
                    <strong title={item.memory.sourceRef || "-"}>
                      {item.memory.sourceRef || "-"}
                    </strong>
                  </div>

                  <div>
                    <span>Sensitivity</span>
                    <strong>{item.memory.sensitivityLevel}</strong>
                  </div>
                </div>

                <div className="knowledge-audit-pill-section">
                  <span>Linked skills</span>
                  <AuditPills values={item.memory.linkedSkillNames} />
                </div>

                <div className="knowledge-audit-pill-section">
                  <span>Allowed agents</span>
                  <AuditPills
                    values={item.memory.allowedAgents.map((agent) => `@${agent}`)}
                    emptyLabel="project/global"
                  />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}