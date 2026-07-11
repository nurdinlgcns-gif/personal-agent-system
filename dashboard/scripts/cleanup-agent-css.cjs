const fs = require("fs");
const path = require("path");

const dashboardRoot = process.cwd();
const cssPath = path.join(dashboardRoot, "src", "styles", "dashboard.css");

if (!fs.existsSync(cssPath)) {
  console.error("[ERROR] src/styles/dashboard.css not found.");
  process.exit(1);
}

let css = fs.readFileSync(cssPath, "utf-8");

const backupPath = path.join(
  dashboardRoot,
  "src",
  "styles",
  `dashboard.css.backup-agent-${Date.now()}`
);

fs.writeFileSync(backupPath, css, "utf-8");
console.log(`[OK] Backup created: ${backupPath}`);

const markers = [
  "PHASE 7.9\n   AGENT STATUS PANEL POLISH",
  "PHASE 7.9.1\n   AGENT STATUS CARD LAYOUT FIX",
  "PHASE 7.9.2\n   AGENT STATUS DESKTOP/LAPTOP LAYOUT FINAL",
  "PHASE 7.9.3\n   AGENT STATUS 2-COLUMN MAX 4 LAYOUT",
];

function removeSectionByMarker(text, marker) {
  const markerIndex = text.indexOf(marker);

  if (markerIndex === -1) {
    console.log(`[SKIP] Marker not found: ${marker.replace(/\n/g, " ")}`);
    return {
      text,
      removed: false,
    };
  }

  const sectionStart = text.lastIndexOf("/*", markerIndex);

  if (sectionStart === -1) {
    console.log(`[SKIP] Section start not found for: ${marker.replace(/\n/g, " ")}`);
    return {
      text,
      removed: false,
    };
  }

  const nextSectionStart = text.indexOf("/* =========================", markerIndex + marker.length);

  const sectionEnd = nextSectionStart === -1 ? text.length : nextSectionStart;

  const newText = text.slice(0, sectionStart).trimEnd() + "\n\n" + text.slice(sectionEnd).trimStart();

  console.log(`[OK] Removed section: ${marker.replace(/\n/g, " ")}`);

  return {
    text: newText,
    removed: true,
  };
}

let removedCount = 0;

for (const marker of markers) {
  const result = removeSectionByMarker(css, marker);
  css = result.text;

  if (result.removed) {
    removedCount += 1;
  }
}

const finalAgentCss = `
/* =========================
   AGENT STATUS PANEL FINAL
   Clean 2-column max-4 layout
========================= */

.panel-subtitle {
  margin: 5px 0 0;
  color: #94a3b8;
  font-size: 12px;
}

.agent-panel .panel-header {
  align-items: flex-start;
}

.agent-panel .agent-grid {
  display: grid !important;
  grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  gap: 12px !important;
  align-items: stretch;
}

.agent-panel .agent-card {
  min-height: 164px !important;
  padding: 14px !important;
  display: grid !important;
  grid-template-columns: 1fr !important;
  gap: 10px !important;
  position: relative;
  overflow: hidden;
  background: rgba(2, 6, 23, 0.85);
  border: 1px solid #1e293b;
  border-radius: 16px;
  transition:
    border-color 0.22s ease,
    box-shadow 0.22s ease,
    background-color 0.22s ease;
}

.agent-panel .agent-card::before {
  content: "";
  position: absolute;
  inset: 0;
  opacity: 0.08;
  pointer-events: none;
  background:
    radial-gradient(circle at top right, rgba(96, 165, 250, 0.9), transparent 35%),
    linear-gradient(135deg, transparent, rgba(255, 255, 255, 0.04));
}

.agent-card-top-row {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-width: 0;
}

.agent-panel .agent-avatar {
  width: 44px !important;
  height: 44px !important;
  border-radius: 15px !important;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  background: linear-gradient(135deg, #1e293b, #020617);
  border: 1px solid rgba(96, 165, 250, 0.24);
}

.agent-panel .agent-avatar span {
  font-size: 13px !important;
  font-weight: 800;
  color: #bfdbfe;
  letter-spacing: 0.5px;
}

.agent-avatar-idle {
  border-color: rgba(34, 197, 94, 0.35) !important;
  box-shadow: 0 0 22px rgba(34, 197, 94, 0.12);
}

.agent-avatar-working {
  border-color: rgba(245, 158, 11, 0.5) !important;
  box-shadow: 0 0 28px rgba(245, 158, 11, 0.22);
}

.agent-avatar-error {
  border-color: rgba(239, 68, 68, 0.5) !important;
  box-shadow: 0 0 28px rgba(239, 68, 68, 0.2);
}

.agent-panel .agent-status-badge {
  position: static !important;
  top: auto !important;
  right: auto !important;
  height: 24px;
  padding: 5px 8px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 9.5px;
  letter-spacing: 0.35px;
  white-space: nowrap;
  flex: 0 0 auto;
  width: fit-content;
  border-radius: 999px;
  text-transform: uppercase;
}

.agent-status-dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: currentColor;
  box-shadow: 0 0 12px currentColor;
}

.agent-panel .agent-main-info {
  position: relative;
  z-index: 1;
  min-width: 0;
}

.agent-panel .agent-main-info strong {
  display: block;
  color: #f8fafc;
  font-size: 13.5px;
  line-height: 1.25;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.agent-panel .agent-main-info p {
  margin: 4px 0 0;
  color: #94a3b8;
  font-size: 11px;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.agent-panel .agent-state-row {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  margin-top: 0;
}

.agent-panel .agent-state-row span {
  color: #e5e7eb;
  font-size: 11.5px;
  font-weight: 700;
  line-height: 1.35;
}

.agent-panel .agent-state-row small {
  color: #94a3b8;
  font-size: 10px;
  white-space: nowrap;
}

.agent-panel .agent-activity-track {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 6px;
  border-radius: 999px;
  overflow: hidden;
  background: rgba(15, 23, 42, 0.95);
  border: 1px solid rgba(30, 41, 59, 0.9);
}

.agent-activity-fill {
  height: 100%;
  width: 38%;
  border-radius: inherit;
  transition:
    width 0.25s ease,
    background 0.25s ease,
    box-shadow 0.25s ease;
}

.agent-activity-fill.idle {
  width: 34%;
  background: linear-gradient(90deg, #16a34a, #22c55e);
  box-shadow: 0 0 16px rgba(34, 197, 94, 0.35);
}

.agent-activity-fill.working {
  width: 78%;
  background: linear-gradient(90deg, #f59e0b, #fbbf24);
  box-shadow: 0 0 20px rgba(245, 158, 11, 0.42);
  animation: agentWorkingBar 1.4s ease-in-out infinite;
}

.agent-activity-fill.error {
  width: 100%;
  background: linear-gradient(90deg, #dc2626, #ef4444);
  box-shadow: 0 0 20px rgba(239, 68, 68, 0.45);
}

@keyframes agentWorkingBar {
  0% {
    opacity: 0.65;
    transform: translateX(-6%);
  }

  50% {
    opacity: 1;
    transform: translateX(0);
  }

  100% {
    opacity: 0.65;
    transform: translateX(6%);
  }
}

.agent-panel .agent-meta-row {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding-top: 7px;
  border-top: 1px solid rgba(30, 41, 59, 0.72);
}

.agent-panel .agent-meta-row span {
  color: #94a3b8;
  font-size: 10.5px;
}

.agent-panel .agent-meta-row strong {
  color: #bfdbfe;
  font-size: 10.5px;
}

.agent-panel .activity-line {
  display: none !important;
}

.agent-panel .agent-card.idle {
  border-color: rgba(34, 197, 94, 0.35);
}

.agent-panel .agent-card.working {
  border-color: rgba(245, 158, 11, 0.55);
  box-shadow: 0 0 28px rgba(245, 158, 11, 0.14);
}

.agent-panel .agent-card.error {
  border-color: rgba(239, 68, 68, 0.55);
  box-shadow: 0 0 28px rgba(239, 68, 68, 0.14);
}

/* Desktop / laptop: 2 columns */
@media (min-width: 901px) {
  .agent-panel .agent-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  }
}

/* Tablet and compact mobile: 2 columns */
@media (min-width: 480px) and (max-width: 900px) {
  .agent-panel .agent-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  }

  .agent-panel .agent-card {
    min-height: 166px !important;
  }

  .agent-panel .agent-main-info strong {
    font-size: 13px;
  }

  .agent-panel .agent-main-info p {
    font-size: 10.5px;
  }

  .agent-panel .agent-state-row {
    flex-direction: column;
    gap: 4px;
  }

  .agent-panel .agent-state-row small {
    white-space: normal;
  }
}

/* Very small mobile: 1 column */
@media (max-width: 479px) {
  .agent-panel .agent-grid {
    grid-template-columns: 1fr !important;
  }

  .agent-panel .agent-card {
    min-height: 150px !important;
  }

  .agent-panel .agent-main-info strong {
    white-space: normal;
  }

  .agent-panel .agent-state-row {
    flex-direction: column;
    gap: 4px;
  }

  .agent-panel .agent-state-row small {
    white-space: normal;
  }
}
`;

css = `${css.trim()}\n\n${finalAgentCss.trim()}\n`;

fs.writeFileSync(cssPath, css, "utf-8");

console.log("[OK] Agent CSS cleanup completed.");
console.log(`[OK] Removed old agent sections: ${removedCount}`);
console.log("[OK] Appended clean final Agent Status CSS.");
console.log(`[INFO] If needed, restore backup: ${backupPath}`);

