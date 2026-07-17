import { useEffect, useMemo, useState } from "react";
import {
  fetchMemoryVaultItems,
  fetchMemoryVaultSummary,
  type MemoryVaultItem,
  type MemoryVaultSummary,
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

function MemoryVaultCard({
  memory,
  isActive,
  onClick,
}: {
  memory: MemoryVaultItem;
  isActive: boolean;
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
        <span>{formatDateTime(memory.createdAt)}</span>
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
            placeholder="Search content, agent, type..."
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

        <button type="button" onClick={() => onSearchChange("governance")}>
          governance
        </button>

        <button type="button" onClick={() => onSearchChange("runtime")}>
          runtime
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

export function MemoryVaultView() {
  const [memories, setMemories] = useState<MemoryVaultItem[]>([]);
  const [summary, setSummary] = useState<MemoryVaultSummary | null>(null);
  const [selectedMemoryId, setSelectedMemoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAgent, setSelectedAgent] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

      return (
        agentMatches &&
        typeMatches &&
        matchesSearch(memory, searchQuery)
      );
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

      const [nextMemories, nextSummary] = await Promise.all([
        fetchMemoryVaultItems(),
        fetchMemoryVaultSummary(),
      ]);

      setMemories(nextMemories);
      setSummary(nextSummary);

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
            Monitor agent-scoped memories and prepare the foundation for memory
            access control, skill-aware context retrieval, text embedding, and
            RAG-powered runtime grounding.
          </p>

          <div className="memory-vault-badge-row">
            <span>Agent-scoped memory</span>
            <span>Governance-aware</span>
            <span>RAG foundation planned</span>
          </div>
        </div>

        <button
          type="button"
          disabled={isLoading || isRefreshing}
          onClick={() => loadMemoryVault(true)}
        >
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {errorMessage && (
        <div className="memory-vault-error">
          <strong>Memory Vault error</strong>
          <span>{errorMessage}</span>
        </div>
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
                          Agent-scoped memory record that can later become
                          retrieval context once Memory Vault chunking,
                          embeddings, and RAG are enabled.
                        </p>
                      </div>

                      <div className="memory-page-status-pill">
                        {selectedMemory.type}
                      </div>
                    </div>

                    <div className="memory-scope-metadata-grid">
                        <SummaryMetric label="Scope" value={selectedMemory.scope} />
                        <SummaryMetric
                            label="Owner"
                            value={selectedMemory.ownerAgentName || `@${selectedMemory.agentName}`}
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

                        <div className="memory-scope-pills-panel">
                        <div>
                            <span>Allowed Agents</span>
                            <div className="memory-roadmap-pills">
                            {selectedMemory.allowedAgents.length > 0 ? (
                                selectedMemory.allowedAgents.map((agentName) => (
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
                            {selectedMemory.linkedSkillNames.length > 0 ? (
                                selectedMemory.linkedSkillNames.map((skillName) => (
                                <span key={skillName}>{skillName}</span>
                                ))
                            ) : (
                                <span>none</span>
                            )}
                            </div>
                        </div>
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

                  <MemoryScopePlaceholder memory={selectedMemory} />

                  <section className="memory-distribution-card">
                    <div className="memory-section-title">
                      <div>
                        <span>Distribution</span>
                        <h3>Memory Types</h3>
                      </div>

                      <div className="memory-page-badge">Summary</div>
                    </div>

                    <div className="memory-distribution-grid">
                      {Object.entries(summary?.byType || {}).map(
                        ([type, count]) => (
                          <SummaryMetric
                            key={type}
                            label={getMemoryTypeLabel(type)}
                            value={count}
                          />
                        )
                      )}
                    </div>
                  </section>
                </main>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}