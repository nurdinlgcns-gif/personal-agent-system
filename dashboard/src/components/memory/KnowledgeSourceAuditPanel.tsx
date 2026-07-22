import { useMemo, useState } from "react";
import type {
  MemoryVaultChunk,
  MemoryVaultItem,
} from "../../services/memoryVaultApi";

const KNOWLEDGE_SOURCE_PAGE_SIZE = 10;

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

function truncateText(value: string, maxLength = 140) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength).trim()}...`;
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

  return truncateText(cleaned, 260);
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
      {values.slice(0, 8).map((value) => (
        <span key={value}>{value}</span>
      ))}

      {values.length > 8 && <span>+{values.length - 8}</span>}
    </div>
  );
}

function KnowledgeSourceDetailModal({
  item,
  onClose,
}: {
  item: KnowledgeSourceAuditItem;
  onClose: () => void;
}) {
  return (
    <div className="knowledge-audit-modal-backdrop">
      <section className="knowledge-audit-modal">
        <header>
          <div>
            <span>Knowledge Source Detail</span>
            <h2>{getKnowledgeTitle(item.memory)}</h2>
            <p>{getShortContentPreview(item.memory)}</p>
          </div>

          <button type="button" onClick={onClose} aria-label="Close source detail">
            ×
          </button>
        </header>

        <div className="knowledge-audit-modal-grid">
          <AuditMetric label="Agent" value={`@${item.memory.agentName}`} />
          <AuditMetric label="Scope" value={item.memory.scope} />
          <AuditMetric label="Chunks" value={item.chunks.length} />
          <AuditMetric label="Embedded" value={item.embeddedCount} />
          <AuditMetric label="Pending" value={item.pendingCount} />
          <AuditMetric label="Failed" value={item.failedCount} />
          <AuditMetric label="Tokens" value={item.totalTokens} />
          <AuditMetric label="Chars" value={item.totalChars} />
          <AuditMetric label="Sensitivity" value={item.memory.sensitivityLevel} />
          <AuditMetric label="Runtime" value={item.memory.runtimeInjectable ? "Yes" : "No"} />
          <AuditMetric label="RAG" value={item.memory.ragEnabled ? "Yes" : "No"} />
          <AuditMetric label="Created" value={new Date(item.memory.createdAt).toLocaleString()} />
        </div>

        <section className="knowledge-audit-modal-section">
          <span>Source reference</span>
          <strong>{item.memory.sourceRef || "-"}</strong>
        </section>

        <section className="knowledge-audit-modal-section">
          <span>Linked skills</span>
          <AuditPills values={item.memory.linkedSkillNames} />
        </section>

        <section className="knowledge-audit-modal-section">
          <span>Allowed agents</span>
          <AuditPills
            values={item.memory.allowedAgents.map((agent) => `@${agent}`)}
            emptyLabel="project/global"
          />
        </section>

        <section className="knowledge-audit-modal-section">
          <span>Content preview</span>
          <pre>{item.memory.content}</pre>
        </section>
      </section>
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
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);

  const auditItems = useMemo(
    () => buildAuditItems(memories, chunks),
    [memories, chunks]
  );

  const selectedSource = useMemo(() => {
    if (!selectedSourceId) {
      return null;
    }

    return auditItems.find((item) => item.memory.id === selectedSourceId) || null;
  }, [auditItems, selectedSourceId]);

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

  const totalPages = Math.max(
    1,
    Math.ceil(filteredItems.length / KNOWLEDGE_SOURCE_PAGE_SIZE)
  );

  const normalizedPage = Math.min(currentPage, totalPages);
  const pageStart = (normalizedPage - 1) * KNOWLEDGE_SOURCE_PAGE_SIZE;
  const pageEnd = Math.min(pageStart + KNOWLEDGE_SOURCE_PAGE_SIZE, filteredItems.length);
  const paginatedItems = filteredItems.slice(pageStart, pageEnd);

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
    setCurrentPage(1);
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
        <AuditMetric label="Filtered" value={filteredItems.length} />
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
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search title, sourceRef, skill, content..."
          />
        </label>

        <label className="memory-filter-field">
          <span>Agent</span>
          <select
            value={agentFilter}
            onChange={(event) => {
              setAgentFilter(event.target.value);
              setCurrentPage(1);
            }}
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
            onChange={(event) => {
              setScopeFilter(event.target.value);
              setCurrentPage(1);
            }}
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
        <>
          <div className="knowledge-source-table">
            <div className="knowledge-source-row header">
              <span>Source</span>
              <span>Agent</span>
              <span>Scope</span>
              <span>Chunks</span>
              <span>Embedded</span>
              <span>Tokens</span>
              <span>Skills</span>
              <span>Action</span>
            </div>

            {paginatedItems.map((item) => {
              const isActive = selectedMemoryId === item.memory.id;

              return (
                <button
                  type="button"
                  key={item.memory.id}
                  className={`knowledge-source-row ${isActive ? "active" : ""}`}
                  onClick={() => {
                    onSelectMemory(item.memory.id);
                    setSelectedSourceId(item.memory.id);
                  }}
                >
                  <span className="source-title">
                    <strong>{getKnowledgeTitle(item.memory)}</strong>
                    <small>{truncateText(item.memory.sourceRef || "-", 70)}</small>
                  </span>

                  <span>@{item.memory.agentName}</span>
                  <span>{item.memory.scope}</span>
                  <span>{item.chunks.length}</span>
                  <span>{item.embeddedCount}/{item.chunks.length}</span>
                  <span>{item.totalTokens}</span>
                  <span>{item.memory.linkedSkillNames.length}</span>

                  <span>
                    <strong className="knowledge-source-details">Details</strong>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="knowledge-source-pagination">
            <div>
              Showing <strong>{filteredItems.length === 0 ? 0 : pageStart + 1}</strong>{" "}
              to <strong>{pageEnd}</strong> of <strong>{filteredItems.length}</strong>{" "}
              sources
            </div>

            <div className="knowledge-source-pagination-actions">
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
                onClick={() =>
                  setCurrentPage((current) => Math.min(totalPages, current + 1))
                }
                disabled={normalizedPage >= totalPages}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      {selectedSource && (
        <KnowledgeSourceDetailModal
          item={selectedSource}
          onClose={() => setSelectedSourceId(null)}
        />
      )}
    </section>
  );
}