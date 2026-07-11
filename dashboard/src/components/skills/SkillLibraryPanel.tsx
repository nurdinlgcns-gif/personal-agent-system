import type { SkillSnapshot } from "../../types/api";

type SkillLibraryPanelProps = {
  skills: SkillSnapshot[];
};

export function SkillLibraryPanel({ skills }: SkillLibraryPanelProps) {
  return (
    <section className="panel skill-panel">
      <div className="panel-header">
        <h2>Skill Library</h2>
        <button>View All</button>
      </div>

      {skills.length === 0 ? (
        <p className="muted">No skills registered yet.</p>
      ) : (
        <div className="skill-list">
          {skills.map((skill) => (
            <article key={skill.id} className="skill-card">
              <div className="skill-card-top">
                <div>
                  <small>Loaded Skill</small>
                  <strong>{skill.name}</strong>
                </div>

                <span className="loaded-chip">Loaded</span>
              </div>

              <div className="skill-meta-grid">
                <div className="skill-meta">
                  <p>Assigned Agent</p>
                  <strong>{skill.agentName}</strong>
                </div>

                <div className="skill-meta">
                  <p>Type</p>
                  <strong>file-based</strong>
                </div>
              </div>

              <div className="skill-meta">
                <p>Description</p>
                <strong>{skill.description || "-"}</strong>
              </div>

              <div className="skill-meta skill-path-meta">
                <p>Path</p>
                <code title={skill.filePath || "-"}>{skill.filePath || "-"}</code>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}