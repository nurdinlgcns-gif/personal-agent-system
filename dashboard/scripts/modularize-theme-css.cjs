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

const themesDir = path.join(
  dashboardRoot,
  "src",
  "styles",
  "themes"
);

if (!fs.existsSync(dashboardCssPath)) {
  console.error("[ERROR] src/styles/dashboard.css not found.");
  process.exit(1);
}

if (!fs.existsSync(appCssPath)) {
  console.error("[ERROR] src/App.css not found.");
  process.exit(1);
}

if (!fs.existsSync(themesDir)) {
  fs.mkdirSync(themesDir, { recursive: true });
}

let css = fs.readFileSync(dashboardCssPath, "utf-8");

const backupDashboardPath = path.join(
  dashboardRoot,
  "src",
  "styles",
  `dashboard.css.backup-theme-${Date.now()}`
);

const backupAppPath = path.join(
  dashboardRoot,
  "src",
  `App.css.backup-theme-${Date.now()}`
);

fs.writeFileSync(backupDashboardPath, css, "utf-8");
fs.writeFileSync(backupAppPath, fs.readFileSync(appCssPath, "utf-8"), "utf-8");

console.log(`[OK] Dashboard CSS backup created: ${backupDashboardPath}`);
console.log(`[OK] App CSS backup created: ${backupAppPath}`);

function findCommentStart(text, marker) {
  const markerIndex = text.indexOf(marker);

  if (markerIndex === -1) {
    return -1;
  }

  return text.lastIndexOf("/*", markerIndex);
}

function extractBlock(text, startMarker, endMarker) {
  const start = findCommentStart(text, startMarker);

  if (start === -1) {
    return {
      text,
      block: "",
      found: false,
    };
  }

  let end = text.length;

  if (endMarker) {
    const endStart = findCommentStart(text, endMarker);

    if (endStart !== -1 && endStart > start) {
      end = endStart;
    }
  }

  const block = text.slice(start, end).trim();
  const updatedText =
    text.slice(0, start).trimEnd() + "\n\n" + text.slice(end).trimStart();

  return {
    text: updatedText,
    block,
    found: true,
  };
}

function writeThemeFile(fileName, content) {
  if (!content.trim()) {
    console.log(`[SKIP] ${fileName} is empty.`);
    return false;
  }

  const targetPath = path.join(themesDir, fileName);
  fs.writeFileSync(targetPath, `${content.trim()}\n`, "utf-8");
  console.log(`[OK] Written: src/styles/themes/${fileName}`);

  return true;
}

const officeMarker =
  "PHASE 7.10\n   OFFICE 2007 BLUE REBORN THEME";

const themeSystemMarker =
  "PHASE 7.10.1\n   THEME SWITCHER SYSTEM";

const m365Marker =
  "PHASE 7.10.2\n   M365 LIGHT THEME";

const extractedFiles = [];

let officeResult = extractBlock(css, officeMarker, themeSystemMarker);
css = officeResult.text;

if (officeResult.found) {
  const wrote = writeThemeFile("office-blue.css", officeResult.block);

  if (wrote) {
    extractedFiles.push("office-blue.css");
  }
} else {
  console.log("[SKIP] Office Blue theme block not found.");
}

let themeSystemResult = extractBlock(css, themeSystemMarker, m365Marker);
css = themeSystemResult.text;

if (themeSystemResult.found) {
  const wrote = writeThemeFile("theme-system.css", themeSystemResult.block);

  if (wrote) {
    extractedFiles.push("theme-system.css");
  }
} else {
  console.log("[SKIP] Theme switcher system block not found.");
}

let m365Result = extractBlock(css, m365Marker, null);
css = m365Result.text;

if (m365Result.found) {
  const wrote = writeThemeFile("m365-light.css", m365Result.block);

  if (wrote) {
    extractedFiles.push("m365-light.css");
  }
} else {
  console.log("[SKIP] M365 Light theme block not found.");
}

css = css
  .replace(/\n{4,}/g, "\n\n\n")
  .trim();

fs.writeFileSync(dashboardCssPath, `${css}\n`, "utf-8");

const appCssContent = [
  '@import "./styles/dashboard.css";',
  '@import "./styles/themes/office-blue.css";',
  '@import "./styles/themes/theme-system.css";',
  '@import "./styles/themes/m365-light.css";',
].join("\n");

fs.writeFileSync(appCssPath, `${appCssContent}\n`, "utf-8");

console.log("[OK] dashboard.css updated.");
console.log("[OK] App.css imports updated.");
console.log("[OK] Extracted theme files:");
extractedFiles.forEach((fileName) => {
  console.log(` - src/styles/themes/${fileName}`);
});

console.log("[INFO] Test all themes before commit.");
console.log(`[INFO] Rollback dashboard CSS: ${backupDashboardPath}`);
console.log(`[INFO] Rollback App CSS: ${backupAppPath}`);