export function SkillLibraryPanel() {
    return (
      <section className="panel skill-panel">
        <div className="panel-header">
          <h2>Skill Library</h2>
          <button>View All</button>
        </div>
  
        <div className="skill-card">
          <small>Loaded Skill</small>
          <strong>generate_ad_copy</strong>
          <span className="loaded-chip">Loaded</span>
  
          <div className="skill-meta">
            <p>Assigned Agent</p>
            <strong>design-agent</strong>
          </div>
  
          <div className="skill-meta">
            <p>Type</p>
            <strong>file-based</strong>
          </div>
  
          <div className="skill-meta">
            <p>Path</p>
            <strong>/skills-library/design-agent/generate_ad_copy.md</strong>
          </div>
        </div>
      </section>
    );
  }