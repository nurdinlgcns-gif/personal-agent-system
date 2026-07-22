import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  fetchMemoryVaultChunks,
  fetchMemoryVaultItems,
  fetchMemoryVaultSummary,
  rebuildMemoryVaultChunks,
  searchSemanticMemory,
  type MemoryVaultChunk,
  type MemoryVaultItem,
  type MemoryVaultSummary,
  type SemanticMemorySearchResponse,
} from "../services/memoryVaultApi";
import { MemoryMaintenancePanel } from "../components/memory/MemoryMaintenancePanel";
import { KnowledgeSourceImportPanel } from "../components/memory/KnowledgeSourceImportPanel";
import { KnowledgeSourceAuditPanel } from "../components/memory/KnowledgeSourceAuditPanel";
import { KnowledgeSourceImportHistoryPanel } from "../components/memory/KnowledgeSourceImportHistoryPanel";
import {
  ActionButton,
  EmptyState,
  ErrorState,
  InfoPill,
  PageHero,
  PageShell,
  PanelCard,
} from "../components/ui";

type MemoryVaultTab =
  | "overview"
  | "memories"
  | "knowledgeSources"
  | "importAudit"
  | "retrievalLab"
  | "maintenance";

const MEMORY_RECORDS_PAGE_SIZE = 10;

const memoryVaultTabs: Array<{
  id: MemoryVaultTab;
  label: string;
  description: string;
}> = [
  {
    id: "overview",
    label: "Overview",
    description: "High-level memory, chunk, and retrieval readiness summary.",
  },
  {
    id: "memories",
    label: "Memories",
    description: "Search, filter, inspect, and rebuild memory records.",
  },
  {
    id: "knowledgeSources",
    label: "Knowledge Sources",
    description: "Review imported knowledge source registry and chunk mapping.",
  },
  {
    id: "importAudit",
    label: "Import & Audit",
    description: "Import text or Markdown and inspect version history.",
  },
  {
    id: "retrievalLab",
    label: "Retrieval Lab",
    description: "Preview semantic retrieval and RAG guard behavior.",
  },
  {
    id: "maintenance",
    label: "Maintenance",
    description: "Run chunking, embedding, and skill-to-RAG refresh tasks.",
  },
];

function formatDateTime(value?: string | null) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString();
}

function getMemoryInitial(agentName: string) {
  return agentName
    .replace(/^@/, "")
    .split(/[-_\s]/)
    .map((part) => part.charAt(0).toUpperCase())
    .filter(Boolean)
    .slice(0, 2)
    .join("");
}

function getMemoryTypeLabel(type: string) {
  return type.replace(/_/g, " ");
}

function normalizeSearchValue(value: string) {
  return value.toLowerCase().trim();
}

function matchesSearch(memory: MemoryVaultItem, searchQuery: string) {
  const normalizedSearch = normalizeSearchValue(searchQuery);

  if (!normalizedSearch) {
    return true;
  }

  const searchableText = [
    memory.agentName,
    memory.type,
    getMemoryTypeLabel(memory.type),
    memory.scope,
    memory.ownerAgentName || "",
    memory.allowedAgents.join(" "),
    memory.linkedSkillNames.join(" "),
    memory.sensitivityLevel,
    memory.sourceType,
    memory.sourceRef || "",
    memory.runtimeInjectable ? "runtime injectable" : "",
    memory.ragEnabled ? "rag enabled" : "",
    memory.content,
    memory.createdAt,
  ]
    .join(" ")
    .toLowerCase();

  return searchableText.includes(normalizedSearch);
}

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values)).sort((left, right) =>
    left.localeCompare(right)
  );
}

function truncateText(value: string, maxLength = 420) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength).trim()}...`;
}

function parseCommaList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function SummaryMetric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="memory-summary-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function MemoryFilterPanel({
  searchQuery,
  selectedAgent,
  selectedType,
  agentOptions,
  typeOptions,
  totalCount,
  filteredCount,
  onSearchChange,
  onAgentChange,
  onTypeChange,
  onClearFilters,
}: {
  searchQuery: string;
  selectedAgent: string;
  selectedType: string;
  agentOptions: string[];
  typeOptions: string[];
  totalCount: number;
  filteredCount: number;
  onSearchChange: (value: string) => void;
  onAgentChange: (value: string) => void;
  onTypeChange: (value: string) => void;
  onClearFilters: () => void;
}) {
  const hasActiveFilter =
    searchQuery.trim().length > 0 ||
    selectedAgent !== "all" ||
    selectedType !== "all";

  return (
    <section className="memory-filter-panel">
      <div className="memory-filter-header">
        <div>
          <span>Search & filter</span>
          <h3>Memory Discovery</h3>
        </div>

        <div className="memory-filter-count">
          {filteredCount} / {totalCount}
        </div>
      </div>

      <div className="memory-filter-grid">
        <label className="memory-filter-field search-field">
          <span>Search memory</span>
          <input
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search content, agent, type, scope, skill..."
          />
        </label>

        <label className="memory-filter-field">
          <span>Agent</span>
          <select
            value={selectedAgent}
            onChange={(event) => onAgentChange(event.target.value)}
          >
            <option value="all">All agents</option>
            {agentOptions.map((agentName) => (
              <option key={agentName} value={agentName}>
                @{agentName}
              </option>
            ))}
          </select>
        </label>

        <label className="memory-filter-field">
          <span>Type</span>
          <select
            value={selectedType}
            onChange={(event) => onTypeChange(event.target.value)}
          >
            <option value="all">All types</option>
            {typeOptions.map((type) => (
              <option key={type} value={type}>
                {getMemoryTypeLabel(type)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="memory-filter-chip-row">
        <button type="button" onClick={() => onTypeChange("agent_scope")}>
          agent_scope
        </button>

        <button type="button" onClick={() => onTypeChange("project_context")}>
          project_context
        </button>

        <button type="button" onClick={() => onTypeChange("brand_tone")}>
          brand_tone
        </button>

        <button type="button" onClick={() => onSearchChange("RAG")}>
          RAG
        </button>

        <button type="button" onClick={() => onSearchChange("runtime injectable")}>
          runtime injectable
        </button>

        <button type="button" onClick={() => onSearchChange("internal")}>
          internal
        </button>

        <button type="button" onClick={() => onSearchChange("skill")}>
          skill scope
        </button>

        <button
          type="button"
          onClick={onClearFilters}
          disabled={!hasActiveFilter}
          className="clear-filter-button"
        >
          Clear filters
        </button>
      </div>

      {hasActiveFilter && (
        <div className="memory-active-filter-note">
          Active filter:
          {searchQuery.trim() && <span>search “{searchQuery.trim()}”</span>}
          {selectedAgent !== "all" && <span>@{selectedAgent}</span>}
          {selectedType !== "all" && <span>{selectedType}</span>}
        </div>
      )}
    </section>
  );
}

function ChunkStatusPill({ status }: { status: string }) {
  return <span className={`memory-chunk-status ${status}`}>{status}</span>;
}

function MemoryChunkList({ chunks }: { chunks: MemoryVaultChunk[] }) {
  if (chunks.length === 0) {
    return (
      <div className="memory-chunk-empty">
        <strong>No chunks found.</strong>
        <p>Click Rebuild Chunks to create chunk records for this memory.</p>
      </div>
    );
  }

  return (
    <div className="memory-chunk-list">
      {chunks.map((chunk) => (
        <article key={chunk.id} className="memory-chunk-item">
          <div className="memory-chunk-item-header">
            <div>
              <span>Chunk #{chunk.chunkIndex + 1}</span>
              <strong>
                {chunk.charCount} chars · ~{chunk.tokenEstimate} tokens
              </strong>
            </div>

            <ChunkStatusPill status={chunk.embeddingStatus} />
          </div>

          <p>{chunk.content}</p>

          <div className="memory-roadmap-pills">
            <span>{chunk.memoryType}</span>
            <span>{chunk.scope}</span>
            <span>{chunk.sensitivityLevel}</span>
            {chunk.linkedSkillNames.slice(0, 4).map((skillName) => (
              <span key={`${chunk.id}-${skillName}`}>{skillName}</span>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}

function SemanticSearchPanel({
  agentOptions,
  defaultQuery,
  onRunSearch,
  isSearching,
  result,
}: {
  agentOptions: string[];
  defaultQuery: string;
  isSearching: boolean;
  result: SemanticMemorySearchResponse | null;
  onRunSearch: (payload: {
    query: string;
    agentName?: string;
    topK: number;
    minScore: number;
    matchedSkillNames: string[];
    allowedScopes: string[];
  }) => Promise<void>;
}) {
  const [query, setQuery] = useState(defaultQuery);
  const [agentName, setAgentName] = useState("all");
  const [matchedSkillsText, setMatchedSkillsText] = useState("");
  const [allowedScopesText, setAllowedScopesText] = useState(
    "agent, skill, project, global"
  );
  const [topK, setTopK] = useState(5);
  const [minScore, setMinScore] = useState(0);

  useEffect(() => {
    if (!query.trim() && defaultQuery.trim()) {
      setQuery(defaultQuery);
    }
  }, [defaultQuery, query]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    await onRunSearch({
      query,
      agentName: agentName === "all" ? undefined : agentName,
      topK,
      minScore,
      matchedSkillNames: parseCommaList(matchedSkillsText),
      allowedScopes: parseCommaList(allowedScopesText),
    });
  }

  return (
    <section className="memory-semantic-search-card">
      <div className="memory-section-title">
        <div>
          <span>Semantic retrieval preview</span>
          <h3>Memory Chunk Semantic Search</h3>
        </div>

        <div className="memory-page-badge">
          {result ? `${result.returnedCount} results` : "Preview"}
        </div>
      </div>

      <form className="memory-semantic-search-form" onSubmit={handleSubmit}>
        <label className="memory-filter-field search-field">
          <span>Semantic query</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="contoh: buat caption promosi kopi susu dengan gaya santai"
          />
        </label>

        <label className="memory-filter-field">
          <span>Agent filter</span>
          <select
            value={agentName}
            onChange={(event) => setAgentName(event.target.value)}
          >
            <option value="all">All allowed chunks</option>
            {agentOptions.map((agent) => (
              <option key={agent} value={agent}>
                @{agent}
              </option>
            ))}
          </select>
        </label>

        <label className="memory-filter-field">
          <span>Matched skills</span>
          <input
            value={matchedSkillsText}
            onChange={(event) => setMatchedSkillsText(event.target.value)}
            placeholder="generate_ad_copy, social_caption"
          />
        </label>

        <label className="memory-filter-field">
          <span>Allowed scopes</span>
          <input
            value={allowedScopesText}
            onChange={(event) => setAllowedScopesText(event.target.value)}
            placeholder="agent, skill, project, global"
          />
        </label>

        <label className="memory-filter-field">
          <span>Top K</span>
          <input
            type="number"
            min={1}
            max={50}
            value={topK}
            onChange={(event) => setTopK(Number(event.target.value))}
          />
        </label>

        <label className="memory-filter-field">
          <span>Min score</span>
          <input
            type="number"
            min={-1}
            max={1}
            step={0.01}
            value={minScore}
            onChange={(event) => setMinScore(Number(event.target.value))}
          />
        </label>

        <button type="submit" disabled={isSearching || !query.trim()}>
          {isSearching ? "Searching..." : "Run Semantic Search"}
        </button>
      </form>

      {result && (
        <div className="memory-semantic-result-summary">
          <SummaryMetric label="Provider" value={result.provider.id} />
          <SummaryMetric label="Model" value={result.provider.model} />
          <SummaryMetric label="Candidates" value={result.totalCandidates} />
          <SummaryMetric label="Eligible" value={result.eligibleCandidates} />
          <SummaryMetric label="Returned" value={result.returnedCount} />
        </div>
      )}

      {result && (
        <div className="memory-active-filter-note">
          Guard:
          {result.agentName && <span>@{result.agentName}</span>}
          {result.matchedSkillNames.map((skillName) => (
            <span key={`matched-${skillName}`}>skill:{skillName}</span>
          ))}
          {result.allowedScopes.map((scope) => (
            <span key={`scope-${scope}`}>scope:{scope}</span>
          ))}
          {result.allowedSensitivityLevels.map((level) => (
            <span key={`sensitivity-${level}`}>sensitivity:{level}</span>
          ))}
        </div>
      )}

      {result && result.results.length === 0 && (
        <div className="memory-chunk-empty">
          <strong>No semantic result found.</strong>
          <p>
            Make sure chunks are rebuilt and embedded, then try another query or
            lower the min score.
          </p>
        </div>
      )}

      {result && result.results.length > 0 && (
        <div className="memory-semantic-result-list">
          {result.results.map((item) => (
            <article key={item.chunkId} className="memory-semantic-result-item">
              <div className="memory-semantic-result-header">
                <div>
                  <span>@{item.agentName}</span>
                  <strong>
                    {item.memoryType} · chunk #{item.chunkIndex + 1}
                  </strong>
                </div>

                <div className="memory-semantic-score">
                  {item.score.toFixed(4)}
                </div>
              </div>

              <p>{truncateText(item.content, 520)}</p>

              <div className="memory-roadmap-pills">
                <span>{item.scope}</span>
                <span>{item.sensitivityLevel}</span>
                <span>{item.embeddingModel || "embedding"}</span>
                {item.linkedSkillNames.slice(0, 4).map((skillName) => (
                  <span key={`${item.chunkId}-${skillName}`}>{skillName}</span>
                ))}
              </div>

              <div className="memory-semantic-guard-pills">
                {item.accessReasons.slice(0, 5).map((reason) => (
                  <span key={`${item.chunkId}-access-${reason}`}>{reason}</span>
                ))}

                {item.matchReasons.slice(0, 5).map((reason) => (
                  <span key={`${item.chunkId}-match-${reason}`}>{reason}</span>
                ))}

                {item.matchedSkillNames.slice(0, 4).map((skillName) => (
                  <span key={`${item.chunkId}-matched-${skillName}`}>
                    matched:{skillName}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function MemoryScopePlaceholder({ memory }: { memory: MemoryVaultItem }) {
  return (
    <section className="memory-scope-card">
      <div className="memory-section-title">
        <div>
          <span>Memory scope</span>
          <h3>Access Control & RAG Readiness</h3>
        </div>

        <div className="memory-page-badge">Planned</div>
      </div>

      <p>
        This memory is currently scoped to <strong>@{memory.agentName}</strong>.
        Future phases will define which agents, skills, and runtime channels are
        allowed to retrieve this memory during RAG.
      </p>

      <div className="memory-roadmap-pills">
        <span>Agent scoped</span>
        <span>Skill scoped</span>
        <span>Chunking</span>
        <span>Embedding</span>
        <span>Vector retrieval</span>
        <span>Runtime injection</span>
      </div>
    </section>
  );
}

function MemoryChunkSummarySection({
  summary,
  chunks,
}: {
  summary: MemoryVaultSummary | null;
  chunks: MemoryVaultChunk[];
}) {
  return (
    <section className="memory-chunk-summary-card">
      <div className="memory-section-title">
        <div>
          <span>Chunking foundation</span>
          <h3>Memory Chunk Summary</h3>
        </div>

        <div className="memory-page-badge">
          {summary?.totalChunks ?? chunks.length} chunks
        </div>
      </div>

      <div className="memory-summary-grid">
        <SummaryMetric
          label="Total Chunks"
          value={summary?.totalChunks ?? chunks.length}
        />
        <SummaryMetric
          label="Chunked Memories"
          value={summary?.chunkedMemoryCount ?? 0}
        />
        <SummaryMetric
          label="Pending Embeddings"
          value={summary?.pendingEmbeddings ?? 0}
        />
        <SummaryMetric
          label="Embedded Chunks"
          value={summary?.embeddedChunks ?? 0}
        />
        <SummaryMetric
          label="Chunk Chars"
          value={summary?.totalChunkChars ?? 0}
        />
        <SummaryMetric
          label="Token Estimate"
          value={summary?.totalChunkTokenEstimate ?? 0}
        />
      </div>
    </section>
  );
}

function MemoryOverviewTab({
  memories,
  chunks,
  summary,
  runtimeInjectableCount,
  ragEnabledCount,
  knowledgeSourceCount,
}: {
  memories: MemoryVaultItem[];
  chunks: MemoryVaultChunk[];
  summary: MemoryVaultSummary | null;
  selectedMemory: MemoryVaultItem | null;
  runtimeInjectableCount: number;
  ragEnabledCount: number;
  knowledgeSourceCount: number;
  onOpenMemories: () => void;
  onOpenKnowledgeSources: () => void;
  onOpenRetrievalLab: () => void;
  onOpenMaintenance: () => void;
}) {
  const totalMemories = summary?.totalMemories ?? memories.length;
  const totalChunks = summary?.totalChunks ?? chunks.length;
  const embeddedChunks = summary?.embeddedChunks ?? 0;
  const pendingEmbeddings = summary?.pendingEmbeddings ?? 0;
  const chunkedMemoryCount = summary?.chunkedMemoryCount ?? 0;
  const failedEmbeddings = summary?.failedEmbeddings ?? 0;

  const embeddingRate =
    totalChunks > 0 ? Math.round((embeddedChunks / totalChunks) * 100) : 0;

  const memoryCoverageRate =
    totalMemories > 0
      ? Math.round((chunkedMemoryCount / totalMemories) * 100)
      : 0;

  const healthLabel =
    failedEmbeddings > 0
      ? "Needs attention"
      : pendingEmbeddings > 0
        ? "Embedding pending"
        : "Healthy";

  return (
    <div className="memory-overview-dashboard minimal">
      <section className="memory-overview-hero-card minimal">
        <div>
          <span>Workspace overview</span>
          <h3>Memory Vault Health</h3>
          <p>
            Ringkasan kondisi Memory Vault, chunk readiness, embedding progress,
            knowledge sources, dan kesiapan retrieval. Detail operasional sudah
            dipisah ke tab khusus supaya halaman utama tetap clean.
          </p>

          <div className="memory-overview-health-pills">
            <span>{totalMemories} memories</span>
            <span>{totalChunks} chunks</span>
            <span>{embeddedChunks} embedded</span>
            <span>{pendingEmbeddings} pending</span>
            <span>{ragEnabledCount} RAG ready</span>
            <span>{runtimeInjectableCount} runtime</span>
            <span>{knowledgeSourceCount} sources</span>
          </div>
        </div>

        <div
          className={`memory-overview-health ${
            healthLabel === "Healthy" ? "healthy" : "warning"
          }`}
        >
          <strong>{healthLabel}</strong>
          <span>
            {embeddingRate}% embedded · {memoryCoverageRate}% chunked
          </span>
        </div>
      </section>
    </div>
  );
}

function MemoryRecordDetailsModal({
  memory,
  chunks,
  chunkCharCount,
  chunkTokenEstimate,
  isRebuildingChunks,
  onClose,
  onRebuildSelected,
}: {
  memory: MemoryVaultItem;
  chunks: MemoryVaultChunk[];
  chunkCharCount: number;
  chunkTokenEstimate: number;
  isRebuildingChunks: boolean;
  onClose: () => void;
  onRebuildSelected: () => void;
}) {
  return (
    <div className="memory-record-modal-backdrop">
      <section className="memory-record-modal">
        <header>
          <div className="memory-record-modal-title">
            <div
              className="memory-detail-avatar"
              style={{
                background: memory.agentColor
                  ? `linear-gradient(135deg, ${memory.agentColor}, rgba(37, 99, 235, 0.76))`
                  : undefined,
              }}
            >
              {getMemoryInitial(memory.agentName)}
            </div>

            <div>
              <span>@{memory.agentName}</span>
              <h2>{getMemoryTypeLabel(memory.type)}</h2>
              <p>
                Agent-scoped memory record that can become retrieval context once
                semantic retrieval is wired into runtime.
              </p>
            </div>
          </div>

          <button type="button" onClick={onClose} aria-label="Close memory detail">
            ×
          </button>
        </header>

        <div className="memory-record-detail-grid">
          <SummaryMetric label="Memory ID" value={memory.id} />
          <SummaryMetric label="Agent" value={`@${memory.agentName}`} />
          <SummaryMetric label="Type" value={memory.type} />
          <SummaryMetric label="Scope" value={memory.scope} />
          <SummaryMetric
            label="Owner"
            value={memory.ownerAgentName || `@${memory.agentName}`}
          />
          <SummaryMetric
            label="Runtime Injectable"
            value={memory.runtimeInjectable ? "Yes" : "No"}
          />
          <SummaryMetric label="RAG Enabled" value={memory.ragEnabled ? "Yes" : "No"} />
          <SummaryMetric label="Sensitivity" value={memory.sensitivityLevel} />
          <SummaryMetric label="Source" value={memory.sourceRef || memory.sourceType} />
          <SummaryMetric label="Created" value={formatDateTime(memory.createdAt)} />
        </div>

        <section className="memory-record-modal-section">
          <div className="memory-section-title">
            <div>
              <span>Access mapping</span>
              <h3>Allowed Agents + Linked Skills</h3>
            </div>
          </div>

          <div className="memory-record-access-grid">
            <div>
              <span>Allowed Agents</span>
              <div className="memory-roadmap-pills">
                {memory.allowedAgents.length > 0 ? (
                  memory.allowedAgents.map((agentName) => (
                    <span key={agentName}>@{agentName}</span>
                  ))
                ) : (
                  <span>none</span>
                )}
              </div>
            </div>

            <div>
              <span>Linked Skills</span>
              <div className="memory-roadmap-pills">
                {memory.linkedSkillNames.length > 0 ? (
                  memory.linkedSkillNames.map((skillName) => (
                    <span key={skillName}>{skillName}</span>
                  ))
                ) : (
                  <span>none</span>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="memory-record-modal-section">
          <div className="memory-section-title">
            <div>
              <span>Memory content</span>
              <h3>Content Preview</h3>
            </div>

            <div className="memory-page-badge">{memory.content.length} chars</div>
          </div>

          <pre className="memory-record-content-preview">{memory.content}</pre>
        </section>

        <section className="memory-record-modal-section">
          <div className="memory-section-title">
            <div>
              <span>Chunking</span>
              <h3>Chunks for Selected Memory</h3>
            </div>

            <div className="memory-chunk-actions">
              <span className="memory-page-badge">{chunks.length} chunks</span>

              <button
                type="button"
                disabled={isRebuildingChunks}
                onClick={onRebuildSelected}
              >
                {isRebuildingChunks ? "Rebuilding..." : "Rebuild selected"}
              </button>
            </div>
          </div>

          <div className="memory-summary-grid">
            <SummaryMetric label="Chunk Count" value={chunks.length} />
            <SummaryMetric label="Chunk Chars" value={chunkCharCount} />
            <SummaryMetric label="Token Estimate" value={chunkTokenEstimate} />
            <SummaryMetric
              label="Embedding Status"
              value={chunks.length > 0 ? chunks[0].embeddingStatus : "none"}
            />
          </div>

          <MemoryChunkList chunks={chunks} />
        </section>

        <MemoryScopePlaceholder memory={memory} />
      </section>
    </div>
  );
}

export function MemoryVaultView() {
  const [memories, setMemories] = useState<MemoryVaultItem[]>([]);
  const [chunks, setChunks] = useState<MemoryVaultChunk[]>([]);
  const [summary, setSummary] = useState<MemoryVaultSummary | null>(null);
  const [selectedMemoryId, setSelectedMemoryId] = useState<string | null>(null);
  const [selectedMemoryDetailId, setSelectedMemoryDetailId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<MemoryVaultTab>("overview");
  const [memoryRecordsPage, setMemoryRecordsPage] = useState(1);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAgent, setSelectedAgent] = useState("all");
  const [selectedType, setSelectedType] = useState("all");

  const [semanticResult, setSemanticResult] =
    useState<SemanticMemorySearchResponse | null>(null);
  const [isSemanticSearching, setIsSemanticSearching] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRebuildingChunks, setIsRebuildingChunks] = useState(false);
  const [chunkActionMessage, setChunkActionMessage] = useState<string | null>(
    null
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const chunksByMemoryId = useMemo(() => {
    return chunks.reduce<Record<string, MemoryVaultChunk[]>>(
      (accumulator, chunk) => {
        if (!accumulator[chunk.memoryId]) {
          accumulator[chunk.memoryId] = [];
        }

        accumulator[chunk.memoryId].push(chunk);
        return accumulator;
      },
      {}
    );
  }, [chunks]);

  const agentOptions = useMemo(() => {
    return uniqueSorted(memories.map((memory) => memory.agentName));
  }, [memories]);

  const typeOptions = useMemo(() => {
    return uniqueSorted(memories.map((memory) => memory.type));
  }, [memories]);

  const filteredMemories = useMemo(() => {
    return memories.filter((memory) => {
      const agentMatches =
        selectedAgent === "all" || memory.agentName === selectedAgent;

      const typeMatches = selectedType === "all" || memory.type === selectedType;

      return agentMatches && typeMatches && matchesSearch(memory, searchQuery);
    });
  }, [memories, searchQuery, selectedAgent, selectedType]);

  const memoryRecordsTotalPages = Math.max(
    1,
    Math.ceil(filteredMemories.length / MEMORY_RECORDS_PAGE_SIZE)
  );

  const normalizedMemoryRecordsPage = Math.min(
    memoryRecordsPage,
    memoryRecordsTotalPages
  );

  const memoryRecordsPageStartIndex =
    (normalizedMemoryRecordsPage - 1) * MEMORY_RECORDS_PAGE_SIZE;

  const memoryRecordsPageEndIndex = Math.min(
    memoryRecordsPageStartIndex + MEMORY_RECORDS_PAGE_SIZE,
    filteredMemories.length
  );

  const paginatedMemories = filteredMemories.slice(
    memoryRecordsPageStartIndex,
    memoryRecordsPageEndIndex
  );

  const selectedDetailMemory = selectedMemoryDetailId
    ? memories.find((memory) => memory.id === selectedMemoryDetailId) || null
    : null;

  const selectedMemory = useMemo(() => {
    if (filteredMemories.length === 0) {
      return null;
    }

    return (
      filteredMemories.find((memory) => memory.id === selectedMemoryId) ||
      filteredMemories[0]
    );
  }, [filteredMemories, selectedMemoryId]);

  const runtimeInjectableCount = memories.filter(
    (memory) => memory.runtimeInjectable
  ).length;

  const ragEnabledCount = memories.filter((memory) => memory.ragEnabled).length;

  const knowledgeSourceCount = memories.filter(
    (memory) => memory.sourceType === "knowledge_source" || memory.sourceRef
  ).length;

  function clearFilters() {
    setSearchQuery("");
    setSelectedAgent("all");
    setSelectedType("all");
    setMemoryRecordsPage(1);
  }

  async function loadMemoryVault(isSilent = false) {
    try {
      if (isSilent) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setErrorMessage(null);

      const [nextMemories, nextSummary, nextChunks] = await Promise.all([
        fetchMemoryVaultItems(),
        fetchMemoryVaultSummary(),
        fetchMemoryVaultChunks(),
      ]);

      setMemories(nextMemories);
      setSummary(nextSummary);
      setChunks(nextChunks);

      setSelectedMemoryId((currentSelectedMemoryId) => {
        if (
          currentSelectedMemoryId &&
          nextMemories.some((memory) => memory.id === currentSelectedMemoryId)
        ) {
          return currentSelectedMemoryId;
        }

        return nextMemories[0]?.id || null;
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to load Memory Vault.";

      setErrorMessage(message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  async function handleRebuildAllChunks() {
    try {
      setIsRebuildingChunks(true);
      setChunkActionMessage(null);
      setErrorMessage(null);

      const result = await rebuildMemoryVaultChunks({
        maxChunkChars: 900,
        overlapChars: 120,
        minChunkChars: 40,
      });

      setChunkActionMessage(
        `Rebuilt ${result.createdChunkCount} chunks from ${result.processedMemoryCount} memories.`
      );

      await loadMemoryVault(true);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to rebuild chunks.";

      setErrorMessage(message);
    } finally {
      setIsRebuildingChunks(false);
    }
  }

  async function handleRebuildMemoryChunks(memory: MemoryVaultItem) {
    try {
      setIsRebuildingChunks(true);
      setChunkActionMessage(null);
      setErrorMessage(null);

      const result = await rebuildMemoryVaultChunks({
        memoryId: memory.id,
        maxChunkChars: 900,
        overlapChars: 120,
        minChunkChars: 40,
      });

      setChunkActionMessage(
        `Rebuilt ${result.createdChunkCount} chunks for ${memory.type}.`
      );

      await loadMemoryVault(true);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to rebuild chunks.";

      setErrorMessage(message);
    } finally {
      setIsRebuildingChunks(false);
    }
  }

  async function handleRunSemanticSearch(payload: {
    query: string;
    agentName?: string;
    topK: number;
    minScore: number;
    matchedSkillNames: string[];
    allowedScopes: string[];
  }) {
    try {
      setIsSemanticSearching(true);
      setErrorMessage(null);

      const result = await searchSemanticMemory({
        query: payload.query,
        agentName: payload.agentName,
        topK: payload.topK,
        minScore: payload.minScore,
        matchedSkillNames: payload.matchedSkillNames,
        allowedScopes: payload.allowedScopes,
        allowedSensitivityLevels: ["normal", "internal"],
      });

      setSemanticResult(result);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to run semantic search.";

      setErrorMessage(message);
    } finally {
      setIsSemanticSearching(false);
    }
  }

  useEffect(() => {
    loadMemoryVault();
  }, []);

  useEffect(() => {
    if (memoryRecordsPage > memoryRecordsTotalPages) {
      setMemoryRecordsPage(memoryRecordsTotalPages);
    }
  }, [memoryRecordsPage, memoryRecordsTotalPages]);

  useEffect(() => {
    if (
      selectedMemoryId &&
      filteredMemories.length > 0 &&
      !filteredMemories.some((memory) => memory.id === selectedMemoryId)
    ) {
      setSelectedMemoryId(filteredMemories[0].id);
    }

    if (!selectedMemoryId && filteredMemories[0]) {
      setSelectedMemoryId(filteredMemories[0].id);
    }
  }, [filteredMemories, selectedMemoryId]);

  return (
    <PageShell full className="memory-vault-view memory-vault-workspace">
      <PageHero
        eyebrow="Memory Vault Foundation"
        title="Memory Vault Control Center"
        description="Monitor agent-scoped memories, knowledge sources, chunking readiness, embeddings, semantic retrieval guard checks, and RAG-powered runtime grounding."
        badges={
          <>
            <InfoPill tone="green">Agent-scoped memory</InfoPill>
            <InfoPill tone="blue">Chunk-ready</InfoPill>
            <InfoPill tone="purple">Semantic guard</InfoPill>
            <InfoPill tone="yellow">Audit + rollback</InfoPill>
          </>
        }
        actions={
          <div className="memory-hero-actions">
            <ActionButton
              tone="green"
              disabled={isLoading || isRefreshing || isRebuildingChunks}
              onClick={() => loadMemoryVault(true)}
            >
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </ActionButton>

            <ActionButton
              tone="ghost"
              disabled={isLoading || isRebuildingChunks}
              onClick={handleRebuildAllChunks}
            >
              {isRebuildingChunks ? "Rebuilding..." : "Rebuild Chunks"}
            </ActionButton>
          </div>
        }
      />

      {errorMessage && (
        <ErrorState title="Memory Vault error" message={errorMessage} />
      )}

      {chunkActionMessage && (
        <div className="memory-vault-success">{chunkActionMessage}</div>
      )}

      {isLoading ? (
        <div className="memory-vault-loading">Loading Memory Vault...</div>
      ) : memories.length === 0 ? (
        <EmptyState
          title="No memory records found."
          description="Run the Memory Vault seed script to create initial agent-scoped memories."
        />
      ) : (
        <>
          <PanelCard accent="green" compact className="memory-workspace-summary">
            <div className="memory-workspace-summary-grid">
              <SummaryMetric
                label="Memories"
                value={summary?.totalMemories ?? memories.length}
              />
              <SummaryMetric
                label="Chunks"
                value={summary?.totalChunks ?? chunks.length}
              />
              <SummaryMetric
                label="Embedded"
                value={summary?.embeddedChunks ?? 0}
              />
              <SummaryMetric
                label="Pending"
                value={summary?.pendingEmbeddings ?? 0}
              />
              <SummaryMetric label="RAG Ready" value={ragEnabledCount} />
              <SummaryMetric label="Runtime" value={runtimeInjectableCount} />
              <SummaryMetric label="Sources" value={knowledgeSourceCount} />
            </div>
          </PanelCard>

          <PanelCard accent="green" compact className="memory-workspace-tabs-card">
            <div className="memory-workspace-tabs">
              {memoryVaultTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={activeTab === tab.id ? "active" : ""}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <strong>{tab.label}</strong>
                  <span>{tab.description}</span>
                </button>
              ))}
            </div>
          </PanelCard>

          {activeTab === "overview" && (
            <MemoryOverviewTab
              memories={memories}
              chunks={chunks}
              summary={summary}
              selectedMemory={selectedMemory}
              runtimeInjectableCount={runtimeInjectableCount}
              ragEnabledCount={ragEnabledCount}
              knowledgeSourceCount={knowledgeSourceCount}
              onOpenMemories={() => setActiveTab("memories")}
              onOpenKnowledgeSources={() => setActiveTab("knowledgeSources")}
              onOpenRetrievalLab={() => setActiveTab("retrievalLab")}
              onOpenMaintenance={() => setActiveTab("maintenance")}
            />
          )}

          {activeTab === "memories" && (
            <div className="memory-workspace-tab-content">
              <MemoryFilterPanel
                searchQuery={searchQuery}
                selectedAgent={selectedAgent}
                selectedType={selectedType}
                agentOptions={agentOptions}
                typeOptions={typeOptions}
                totalCount={memories.length}
                filteredCount={filteredMemories.length}
                onSearchChange={(value) => {
                  setSearchQuery(value);
                  setMemoryRecordsPage(1);
                }}
                onAgentChange={(value) => {
                  setSelectedAgent(value);
                  setMemoryRecordsPage(1);
                }}
                onTypeChange={(value) => {
                  setSelectedType(value);
                  setMemoryRecordsPage(1);
                }}
                onClearFilters={clearFilters}
              />

              <PanelCard accent="green" compact className="memory-records-summary-panel">
                <div className="memory-records-summary-grid">
                  <SummaryMetric label="Total" value={memories.length} />
                  <SummaryMetric label="Filtered" value={filteredMemories.length} />
                  <SummaryMetric label="Agents" value={agentOptions.length} />
                  <SummaryMetric label="Types" value={typeOptions.length} />
                  <SummaryMetric
                    label="Runtime"
                    value={
                      filteredMemories.filter((memory) => memory.runtimeInjectable)
                        .length
                    }
                  />
                  <SummaryMetric
                    label="RAG"
                    value={
                      filteredMemories.filter((memory) => memory.ragEnabled).length
                    }
                  />
                </div>
              </PanelCard>

              {filteredMemories.length === 0 ? (
                <div className="memory-vault-empty filtered-empty">
                  <strong>No memory matched your filters.</strong>
                  <p>
                    Try clearing the filters or searching for another agent, memory
                    type, or content keyword.
                  </p>

                  <button type="button" onClick={clearFilters}>
                    Clear filters
                  </button>
                </div>
              ) : (
                <PanelCard accent="green" compact className="memory-records-table-panel">
                  <div className="memory-records-table">
                    <div className="memory-records-row header">
                      <span>Agent</span>
                      <span>Type</span>
                      <span>Content Preview</span>
                      <span>Scope</span>
                      <span>Runtime</span>
                      <span>RAG</span>
                      <span>Chunks</span>
                      <span>Source</span>
                      <span>Action</span>
                    </div>

                    {paginatedMemories.map((memory) => {
                      const memoryChunks = chunksByMemoryId[memory.id] || [];

                      return (
                        <button
                          type="button"
                          key={memory.id}
                          className="memory-records-row"
                          onClick={() => {
                            setSelectedMemoryId(memory.id);
                            setSelectedMemoryDetailId(memory.id);
                          }}
                        >
                          <span className="agent">@{memory.agentName}</span>
                          <span className="type">{getMemoryTypeLabel(memory.type)}</span>
                          <span className="content">
                            {truncateText(memory.content, 170)}
                          </span>
                          <span>{memory.scope}</span>
                          <span>{memory.runtimeInjectable ? "Yes" : "No"}</span>
                          <span>{memory.ragEnabled ? "Yes" : "No"}</span>
                          <span>{memoryChunks.length}</span>
                          <span>
                            {truncateText(memory.sourceRef || memory.sourceType, 80)}
                          </span>
                          <span>
                            <strong className="memory-records-details">
                              Details
                            </strong>
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="memory-records-pagination">
                    <div>
                      Showing{" "}
                      <strong>
                        {filteredMemories.length === 0
                          ? 0
                          : memoryRecordsPageStartIndex + 1}
                      </strong>{" "}
                      to <strong>{memoryRecordsPageEndIndex}</strong> of{" "}
                      <strong>{filteredMemories.length}</strong> memory records
                    </div>

                    <div className="memory-records-pagination-actions">
                      <button
                        type="button"
                        onClick={() =>
                          setMemoryRecordsPage((current) =>
                            Math.max(1, current - 1)
                          )
                        }
                        disabled={normalizedMemoryRecordsPage <= 1}
                      >
                        Previous
                      </button>

                      <span>
                        Page {normalizedMemoryRecordsPage} /{" "}
                        {memoryRecordsTotalPages}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          setMemoryRecordsPage((current) =>
                            Math.min(memoryRecordsTotalPages, current + 1)
                          )
                        }
                        disabled={
                          normalizedMemoryRecordsPage >= memoryRecordsTotalPages
                        }
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </PanelCard>
              )}

              {selectedDetailMemory && (
                <MemoryRecordDetailsModal
                  memory={selectedDetailMemory}
                  chunks={chunksByMemoryId[selectedDetailMemory.id] || []}
                  chunkCharCount={(
                    chunksByMemoryId[selectedDetailMemory.id] || []
                  ).reduce((total, chunk) => total + chunk.charCount, 0)}
                  chunkTokenEstimate={(
                    chunksByMemoryId[selectedDetailMemory.id] || []
                  ).reduce((total, chunk) => total + chunk.tokenEstimate, 0)}
                  isRebuildingChunks={isRebuildingChunks}
                  onClose={() => setSelectedMemoryDetailId(null)}
                  onRebuildSelected={() => handleRebuildMemoryChunks(selectedDetailMemory)}
                />
              )}
            </div>
          )}

          {activeTab === "knowledgeSources" && (
            <div className="memory-workspace-tab-content">
              <KnowledgeSourceAuditPanel
                memories={memories}
                chunks={chunks}
                selectedMemoryId={selectedMemory?.id || null}
                onSelectMemory={setSelectedMemoryId}
              />
            </div>
          )}

          {activeTab === "importAudit" && (
            <div className="memory-workspace-tab-content">
              <KnowledgeSourceImportPanel
                agentOptions={agentOptions}
                disabled={isLoading || isRefreshing || isRebuildingChunks}
                onCompleted={() => loadMemoryVault(true)}
              />

              <KnowledgeSourceImportHistoryPanel
                selectedMemoryId={selectedMemory?.id || null}
                selectedSourceRef={selectedMemory?.sourceRef || null}
                onCompleted={() => loadMemoryVault(true)}
              />
            </div>
          )}

          {activeTab === "retrievalLab" && (
            <div className="memory-workspace-tab-content">
              <SemanticSearchPanel
                agentOptions={agentOptions}
                defaultQuery={
                  selectedMemory
                    ? selectedMemory.content.slice(0, 120)
                    : "buat caption promosi kopi susu dengan gaya santai"
                }
                isSearching={isSemanticSearching}
                result={semanticResult}
                onRunSearch={handleRunSemanticSearch}
              />
            </div>
          )}

          {activeTab === "maintenance" && (
            <div className="memory-workspace-tab-content">
              <MemoryMaintenancePanel
                selectedMemoryId={selectedMemory?.id || null}
                disabled={isLoading || isRefreshing || isRebuildingChunks}
                onCompleted={() => loadMemoryVault(true)}
              />

              <MemoryChunkSummarySection summary={summary} chunks={chunks} />
            </div>
          )}
        </>
      )}
    </PageShell>
  );
}