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
  `dashboard.css.backup-${Date.now()}`
);

fs.writeFileSync(backupPath, css, "utf-8");
console.log(`[OK] Backup created: ${backupPath}`);

function findBlockEnd(text, openBraceIndex) {
  let depth = 0;

  for (let i = openBraceIndex; i < text.length; i += 1) {
    const char = text[i];

    if (char === "{") {
      depth += 1;
    }

    if (char === "}") {
      depth -= 1;

      if (depth === 0) {
        return i;
      }
    }
  }

  return -1;
}

function removeBlockByExactStart(text, exactStart) {
  let output = text;
  let removed = 0;

  while (true) {
    const startIndex = output.indexOf(exactStart);

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
      console.error(`[WARN] Unclosed block skipped: ${exactStart}`);
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

function removeMediaBlockContaining(text, mediaStart, keyword) {
  let output = text;
  let removed = 0;

  while (true) {
    const startIndex = output.indexOf(mediaStart);

    if (startIndex === -1) {
      break;
    }

    const braceIndex = output.indexOf("{", startIndex);

    if (braceIndex === -1) {
      break;
    }

    const blockEnd = findBlockEnd(output, braceIndex);

    if (blockEnd === -1) {
      console.error(`[WARN] Unclosed media block skipped: ${mediaStart}`);
      break;
    }

    const blockContent = output.slice(startIndex, blockEnd + 1);

    if (!blockContent.includes(keyword)) {
      break;
    }

    const lineStart = output.lastIndexOf("\n", startIndex - 1) + 1;
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

let totalRemoved = 0;

/**
 * Preserve valid shared selector:
 * Before:
 * .panel-header button,
 * .manual-task-bar button { ... }
 *
 * After:
 * .panel-header button { ... }
 */
css = css.replace(
  /\.panel-header button,\s*\r?\n\.manual-task-bar button\s*\{/g,
  ".panel-header button {"
);

/**
 * Remove old hidden fallback block:
 * .manual-task-bar,
 * .manual-task-widget {
 *   display: none;
 * }
 */
const hiddenLegacyBlockRegex =
  /\/\*\s*Hide old manual task bar if previous CSS still exists\s*\*\/\s*\.manual-task-bar,\s*\.manual-task-widget\s*\{\s*display:\s*none;\s*\}\s*/g;

const hiddenMatches = css.match(hiddenLegacyBlockRegex);

if (hiddenMatches) {
  totalRemoved += hiddenMatches.length;
  css = css.replace(hiddenLegacyBlockRegex, "");
}

/**
 * Remove old manual task widget blocks.
 * These are no longer used after FloatingTaskAssistant.
 */
const legacyBlocks = [
  ".manual-task-bar {",
  ".manual-task-bar p {",

  ".manual-task-widget {",
  ".manual-task-content {",
  ".manual-task-content p {",
  ".manual-task-form {",
  ".manual-task-form input {",
  ".manual-task-form input:focus {",
  ".manual-task-form button {",
  ".manual-task-form button:disabled {",
  ".manual-task-error {",
  ".manual-task-result {",
  ".manual-task-result strong {",
  ".manual-task-result p {",
];

for (const blockStart of legacyBlocks) {
  const result = removeBlockByExactStart(css, blockStart);
  css = result.css;
  totalRemoved += result.removed;
}

/**
 * Remove old manual-task-form mobile media block:
 * @media (max-width: 900px) { .manual-task-form { ... } }
 */
const mediaResult = removeMediaBlockContaining(
  css,
  "@media (max-width: 900px)",
  ".manual-task-form"
);

css = mediaResult.css;
totalRemoved += mediaResult.removed;

/**
 * Clean excessive blank lines.
 */
css = css
  .replace(/\n{4,}/g, "\n\n\n")
  .replace(/[ \t]+$/gm, "")
  .trim();

fs.writeFileSync(cssPath, `${css}\n`, "utf-8");

console.log(`[OK] Legacy CSS cleanup completed.`);
console.log(`[OK] Removed blocks: ${totalRemoved}`);
console.log(`[OK] Updated file: src/styles/dashboard.css`);
console.log(`[INFO] If something breaks, restore from: ${backupPath}`);
