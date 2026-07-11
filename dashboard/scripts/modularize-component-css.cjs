const fs = require("fs");
const path = require("path");

const dashboardRoot = process.cwd();

const dashboardCssPath = path.join(
  dashboardRoot,
  "src",
  "styles",
  "dashboard.css"
);

const appCssPath = path.join(dashboardRoot, "src", "App.css");

const componentsDir = path.join(
  dashboardRoot,
  "src",
  "styles",
  "components"
);

if (!fs.existsSync(dashboardCssPath)) {
  console.error("[ERROR] src/styles/dashboard.css not found.");
  process.exit(1);
}

if (!fs.existsSync(appCssPath)) {
  console.error("[ERROR] src/App.css not found.");
  process.exit(1);
}

if (!fs.existsSync(componentsDir)) {
  fs.mkdirSync(componentsDir, { recursive: true });
}

let css = fs.readFileSync(dashboardCssPath, "utf-8");

const timestamp = Date.now();

const backupDashboardPath = path.join(
  dashboardRoot,
  "src",
  "styles",
  `dashboard.css.backup-components-${timestamp}`
);

const backupAppPath = path.join(
  dashboardRoot,
  "src",
  `App.css.backup-components-${timestamp}`
);

fs.writeFileSync(backupDashboardPath, css, "utf-8");
fs.writeFileSync(backupAppPath, fs.readFileSync(appCssPath, "utf-8"), "utf-8");

console.log(`[OK] Dashboard CSS backup created: ${backupDashboardPath}`);
console.log(`[OK] App CSS backup created: ${backupAppPath}`);

const sections = [
  {
    marker: "FLOATING AI TASK ASSISTANT",
    fileName: "floating-assistant.css",
  },
  {
    marker: "SKILL LIBRARY CARD POLISH",
    fileName: "skill-library.css",
  },
  {
    marker: "AGENT STATUS PANEL FINAL",
    fileName: "agent-status.css",
  },
  {
    marker: "PHASE 7.11\n   3D AGENT PREVIEW PLACEHOLDER ENHANCEMENT",
    fileName: "agent-preview.css",
  },
];

function findSectionStart(text, marker) {
  const markerIndex = text.indexOf(marker);

  if (markerIndex === -1) {
    return -1;
  }

  return text.lastIndexOf("/*", markerIndex);
}

function findNextSectionStart(text, fromIndex) {
  return text.indexOf("/* =========================", fromIndex + 1);
}

function extractSection(text, marker) {
  const start = findSectionStart(text, marker);

  if (start === -1) {
    return {
      updatedText: text,
      sectionContent: "",
      found: false,
    };
  }

  const nextStart = findNextSectionStart(text, start);
  const end = nextStart === -1 ? text.length : nextStart;

  const sectionContent = text.slice(start, end).trim();

  const updatedText =
    text.slice(0, start).trimEnd() + "\n\n" + text.slice(end).trimStart();

  return {
    updatedText,
    sectionContent,
    found: true,
  };
}

const extractedFiles = [];

for (const section of sections) {
  const result = extractSection(css, section.marker);

  if (!result.found) {
    console.log(`[SKIP] Section not found: ${section.marker.replace(/\n/g, " ")}`);
    continue;
  }

  css = result.updatedText;

  const targetPath = path.join(componentsDir, section.fileName);

  fs.writeFileSync(
    targetPath,
    `${result.sectionContent.trim()}\n`,
    "utf-8"
  );

  extractedFiles.push(section.fileName);

  console.log(`[OK] Extracted: src/styles/components/${section.fileName}`);
}

css = css
  .replace(/\n{4,}/g, "\n\n\n")
  .trim();

fs.writeFileSync(dashboardCssPath, `${css}\n`, "utf-8");

const imports = [
  '@import "./styles/dashboard.css";',
];

const componentImports = [
  "floating-assistant.css",
  "skill-library.css",
  "agent-status.css",
  "agent-preview.css",
]
  .filter((fileName) =>
    fs.existsSync(path.join(componentsDir, fileName))
  )
  .map((fileName) => `@import "./styles/components/${fileName}";`);

const themeImports = [
  '@import "./styles/themes/office-blue.css";',
  '@import "./styles/themes/theme-system.css";',
  '@import "./styles/themes/m365-light.css";',
];

const appCssContent = [
  ...imports,
  ...componentImports,
  ...themeImports,
].join("\n");

fs.writeFileSync(appCssPath, `${appCssContent}\n`, "utf-8");

console.log("[OK] dashboard.css updated.");
console.log("[OK] App.css imports updated.");
console.log("[OK] Component CSS files:");
extractedFiles.forEach((fileName) => {
  console.log(` - src/styles/components/${fileName}`);
});

console.log("[INFO] Test the dashboard before commit.");
console.log(`[INFO] Rollback dashboard CSS: ${backupDashboardPath}`);
console.log(`[INFO] Rollback App CSS: ${backupAppPath}`);
