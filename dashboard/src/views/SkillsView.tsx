import { useEffect, useMemo, useState } from "react";
import type { SkillSnapshot } from "../types/api";
import { fetchSkills } from "../services/api";
import {
  ActionButton,
  EmptyState,
  ErrorState,
  FilterGrid,
  FormField,
  InfoPill,
  PageHero,
  PageShell,
  PanelCard,
} from "../components/ui";

const SKILLS_PAGE_SIZE = 10;

function formatDateTime(value?: string | null) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString();
}

function truncateText(value?: string | null, maxLength = 120) {
  if (!value) {
    return "-";
  }

  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength).trim()}...`;
}

function getSkillInitial(skillName: string) {
  return skillName
    .split(/[-_\s]/)
    .map((part) => part.charAt(0).toUpperCase())
    .filter(Boolean)
    .slice(0, 2)
    .join("");
}

function getSkillStatusLabel(skill: SkillSnapshot) {
  if (skill.content && skill.content.trim().length > 0) {
    return "Loaded";
  }

  if (skill.filePath) {
    return "Linked";
  }

  return "Registered";
}

function getSkillDescription(skill: SkillSnapshot) {
  return (
    skill.description ||
    "No description is configured for this skill yet. Add skill metadata later to improve governance and runtime matching."
  );
}

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((left, right) =>
    left.localeCompare(right)
  );
}

function getStatusTone(status: string) {
  if (status === "Loaded") {
    return "loaded";
  }

  if (status === "Linked") {
    return "linked";
  }

  return "registered";
}

function SkillMetric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="skills-summary-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SkillDetailsMetric({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="skills-detail-metric">
      <span>{label}</span>
      <strong>{value || "-"}</strong>
    </div>
  );
}

function SkillDetailsModal({
  skill,
  onClose,
}: {
  skill: SkillSnapshot;
  onClose: () => void;
}) {
  const content = skill.content?.trim() || "";
  const status = getSkillStatusLabel(skill);

  return (
    <div className="skills-modal-backdrop">
      <section className="skills-modal">
        <header>
          <div className="skills-modal-title">
            <div className="skills-modal-avatar">{getSkillInitial(skill.name)}</div>

            <div>
              <span>@{skill.agentName}</span>
              <h2>{skill.name}</h2>
              <p>{getSkillDescription(skill)}</p>
            </div>
          </div>

          <button type="button" onClick={onClose} aria-label="Close skill detail">
            ×
          </button>
        </header>

        <div className="skills-detail-grid">
          <SkillDetailsMetric label="Skill ID" value={skill.id} />
          <SkillDetailsMetric label="Agent" value={skill.agentName} />
          <SkillDetailsMetric label="Status" value={status} />
          <SkillDetailsMetric label="File Path" value={skill.filePath} />
          <SkillDetailsMetric label="Created" value={formatDateTime(skill.createdAt)} />
          <SkillDetailsMetric label="Updated" value={formatDateTime(skill.updatedAt)} />
        </div>

        <section className="skills-detail-section">
          <div className="skills-detail-section-header">
            <div>
              <span>Governance bridge</span>
              <h3>Skill Boundary Mapping</h3>
            </div>

            <div className="skills-detail-badge">Planned</div>
          </div>

          <p>
            This skill is registered under <strong>@{skill.agentName}</strong>.
            In the next phases, this page can help map skill intent examples,
            allowed domains, input/output contracts, memory scopes, and runtime
            eligibility.
          </p>

          <div className="skills-roadmap-pills">
            <span>Intent examples</span>
            <span>Input/output contract</span>
            <span>Agent capability mapping</span>
            <span>Memory scope requirement</span>
            <span>RAG eligibility</span>
          </div>
        </section>

        <section className="skills-detail-section">
          <div className="skills-detail-section-header">
            <div>
              <span>Skill content</span>
              <h3>Content Preview</h3>
            </div>

            <div className="skills-detail-badge">
              {content ? `${content.length} chars` : "Empty"}
            </div>
          </div>

          {content ? (
            <pre className="skills-content-preview">{content.slice(0, 2400)}</pre>
          ) : (
            <div className="skills-content-empty">
              <strong>No content found.</strong>
              <p>
                If this skill is file-backed, future phases can load, chunk,
                embed, and retrieve the skill content for contextual runtime use.
              </p>
            </div>
          )}
        </section>
      </section>
    </div>
  );
}

export function SkillsView() {
  const [skills, setSkills] = useState<SkillSnapshot[]>([]);
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [agentName, setAgentName] = useState("all");
  const [status, setStatus] = useState("all");

  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const agentOptions = useMemo(
    () => uniqueSorted(skills.map((skill) => skill.agentName)),
    [skills]
  );

  const filteredSkills = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return skills.filter((skill) => {
      const skillStatus = getSkillStatusLabel(skill);

      const matchesSearch =
        !normalizedSearch ||
        skill.name.toLowerCase().includes(normalizedSearch) ||
        skill.agentName.toLowerCase().includes(normalizedSearch) ||
        (skill.description || "").toLowerCase().includes(normalizedSearch) ||
        (skill.filePath || "").toLowerCase().includes(normalizedSearch);

      const matchesAgent = agentName === "all" || skill.agentName === agentName;
      const matchesStatus = status === "all" || skillStatus === status;

      return matchesSearch && matchesAgent && matchesStatus;
    });
  }, [skills, search, agentName, status]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredSkills.length / SKILLS_PAGE_SIZE)
  );

  const normalizedCurrentPage = Math.min(currentPage, totalPages);

  const pageStartIndex = (normalizedCurrentPage - 1) * SKILLS_PAGE_SIZE;

  const pageEndIndex = Math.min(
    pageStartIndex + SKILLS_PAGE_SIZE,
    filteredSkills.length
  );

  const paginatedSkills = filteredSkills.slice(pageStartIndex, pageEndIndex);

  const selectedSkill = useMemo(() => {
    if (!selectedSkillId) {
      return null;
    }

    return skills.find((skill) => skill.id === selectedSkillId) || null;
  }, [skills, selectedSkillId]);

  const loadedCount = skills.filter(
    (skill) => getSkillStatusLabel(skill) === "Loaded"
  ).length;

  const linkedCount = skills.filter(
    (skill) => getSkillStatusLabel(skill) === "Linked"
  ).length;

  const fileBackedCount = skills.filter((skill) => Boolean(skill.filePath)).length;
  const agentsCoveredCount = agentOptions.length;

  async function loadSkills(isSilent = false) {
    try {
      if (isSilent) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setErrorMessage(null);

      const nextSkills = await fetchSkills();
      setSkills(nextSkills);

      setSelectedSkillId((currentSelectedSkillId) => {
        if (
          currentSelectedSkillId &&
          nextSkills.some((skill) => skill.id === currentSelectedSkillId)
        ) {
          return currentSelectedSkillId;
        }

        return null;
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load skills.";

      setErrorMessage(message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  function clearFilters() {
    setSearch("");
    setAgentName("all");
    setStatus("all");
    setCurrentPage(1);
  }

  useEffect(() => {
    loadSkills();
  }, []);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <PageShell full className="skills-page-view skills-library-page">
      <PageHero
        eyebrow="Skills Foundation"
        title="Skills Control Center"
        description="Monitor registered skills, agent ownership, file-backed capability, and future skill-to-governance mapping in a clean table-based workspace."
        badges={
          <>
            <InfoPill tone="purple">Agent-linked skills</InfoPill>
            <InfoPill tone="blue">Governance-ready</InfoPill>
            <InfoPill tone="green">RAG foundation</InfoPill>
          </>
        }
        actions={
          <ActionButton
            tone="ghost"
            disabled={isLoading || isRefreshing}
            onClick={() => loadSkills(true)}
          >
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </ActionButton>
        }
      />

      {errorMessage && (
        <ErrorState title="Skills page error" message={errorMessage} />
      )}

      <PanelCard accent="purple" compact className="skills-summary-panel">
        <div className="skills-summary-table">
          <SkillMetric label="Total" value={skills.length} />
          <SkillMetric label="Filtered" value={filteredSkills.length} />
          <SkillMetric label="Agents" value={agentsCoveredCount} />
          <SkillMetric label="Loaded" value={loadedCount} />
          <SkillMetric label="Linked" value={linkedCount} />
          <SkillMetric label="File-backed" value={fileBackedCount} />
        </div>
      </PanelCard>

      <PanelCard accent="purple" compact className="skills-filter-panel">
        <FilterGrid>
          <FormField label="Search" wide>
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search skill name, agent, description, or file path..."
            />
          </FormField>

          <FormField label="Agent">
            <select
              value={agentName}
              onChange={(event) => {
                setAgentName(event.target.value);
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
          </FormField>

          <FormField label="Status">
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">All status</option>
              <option value="Loaded">Loaded</option>
              <option value="Linked">Linked</option>
              <option value="Registered">Registered</option>
            </select>
          </FormField>
        </FilterGrid>

        <div className="skills-filter-actions">
          <ActionButton tone="purple" onClick={() => loadSkills(true)}>
            Apply Filters
          </ActionButton>

          <ActionButton tone="ghost" onClick={clearFilters}>
            Clear Filters
          </ActionButton>
        </div>
      </PanelCard>

      {isLoading ? (
        <div className="skills-page-loading">Loading registered skills...</div>
      ) : skills.length === 0 ? (
        <EmptyState
          title="No skills registered yet."
          description="Skills added in the backend will appear here and can later be mapped to agent capability rules and memory scopes."
        />
      ) : filteredSkills.length === 0 ? (
        <EmptyState
          title="No skills matched your filters."
          description="Try clearing filters or searching with different terms."
        />
      ) : (
        <PanelCard accent="purple" compact className="skills-table-panel">
          <div className="skills-table">
            <div className="skills-table-row header">
              <span>Skill</span>
              <span>Agent</span>
              <span>Description</span>
              <span>Status</span>
              <span>Source</span>
              <span>Updated</span>
              <span>Action</span>
            </div>

            {paginatedSkills.map((skill) => {
              const skillStatus = getSkillStatusLabel(skill);

              return (
                <button
                  type="button"
                  key={skill.id}
                  className="skills-table-row"
                  onClick={() => setSelectedSkillId(skill.id)}
                >
                  <span className="skill-name">
                    <strong>{skill.name}</strong>
                    <small>{skill.id}</small>
                  </span>

                  <span className="agent">@{skill.agentName}</span>

                  <span className="description">
                    {truncateText(getSkillDescription(skill), 150)}
                  </span>

                  <span>
                    <strong className={`skills-table-status ${getStatusTone(skillStatus)}`}>
                      {skillStatus}
                    </strong>
                  </span>

                  <span>{skill.filePath ? "File linked" : "No file"}</span>

                  <span>{formatDateTime(skill.updatedAt)}</span>

                  <span>
                    <strong className="skills-table-details">Details</strong>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="skills-table-pagination">
            <div>
              Showing{" "}
              <strong>
                {filteredSkills.length === 0 ? 0 : pageStartIndex + 1}
              </strong>{" "}
              to <strong>{pageEndIndex}</strong> of{" "}
              <strong>{filteredSkills.length}</strong> skills
            </div>

            <div className="skills-table-pagination-actions">
              <button
                type="button"
                onClick={() =>
                  setCurrentPage((current) => Math.max(1, current - 1))
                }
                disabled={normalizedCurrentPage <= 1}
              >
                Previous
              </button>

              <span>
                Page {normalizedCurrentPage} / {totalPages}
              </span>

              <button
                type="button"
                onClick={() =>
                  setCurrentPage((current) => Math.min(totalPages, current + 1))
                }
                disabled={normalizedCurrentPage >= totalPages}
              >
                Next
              </button>
            </div>
          </div>
        </PanelCard>
      )}

      {selectedSkill && (
        <SkillDetailsModal
          skill={selectedSkill}
          onClose={() => setSelectedSkillId(null)}
        />
      )}
    </PageShell>
  );
}