import { execFile } from "child_process";
import fs from "fs";
import path from "path";

import { env } from "../../config/env";
import { logger } from "../../utils/logger";

type ConverterRunOptions = {
  outputRoot?: string;
};

type ConverterRunResult = {
  stdout: string;
  stderr: string;
};

function ensureExists(filePath: string, label: string) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${label} does not exist: ${filePath}`);
  }
}

function getPythonPathEnv() {
  return path.resolve(env.DOC_TO_MD_PROJECT_ROOT, "src");
}

function parseMarkdownPathFromStdout(stdout: string) {
  const lines = stdout.split(/\r?\n/);

  for (const line of lines) {
    const match = line.match(/^\s*Markdown\s*:\s*(.+)\s*$/i);

    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return "";
}

function parseImageCountFromStdout(stdout: string) {
  const lines = stdout.split(/\r?\n/);

  for (const line of lines) {
    const match = line.match(/^\s*Images\s*:\s*(\d+)\s*$/i);

    if (match?.[1]) {
      return Number(match[1]);
    }
  }

  return 0;
}

function parseWarningsFromStdout(stdout: string) {
  const lines = stdout.split(/\r?\n/);
  const warnings: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("- ")) {
      warnings.push(trimmed.replace(/^- /, "").trim());
    }
  }

  return warnings;
}

export function extractConverterStdoutMetadata(stdout: string) {
  return {
    markdownPath: parseMarkdownPathFromStdout(stdout),
    imageCount: parseImageCountFromStdout(stdout),
    warnings: parseWarningsFromStdout(stdout),
  };
}

export async function runDocToMarkdownConverter(
  inputPath: string,
  options: ConverterRunOptions = {}
) {
  if (!env.DOC_TO_MD_ENABLED) {
    throw new Error("Document ingestion is disabled.");
  }

  const normalizedInputPath = path.resolve(inputPath);
  const normalizedProjectRoot = path.resolve(env.DOC_TO_MD_PROJECT_ROOT);
  const normalizedPythonExe = path.resolve(env.DOC_TO_MD_PYTHON_EXE);
  const normalizedOutputRoot = path.resolve(
    options.outputRoot || env.DOC_TO_MD_OUTPUT_ROOT
  );

  ensureExists(normalizedProjectRoot, "DOC_TO_MD_PROJECT_ROOT");
  ensureExists(normalizedPythonExe, "DOC_TO_MD_PYTHON_EXE");
  ensureExists(normalizedInputPath, "Input path");

  if (!fs.existsSync(normalizedOutputRoot)) {
    fs.mkdirSync(normalizedOutputRoot, {
      recursive: true,
    });
  }

  const pythonPath = getPythonPathEnv();

  const args = [
    "-m",
    "doc_to_md.main",
    "convert",
    normalizedInputPath,
    "--output",
    normalizedOutputRoot,
  ];

  logger.server(`Document ingestion convert started: ${normalizedInputPath}`);

  return await new Promise<ConverterRunResult>((resolve, reject) => {
    execFile(
      normalizedPythonExe,
      args,
      {
        cwd: normalizedProjectRoot,
        timeout: env.DOC_TO_MD_TIMEOUT_MS,
        env: {
          ...process.env,
          PYTHONPATH: pythonPath,
        },
        windowsHide: true,
      },
      (error, stdout, stderr) => {
        const result = {
          stdout: stdout || "",
          stderr: stderr || "",
        };

        if (error) {
          const message = [
            `Doc-to-Markdown converter failed: ${error.message}`,
            stderr ? `stderr: ${stderr}` : "",
            stdout ? `stdout: ${stdout}` : "",
          ]
            .filter(Boolean)
            .join("\n");

          reject(new Error(message));
          return;
        }

        resolve(result);
      }
    );
  });
}