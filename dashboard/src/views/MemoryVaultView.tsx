import { useEffect, useMemo, useState } from "react";
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

function MemoryVaultCard({
  memory,
  isActive,
  chunkCount,
  onClick,
}: {
  memory: MemoryVaultItem;
  isActive: boolean;
  chunkCount: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`memory-vault-card ${isActive ? "active" : ""}`}
      onClick={onClick}
    >
      <div
        className="memory-vault-avatar"
        style={{
          background: memory.agentColor
            ? `linear-gradient(135deg, ${memory.agentColor}, rgba(37, 99, 235, 0.76))`
            : undefined,
        }}
      >
        {getMemoryInitial(memory.agentName)}
      </div>

      <div className="memory-vault-card-copy">
        <span>@{memory.agentName}</span>
        <strong>{getMemoryTypeLabel(memory.type)}</strong>
        <p>{memory.content}</p>
      </div>

      <div className="memory-vault-card-footer">
        <span>{memory.type}</span>
        <span>{memory.scope}</span>
        <span>{chunkCount} chunks</span>
      </div>
    </button>
  );
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
  }) => Promise<void>;
}) {
  const [query, setQuery] = useState(defaultQuery);
  const [agentName, setAgentName] = useState("all");
  const [topK, setTopK] = useState(5);
  const [minScore, setMinScore] = useState(0);

  useEffect(() => {
    if (!query.trim() && defaultQuery.trim()) {
      setQuery(defaultQuery);
    }
  }, [defaultQuery, query]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    await onRunSearch({
      query,
      agentName: agentName === "all" ? undefined : agentName,
      topK,
      minScore,
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
          <SummaryMetric label="Returned" value={result.returnedCount} />
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

export function MemoryVaultView() {
  const [memories, setMemories] = useState<MemoryVaultItem[]>([]);
  const [chunks, setChunks] = useState<MemoryVaultChunk[]>([]);
  const [summary, setSummary] = useState<MemoryVaultSummary | null>(null);
  const [selectedMemoryId, setSelectedMemoryId] = useState<string | null>(null);
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
    return chunks.reduce<Record<string, MemoryVaultChunk[]>>((accumulator, chunk) => {
      if (!accumulator[chunk.memoryId]) {
        accumulator[chunk.memoryId] = [];
      }

      accumulator[chunk.memoryId].push(chunk);
      return accumulator;
    }, {});
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

  const selectedMemory = useMemo(() => {
    if (filteredMemories.length === 0) {
      return null;
    }

    return (
      filteredMemories.find((memory) => memory.id === selectedMemoryId) ||
      filteredMemories[0]
    );
  }, [filteredMemories, selectedMemoryId]);

  const selectedMemoryChunks = selectedMemory
    ? chunksByMemoryId[selectedMemory.id] || []
    : [];

  const selectedMemoryTokenEstimate = selectedMemoryChunks.reduce(
    (total, chunk) => total + chunk.tokenEstimate,
    0
  );

  const selectedMemoryCharCount = selectedMemoryChunks.reduce(
    (total, chunk) => total + chunk.charCount,
    0
  );

  const groupedByAgent = useMemo(() => {
    return filteredMemories.reduce<Record<string, MemoryVaultItem[]>>(
      (accumulator, memory) => {
        if (!accumulator[memory.agentName]) {
          accumulator[memory.agentName] = [];
        }

        accumulator[memory.agentName].push(memory);
        return accumulator;
      },
      {}
    );
  }, [filteredMemories]);

  function clearFilters() {
    setSearchQuery("");
    setSelectedAgent("all");
    setSelectedType("all");
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

  async function handleRebuildSelectedMemoryChunks() {
    if (!selectedMemory) {
      return;
    }

    try {
      setIsRebuildingChunks(true);
      setChunkActionMessage(null);
      setErrorMessage(null);

      const result = await rebuildMemoryVaultChunks({
        memoryId: selectedMemory.id,
        maxChunkChars: 900,
        overlapChars: 120,
        minChunkChars: 40,
      });

      setChunkActionMessage(
        `Rebuilt ${result.createdChunkCount} chunks for ${selectedMemory.type}.`
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
  }) {
    try {
      setIsSemanticSearching(true);
      setErrorMessage(null);

      const result = await searchSemanticMemory({
        query: payload.query,
        agentName: payload.agentName,
        topK: payload.topK,
        minScore: payload.minScore,
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
    <section className="memory-vault-view">
      <div className="memory-vault-hero">
        <div>
          <span className="memory-vault-eyebrow">Memory Vault Foundation</span>
          <h1>Memory Vault Control Center</h1>
          <p>
            Monitor agent-scoped memories, chunking readiness, embeddings,
            semantic search preview, and future RAG-powered runtime grounding.
          </p>

          <div className="memory-vault-badge-row">
            <span>Agent-scoped memory</span>
            <span>Chunk-ready</span>
            <span>Semantic search preview</span>
            <span>RAG foundation planned</span>
          </div>
        </div>

        <div className="memory-hero-actions">
          <button
            type="button"
            disabled={isLoading || isRefreshing || isRebuildingChunks}
            onClick={() => loadMemoryVault(true)}
          >
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </button>

          <button
            type="button"
            disabled={isLoading || isRebuildingChunks}
            onClick={handleRebuildAllChunks}
          >
            {isRebuildingChunks ? "Rebuilding..." : "Rebuild Chunks"}
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="memory-vault-error">
          <strong>Memory Vault error</strong>
          <span>{errorMessage}</span>
        </div>
      )}

      {chunkActionMessage && (
        <div className="memory-vault-success">{chunkActionMessage}</div>
      )}

      {isLoading ? (
        <div className="memory-vault-loading">Loading Memory Vault...</div>
      ) : memories.length === 0 ? (
        <div className="memory-vault-empty">
          <strong>No memory records found.</strong>
          <p>
            Run the Memory Vault seed script to create initial agent-scoped
            memories.
          </p>
        </div>
      ) : (
        <>
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

          <MemoryFilterPanel
            searchQuery={searchQuery}
            selectedAgent={selectedAgent}
            selectedType={selectedType}
            agentOptions={agentOptions}
            typeOptions={typeOptions}
            totalCount={memories.length}
            filteredCount={filteredMemories.length}
            onSearchChange={setSearchQuery}
            onAgentChange={setSelectedAgent}
            onTypeChange={setSelectedType}
            onClearFilters={clearFilters}
          />

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
            <div className="memory-vault-layout">
              <aside className="memory-vault-list">
                <div className="memory-vault-list-header">
                  <span>Memory Records</span>
                  <strong>{filteredMemories.length}</strong>
                </div>

                {Object.entries(groupedByAgent).map(
                  ([agentName, agentMemories]) => (
                    <div key={agentName} className="memory-agent-group">
                      <div className="memory-agent-group-header">
                        <span>@{agentName}</span>
                        <strong>{agentMemories.length}</strong>
                      </div>

                      <div className="memory-agent-group-list">
                        {agentMemories.map((memory) => (
                          <MemoryVaultCard
                            key={memory.id}
                            memory={memory}
                            chunkCount={chunksByMemoryId[memory.id]?.length || 0}
                            isActive={selectedMemory?.id === memory.id}
                            onClick={() => setSelectedMemoryId(memory.id)}
                          />
                        ))}
                      </div>
                    </div>
                  )
                )}
              </aside>

              {selectedMemory && (
                <main className="memory-vault-detail">
                  <section className="memory-vault-main-card">
                    <div className="memory-detail-header">
                      <div
                        className="memory-detail-avatar"
                        style={{
                          background: selectedMemory.agentColor
                            ? `linear-gradient(135deg, ${selectedMemory.agentColor}, rgba(37, 99, 235, 0.76))`
                            : undefined,
                        }}
                      >
                        {getMemoryInitial(selectedMemory.agentName)}
                      </div>

                      <div>
                        <span>@{selectedMemory.agentName}</span>
                        <h2>{getMemoryTypeLabel(selectedMemory.type)}</h2>
                        <p>
                          Agent-scoped memory record that can become retrieval
                          context once semantic retrieval is wired into runtime.
                        </p>
                      </div>

                      <div className="memory-page-status-pill">
                        {selectedMemory.type}
                      </div>
                    </div>

                    <div className="memory-summary-grid">
                      <SummaryMetric
                        label="Total memories"
                        value={summary?.totalMemories ?? memories.length}
                      />
                      <SummaryMetric
                        label="Filtered results"
                        value={filteredMemories.length}
                      />
                      <SummaryMetric
                        label="Selected agent"
                        value={`@${selectedMemory.agentName}`}
                      />
                      <SummaryMetric
                        label="Created"
                        value={formatDateTime(selectedMemory.createdAt)}
                      />
                    </div>

                    <div className="memory-scope-metadata-grid">
                      <SummaryMetric label="Scope" value={selectedMemory.scope} />
                      <SummaryMetric
                        label="Owner"
                        value={
                          selectedMemory.ownerAgentName ||
                          `@${selectedMemory.agentName}`
                        }
                      />
                      <SummaryMetric
                        label="Runtime Injectable"
                        value={selectedMemory.runtimeInjectable ? "Yes" : "No"}
                      />
                      <SummaryMetric
                        label="RAG Enabled"
                        value={selectedMemory.ragEnabled ? "Yes" : "No"}
                      />
                      <SummaryMetric
                        label="Sensitivity"
                        value={selectedMemory.sensitivityLevel}
                      />
                      <SummaryMetric
                        label="Source"
                        value={selectedMemory.sourceRef || selectedMemory.sourceType}
                      />
                    </div>
                  </section>

                  <section className="memory-content-card">
                    <div className="memory-section-title">
                      <div>
                        <span>Memory content</span>
                        <h3>Content Preview</h3>
                      </div>

                      <div className="memory-page-badge">
                        {selectedMemory.content.length} chars
                      </div>
                    </div>

                    <pre>{selectedMemory.content}</pre>
                  </section>

                  <section className="memory-chunk-detail-card">
                    <div className="memory-section-title">
                      <div>
                        <span>Chunking</span>
                        <h3>Chunks for Selected Memory</h3>
                      </div>

                      <div className="memory-chunk-actions">
                        <span className="memory-page-badge">
                          {selectedMemoryChunks.length} chunks
                        </span>

                        <button
                          type="button"
                          disabled={isRebuildingChunks}
                          onClick={handleRebuildSelectedMemoryChunks}
                        >
                          {isRebuildingChunks ? "Rebuilding..." : "Rebuild selected"}
                        </button>
                      </div>
                    </div>

                    <div className="memory-summary-grid">
                      <SummaryMetric
                        label="Chunk Count"
                        value={selectedMemoryChunks.length}
                      />
                      <SummaryMetric
                        label="Chunk Chars"
                        value={selectedMemoryCharCount}
                      />
                      <SummaryMetric
                        label="Token Estimate"
                        value={selectedMemoryTokenEstimate}
                      />
                      <SummaryMetric
                        label="Embedding Status"
                        value={
                          selectedMemoryChunks.length > 0
                            ? selectedMemoryChunks[0].embeddingStatus
                            : "none"
                        }
                      />
                    </div>

                    <MemoryChunkList chunks={selectedMemoryChunks} />
                  </section>

                  <MemoryScopePlaceholder memory={selectedMemory} />
                </main>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}