const navItems = [
    "Overview",
    "Agents",
    "Tasks",
    "Skills",
    "Memory Vault",
    "WhatsApp",
    "Settings",
  ];
  
  export function Sidebar() {
    return (
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-mark">◇</div>
        </div>
  
        <nav className="sidebar-nav">
          {navItems.map((item, index) => (
            <button
              key={item}
              className={`sidebar-item ${index === 0 ? "active" : ""}`}
            >
              <span className="sidebar-icon">▣</span>
              <span>{item}</span>
            </button>
          ))}
        </nav>
  
        <div className="sidebar-footer">
          <div className="system-health-mini">
            <p>System Health</p>
            <span>Online</span>
          </div>
  
          <div className="version-box">
            <div className="avatar-mini">🤖</div>
            <div>
              <strong>Personal System</strong>
              <small>v1.0.0</small>
            </div>
          </div>
        </div>
      </aside>
    );
  }