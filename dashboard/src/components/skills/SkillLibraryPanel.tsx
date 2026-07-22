import type { SkillSnapshot } from "../../types/api";

type SkillLibraryPanelProps = {
  skills: SkillSnapshot[];
};

function truncateText(value?: string | null, maxLength = 90) {
  if (!value) {
    return "-";
  }

  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength).trim()}...`;
}

function getSkillStatus(skill: SkillSnapshot) {
  if (skill.content && skill.content.trim().length > 0) {
    return "Loaded";
  }

  if (skill.filePath) {
    return "Linked";
  }

  return "Registered";
}

export function SkillLibraryPanel({ skills }: SkillLibraryPanelProps) {
  const loadedCount = skills.filter((skill) => getSkillStatus(skill) === "Loaded")
    .length;

  const linkedCount = skills.filter((skill) => Boolean(skill.filePath)).length;

  return (
    <section className="panel skill-panel dashboard-table-panel">
      <div className="panel-header">
        <div>
          <h2>Skill Library</h2>
          <p className="panel-subtitle">Registered agent capabilities</p>
        </div>

        <div className="dashboard-mini-summary">
          <span>{skills.length} skills</span>
          <span>{loadedCount} loaded</span>
          <span>{linkedCount} linked</span>
        </div>
      </div>

      {skills.length === 0 ? (
        <p className="muted">No skills registered yet.</p>
      ) : (
        <div className="dashboard-skill-table">
          <div className="dashboard-skill-row header">
            <span>Skill</span>
            <span>Agent</span>
            <span>Status</span>
            <span>Description</span>
            <span>Source</span>
          </div>

          {skills.slice(0, 10).map((skill) => {
            const status = getSkillStatus(skill);

            return (
              <div key={skill.id} className="dashboard-skill-row">
                <span className="dashboard-skill-name">{skill.name}</span>
                <span>@{skill.agentName}</span>
                <span>
                  <strong className={`dashboard-status-pill ${status.toLowerCase()}`}>
                    {status}
                  </strong>
                </span>
                <span>{truncateText(skill.description, 110)}</span>
                <span>{skill.filePath ? "File linked" : "No file"}</span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}