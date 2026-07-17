import { useEffect, useMemo, useState } from "react";
import type { SkillSnapshot } from "../types/api";
import { fetchSkills } from "../services/api";

function formatDateTime(value?: string | null) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString();
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

function SkillCard({
  skill,
  isActive,
  onClick,
}: {
  skill: SkillSnapshot;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`skill-foundation-card ${isActive ? "active" : ""}`}
      onClick={onClick}
    >
      <div className="skill-foundation-avatar">
        {getSkillInitial(skill.name)}
      </div>

      <div className="skill-foundation-card-copy">
        <span>{skill.agentName}</span>
        <strong>{skill.name}</strong>
        <p>{getSkillDescription(skill)}</p>
      </div>

      <div className="skill-foundation-card-footer">
        <span>{getSkillStatusLabel(skill)}</span>
        <span>{skill.filePath ? "File linked" : "No file"}</span>
      </div>
    </button>
  );
}

function SkillMetadataItem({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="skill-metadata-item">
      <span>{label}</span>
      <strong>{value || "-"}</strong>
    </div>
  );
}

function SkillGovernancePlaceholder({ skill }: { skill: SkillSnapshot }) {
  return (
    <section className="skill-governance-placeholder-card">
      <div className="skill-section-title">
        <div>
          <span>Governance bridge</span>
          <h3>Skill Boundary Mapping</h3>
        </div>

        <div className="skill-page-badge">Planned</div>
      </div>

      <p>
        This skill is registered under <strong>@{skill.agentName}</strong>. In
        the next phases, this page will help map skill intent examples, allowed
        domains, required memory scopes, and runtime eligibility.
      </p>

      <div className="skill-governance-roadmap">
        <span>Intent examples</span>
        <span>Input/output contract</span>
        <span>Agent capability mapping</span>
        <span>Memory scope requirement</span>
        <span>RAG eligibility</span>
      </div>
    </section>
  );
}

function SkillContentPreview({ skill }: { skill: SkillSnapshot }) {
  const content = skill.content?.trim() || "";

  return (
    <section className="skill-content-preview-card">
      <div className="skill-section-title">
        <div>
          <span>Skill content</span>
          <h3>Content Preview</h3>
        </div>

        <div className="skill-page-badge">
          {content ? `${content.length} chars` : "Empty"}
        </div>
      </div>

      {content ? (
        <pre>{content.slice(0, 2400)}</pre>
      ) : (
        <div className="skill-content-empty">
          <strong>No content found.</strong>
          <p>
            If this skill is file-backed, future phases can load, chunk, embed,
            and retrieve the skill content for contextual runtime use.
          </p>
        </div>
      )}
    </section>
  );
}

export function SkillsView() {
  const [skills, setSkills] = useState<SkillSnapshot[]>([]);
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedSkill = useMemo(() => {
    if (skills.length === 0) {
      return null;
    }

    return skills.find((skill) => skill.id === selectedSkillId) || skills[0];
  }, [skills, selectedSkillId]);

  const groupedByAgent = useMemo(() => {
    return skills.reduce<Record<string, SkillSnapshot[]>>(
      (accumulator, skill) => {
        if (!accumulator[skill.agentName]) {
          accumulator[skill.agentName] = [];
        }

        accumulator[skill.agentName].push(skill);
        return accumulator;
      },
      {}
    );
  }, [skills]);

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

        return nextSkills[0]?.id || null;
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

  useEffect(() => {
    loadSkills();
  }, []);

  return (
    <section className="skills-page-view">
      <div className="skills-page-hero">
        <div>
          <span className="skills-page-eyebrow">Skills Foundation</span>
          <h1>Skills Control Center</h1>
          <p>
            Monitor registered skills, agent ownership, file-backed capability,
            and future skill-to-governance mapping. This page is read-only for
            now and will become the bridge between Agents, Memory Vault, and RAG.
          </p>

          <div className="skills-page-badge-row">
            <span>Agent-linked skills</span>
            <span>Governance-ready</span>
            <span>RAG foundation planned</span>
          </div>
        </div>

        <button
          type="button"
          disabled={isLoading || isRefreshing}
          onClick={() => loadSkills(true)}
        >
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {errorMessage && (
        <div className="skills-page-error">
          <strong>Skills page error</strong>
          <span>{errorMessage}</span>
        </div>
      )}

      {isLoading ? (
        <div className="skills-page-loading">Loading registered skills...</div>
      ) : skills.length === 0 ? (
        <div className="skills-page-empty">
          <strong>No skills registered yet.</strong>
          <p>
            Skills added in the backend will appear here and can later be mapped
            to agent capability rules and memory scopes.
          </p>
        </div>
      ) : (
        <div className="skills-page-layout">
          <aside className="skills-page-list">
            <div className="skills-page-list-header">
              <span>Registered Skills</span>
              <strong>{skills.length}</strong>
            </div>

            {Object.entries(groupedByAgent).map(([agentName, agentSkills]) => (
              <div key={agentName} className="skill-agent-group">
                <div className="skill-agent-group-header">
                  <span>@{agentName}</span>
                  <strong>{agentSkills.length}</strong>
                </div>

                <div className="skill-agent-group-list">
                  {agentSkills.map((skill) => (
                    <SkillCard
                      key={skill.id}
                      skill={skill}
                      isActive={selectedSkill?.id === skill.id}
                      onClick={() => setSelectedSkillId(skill.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </aside>

          {selectedSkill && (
            <main className="skill-detail-panel">
              <section className="skill-detail-main-card">
                <div className="skill-detail-header">
                  <div className="skill-detail-avatar">
                    {getSkillInitial(selectedSkill.name)}
                  </div>

                  <div>
                    <span>@{selectedSkill.agentName}</span>
                    <h2>{selectedSkill.name}</h2>
                    <p>{getSkillDescription(selectedSkill)}</p>
                  </div>

                  <div className="skill-page-status-pill">
                    {getSkillStatusLabel(selectedSkill)}
                  </div>
                </div>

                <div className="skill-metadata-grid">
                  <SkillMetadataItem label="Skill ID" value={selectedSkill.id} />
                  <SkillMetadataItem
                    label="Agent"
                    value={selectedSkill.agentName}
                  />
                  <SkillMetadataItem
                    label="File Path"
                    value={selectedSkill.filePath}
                  />
                  <SkillMetadataItem
                    label="Created"
                    value={formatDateTime(selectedSkill.createdAt)}
                  />
                  <SkillMetadataItem
                    label="Updated"
                    value={formatDateTime(selectedSkill.updatedAt)}
                  />
                </div>
              </section>

              <SkillGovernancePlaceholder skill={selectedSkill} />

              <SkillContentPreview skill={selectedSkill} />
            </main>
          )}
        </div>
      )}
    </section>
  );
}