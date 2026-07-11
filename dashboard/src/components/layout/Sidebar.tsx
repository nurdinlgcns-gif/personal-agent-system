export type DashboardView = "dashboard" | "office";

type SidebarProps = {
  activeView: DashboardView;
  onViewChange: (view: DashboardView) => void;
};

const navItems: Array<{
  label: string;
  icon: string;
  view?: DashboardView;
}> = [
  {
    label: "Overview",
    icon: "▣",
    view: "dashboard",
  },
  {
    label: "Agent Office",
    icon: "◇",
    view: "office",
  },
  {
    label: "Agents",
    icon: "◈",
  },
  {
    label: "Tasks",
    icon: "▤",
  },
  {
    label: "Skills",
    icon: "▧",
  },
  {
    label: "Memory Vault",
    icon: "◫",
  },
  {
    label: "WhatsApp",
    icon: "◌",
  },
  {
    label: "Settings",
    icon: "⚙",
  },
];

export function Sidebar({ activeView, onViewChange }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-mark">◇</div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const isActive = item.view === activeView;
          const isDisabled = !item.view;

          return (
            <button
              key={item.label}
              className={`sidebar-item ${isActive ? "active" : ""} ${
                isDisabled ? "disabled" : ""
              }`}
              onClick={() => {
                if (item.view) {
                  onViewChange(item.view);
                }
              }}
              disabled={isDisabled}
            >
              <span className="sidebar-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
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