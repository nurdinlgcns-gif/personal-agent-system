const fs = require("fs");
const path = require("path");

const root = process.cwd();

const checks = [];
const warnings = [];

function fileExists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function readFile(relativePath) {
  const filePath = path.join(root, relativePath);

  if (!fs.existsSync(filePath)) {
    return "";
  }

  return fs.readFileSync(filePath, "utf-8");
}

function addCheck(name, passed, detail) {
  checks.push({
    name,
    passed,
    detail,
  });

  const prefix = passed ? "[OK]" : "[FAIL]";
  console.log(`${prefix} ${name}${detail ? ` - ${detail}` : ""}`);
}

function addWarning(name, detail) {
  warnings.push({
    name,
    detail,
  });

  console.log(`[WARN] ${name}${detail ? ` - ${detail}` : ""}`);
}

console.log("");
console.log("===============================================");
console.log(" OFFICE SCENE QA SWEEP");
console.log("===============================================");
console.log("");

const requiredFiles = [
  "src/components/office/OfficeCanvas.tsx",
  "src/components/office/OfficeFlowChannels.tsx",
  "src/components/office/OfficeDetailPanel.tsx",
  "src/views/OfficeView.tsx",
  "src/styles/components/office.css",
  "src/styles/components/office-element-polish.css",
  "src/styles/components/office-position-map.css",
  "src/styles/components/office-detail-panel.css",
  "src/styles/components/office-interaction-polish.css",
  "src/styles/components/office-ambient-polish.css",
  "src/styles/components/office-activity-log.css",
  "src/styles/components/office-task-flow-polish.css",
  "src/styles/components/office-toolbar-legend.css",
  "src/styles/components/office-final-review.css",
  "src/styles/components/office-flow-channels.css",
  "src/styles/components/office-viewport-zoom.css",
  "src/styles/components/office-activity-log-responsive.css",
  "src/styles/components/office-mobile-canvas-fix.css",
  "src/styles/components/office-anti-flicker.css",
  "src/styles/components/office-render-stability.css",
];

for (const file of requiredFiles) {
  addCheck(`Required file exists: ${file}`, fileExists(file));
}

const appCss = readFile("src/App.css");
const officeCanvas = readFile("src/components/office/OfficeCanvas.tsx");
const officeFlowChannels = readFile("src/components/office/OfficeFlowChannels.tsx");
const appTsx = readFile("src/App.tsx");

const requiredImports = [
  '@import "./styles/components/office.css";',
  '@import "./styles/components/office-element-polish.css";',
  '@import "./styles/components/office-position-map.css";',
  '@import "./styles/components/office-detail-panel.css";',
  '@import "./styles/components/office-interaction-polish.css";',
  '@import "./styles/components/office-ambient-polish.css";',
  '@import "./styles/components/office-activity-log.css";',
  '@import "./styles/components/office-task-flow-polish.css";',
  '@import "./styles/components/office-toolbar-legend.css";',
  '@import "./styles/components/office-final-review.css";',
  '@import "./styles/components/office-flow-channels.css";',
  '@import "./styles/components/office-viewport-zoom.css";',
  '@import "./styles/components/office-activity-log-responsive.css";',
  '@import "./styles/components/office-mobile-canvas-fix.css";',
  '@import "./styles/components/office-anti-flicker.css";',
  '@import "./styles/components/office-render-stability.css";',
];

for (const importLine of requiredImports) {
  addCheck(
    `App.css import exists: ${importLine}`,
    appCss.includes(importLine)
  );
}

const importOrderNames = [
  "office.css",
  "office-element-polish.css",
  "office-position-map.css",
  "office-detail-panel.css",
  "office-interaction-polish.css",
  "office-ambient-polish.css",
  "office-activity-log.css",
  "office-task-flow-polish.css",
  "office-toolbar-legend.css",
  "office-final-review.css",
  "office-flow-channels.css",
  "office-viewport-zoom.css",
  "office-activity-log-responsive.css",
  "office-mobile-canvas-fix.css",
  "office-anti-flicker.css",
  "office-render-stability.css",
];

let previousIndex = -1;
let orderIsValid = true;

for (const importName of importOrderNames) {
  const currentIndex = appCss.indexOf(importName);

  if (currentIndex === -1) {
    orderIsValid = false;
    addWarning("Import order skipped", `${importName} not found`);
    continue;
  }

  if (currentIndex < previousIndex) {
    orderIsValid = false;
    addWarning("Import order issue", `${importName} appears before expected order`);
  }

  previousIndex = currentIndex;
}

addCheck("Office CSS import order looks valid", orderIsValid);

const requiredLocalStorageKeys = [
  "office-activity-log-position",
  "office-scene-zoom-level",
  "office-show-labels",
  "office-show-activity-log",
  "office-compact-mode",
];

for (const key of requiredLocalStorageKeys) {
  addCheck(
    `Office preference key exists: ${key}`,
    officeCanvas.includes(key)
  );
}

const requiredOfficeCanvasSignals = [
  "MIN_VISUAL_FLOW_MS",
  "VisualFlowState",
  "visualFlow",
  "readBooleanPreference",
  "resetOfficePreferences",
  "OfficeFlowChannels",
  "office-scene-viewport",
  "office-stage",
];

for (const signal of requiredOfficeCanvasSignals) {
  addCheck(
    `OfficeCanvas signal exists: ${signal}`,
    officeCanvas.includes(signal)
  );
}

const requiredFlowSignals = [
  "step-1",
  "step-2",
  "step-3",
  "data-whatsapp-server",
  "data-manual-server",
  "data-skill-agent",
  "data-agent-server",
  "data-server-output",
];

for (const signal of requiredFlowSignals) {
  addCheck(
    `OfficeFlowChannels signal exists: ${signal}`,
    officeFlowChannels.includes(signal)
  );
}

const appRouteSignals = [
  "useLocation",
  "office-route-main",
  'path="/office"',
];

for (const signal of appRouteSignals) {
  addCheck(
    `App route signal exists: ${signal}`,
    appTsx.includes(signal)
  );
}

const duplicateImports = requiredImports.filter((importLine) => {
  const firstIndex = appCss.indexOf(importLine);
  const lastIndex = appCss.lastIndexOf(importLine);
  return firstIndex !== -1 && firstIndex !== lastIndex;
});

addCheck(
  "No duplicate critical Office imports",
  duplicateImports.length === 0,
  duplicateImports.length > 0 ? duplicateImports.join(", ") : ""
);

const passedCount = checks.filter((check) => check.passed).length;
const failedCount = checks.length - passedCount;

const reportLines = [
  "# Office Scene QA Report",
  "",
  `Generated: ${new Date().toISOString()}`,
  "",
  "## Summary",
  "",
  `- Passed: ${passedCount}`,
  `- Failed: ${failedCount}`,
  `- Warnings: ${warnings.length}`,
  "",
  "## Checks",
  "",
  ...checks.map((check) => {
    const marker = check.passed ? "✅" : "❌";
    return `- ${marker} ${check.name}${check.detail ? ` — ${check.detail}` : ""}`;
  }),
  "",
  "## Warnings",
  "",
  ...(warnings.length === 0
    ? ["- No warnings."]
    : warnings.map((warning) => `- ⚠️ ${warning.name}${warning.detail ? ` — ${warning.detail}` : ""}`)),
  "",
  "## Recommended Manual QA",
  "",
  "- Open `/office`.",
  "- Test zoom in, zoom out, reset zoom, and fit view.",
  "- Toggle Hide Labels, Hide Log, and Compact.",
  "- Refresh browser and verify Office preferences persist.",
  "- Drag Mini Activity Log and verify position persists.",
  "- Send manual task and verify smooth sequential flow.",
  "- Send WhatsApp task and verify WhatsApp connector is active.",
  "- Verify Office Scene does not flicker during realtime updates.",
  "- Verify tablet/mobile viewport remains scrollable and stable.",
  "",
];

const reportPath = path.join(root, "docs", "office-scene-qa-report.md");

fs.mkdirSync(path.dirname(reportPath), {
  recursive: true,
});

fs.writeFileSync(reportPath, reportLines.join("\n"), "utf-8");

console.log("");
console.log("===============================================");
console.log(`QA completed. Passed: ${passedCount}, Failed: ${failedCount}, Warnings: ${warnings.length}`);
console.log(`Report written: ${path.relative(root, reportPath)}`);
console.log("===============================================");
console.log("");

if (failedCount > 0) {
  process.exitCode = 1;
}