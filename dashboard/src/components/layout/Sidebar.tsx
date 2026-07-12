import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";

const SIDEBAR_STORAGE_KEY = "personal-agent-dashboard-sidebar";

type SidebarMode = "expanded" | "collapsed";

const navItems: Array<{
  label: string;
  icon: string;
  path?: string;
}> = [
  {
    label: "Overview",
    icon: "▣",
    path: "/",
  },
  {
    label: "Agent Office",
    icon: "◇",
    path: "/office",
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

function getInitialSidebarMode(): SidebarMode {
  const savedMode = localStorage.getItem(SIDEBAR_STORAGE_KEY);

  if (savedMode === "collapsed" || savedMode === "expanded") {
    return savedMode;
  }

  return "expanded";
}

export function Sidebar() {
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>(
    getInitialSidebarMode
  );

  const isCollapsed = sidebarMode === "collapsed";

  useEffect(() => {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, sidebarMode);
    document.documentElement.setAttribute("data-sidebar", sidebarMode);
  }, [sidebarMode]);

  function toggleSidebar() {
    setSidebarMode((currentMode) =>
      currentMode === "expanded" ? "collapsed" : "expanded"
    );
  }

  return (
    <aside className={`sidebar ${isCollapsed ? "collapsed" : "expanded"}`}>
      <div className="sidebar-logo">
        <div className="logo-mark">◇</div>

        <button
          type="button"
          className="sidebar-collapse-button"
          onClick={toggleSidebar}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? "›" : "‹"}
        </button>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          if (!item.path) {
            return (
              <button
                key={item.label}
                className="sidebar-item disabled"
                disabled
                type="button"
                title={isCollapsed ? item.label : undefined}
              >
                <span className="sidebar-icon">{item.icon}</span>
                <span className="sidebar-label">{item.label}</span>
              </button>
            );
          }

          return (
            <NavLink
              key={item.label}
              to={item.path}
              end={item.path === "/"}
              title={isCollapsed ? item.label : undefined}
              className={({ isActive }) =>
                `sidebar-item ${isActive ? "active" : ""}`
              }
            >
              <span className="sidebar-icon">{item.icon}</span>
              <span className="sidebar-label">{item.label}</span>
            </NavLink>
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
          <div className="version-copy">
            <strong>Personal System</strong>
            <small>v1.0.0</small>
          </div>
        </div>
      </div>
    </aside>
  );
}