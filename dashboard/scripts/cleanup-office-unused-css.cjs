const fs = require("fs");
const path = require("path");

const dashboardRoot = process.cwd();
const officeCssPath = path.join(
  dashboardRoot,
  "src",
  "styles",
  "components",
  "office.css"
);

if (!fs.existsSync(officeCssPath)) {
  console.error("[ERROR] src/styles/components/office.css not found.");
  process.exit(1);
}

let css = fs.readFileSync(officeCssPath, "utf-8");

const backupPath = path.join(
  dashboardRoot,
  "src",
  "styles",
  "components",
  `office.css.backup-cleanup-${Date.now()}`
);

fs.writeFileSync(backupPath, css, "utf-8");
console.log(`[OK] Backup created: ${backupPath}`);

function findBlockEnd(text, openBraceIndex) {
  let depth = 0;

  for (let index = openBraceIndex; index < text.length; index += 1) {
    const char = text[index];

    if (char === "{") {
      depth += 1;
    }

    if (char === "}") {
      depth -= 1;

      if (depth === 0) {
        return index;
      }
    }
  }

  return -1;
}

function removeCssBlock(text, selectorStart) {
  let output = text;
  let removed = 0;

  while (true) {
    const startIndex = output.indexOf(selectorStart);

    if (startIndex === -1) {
      break;
    }

    const lineStart = output.lastIndexOf("\n", startIndex - 1) + 1;
    const braceIndex = output.indexOf("{", startIndex);

    if (braceIndex === -1) {
      break;
    }

    const blockEnd = findBlockEnd(output, braceIndex);

    if (blockEnd === -1) {
      console.warn(`[WARN] Unclosed block skipped: ${selectorStart}`);
      break;
    }

    let removeEnd = blockEnd + 1;

    while (
      removeEnd < output.length &&
      (output[removeEnd] === "\n" ||
        output[removeEnd] === "\r" ||
        output[removeEnd] === " ")
    ) {
      removeEnd += 1;
    }

    output = output.slice(0, lineStart) + output.slice(removeEnd);
    removed += 1;
  }

  return {
    css: output,
    removed,
  };
}

/**
 * These selectors are no longer rendered after OfficeView was compacted.
 * We keep shared responsive rules untouched if they also target active scene elements.
 */
const unusedSelectors = [
  ".office-hero {",
  ".office-hero h1 {",
  ".office-hero p {",
  ".office-live-badge {",
  ".office-live-badge span {",
  ".office-live-badge.working {",
  ".office-live-badge.idle {",
];

let removedCount = 0;

for (const selector of unusedSelectors) {
  const result = removeCssBlock(css, selector);
  css = result.css;
  removedCount += result.removed;

  if (result.removed > 0) {
    console.log(`[OK] Removed ${result.removed} block(s): ${selector}`);
  }
}

css = css
  .replace(/\n{4,}/g, "\n\n\n")
  .replace(/[ \t]+$/gm, "")
  .trim();

fs.writeFileSync(officeCssPath, `${css}\n`, "utf-8");

console.log("[OK] Office unused CSS cleanup completed.");
console.log(`[OK] Total removed blocks: ${removedCount}`);
console.log(`[INFO] If needed, restore backup: ${backupPath}`);