import { useEffect, useMemo, useState } from "react";
import {
  fetchKnowledgeSourceFiles,
  importKnowledgeSource,
  importKnowledgeSourceFolder,
  runMemoryVaultMaintenance,
  type KnowledgeSourceFileItem,
  type KnowledgeSourceImportResult,
  type KnowledgeSourceFolderImportResult,
} from "../../services/memoryVaultApi";

type KnowledgeSourceImportPanelProps = {
  agentOptions: string[];
  disabled?: boolean;
  onCompleted: () => Promise<void>;
};

function parseCommaList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getDefaultAgent(agentOptions: string[]) {
  if (agentOptions.includes("design-agent")) {
    return "design-agent";
  }

  return agentOptions[0] || "design-agent";
}

export function KnowledgeSourceImportPanel({
  agentOptions,
  disabled = false,
  onCompleted,
}: KnowledgeSourceImportPanelProps) {
  const [files, setFiles] = useState<KnowledgeSourceFileItem[]>([]);
  const [mode, setMode] = useState<"text" | "file" | "folder">("text");
  const [title, setTitle] = useState("Brand Guide");
  const [content, setContent] = useState("");
  const [selectedFile, setSelectedFile] = useState("");
  const [agentName, setAgentName] = useState(getDefaultAgent(agentOptions));
  const [scope, setScope] = useState("project");
  const [allowedAgentsText, setAllowedAgentsText] = useState("");
  const [linkedSkillsText, setLinkedSkillsText] = useState("");
  const [sensitivityLevel, setSensitivityLevel] = useState("normal");
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [lastImportResult, setLastImportResult] =
    useState<KnowledgeSourceImportResult | null>(null);
  const [lastFolderResult, setLastFolderResult] =
    useState<KnowledgeSourceFolderImportResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const normalizedAgentOptions = useMemo(() => {
    return agentOptions.length > 0 ? agentOptions : ["design-agent"];
  }, [agentOptions]);

  async function loadFiles() {
    try {
      setIsLoadingFiles(true);
      const nextFiles = await fetchKnowledgeSourceFiles();
      setFiles(nextFiles);

      if (!selectedFile && nextFiles[0]) {
        setSelectedFile(nextFiles[0].relativePath);
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to load knowledge source files.";

      setErrorMessage(message);
    } finally {
      setIsLoadingFiles(false);
    }
  }

  useEffect(() => {
    loadFiles();
  }, []);

  useEffect(() => {
    setAgentName((currentAgentName) => {
      if (normalizedAgentOptions.includes(currentAgentName)) {
        return currentAgentName;
      }

      return getDefaultAgent(normalizedAgentOptions);
    });
  }, [normalizedAgentOptions]);

  async function runMaintenanceAfterImport(memoryId?: string) {
    await runMemoryVaultMaintenance({
      memoryId,
      syncSkills: false,
      rebuild: true,
      embed: true,
      embedOnlyPending: false,
      limit: 500,
      maxChunkChars: 900,
      overlapChars: 120,
      minChunkChars: 40,
    });
  }

  async function handleImport() {
    try {
      setIsImporting(true);
      setErrorMessage(null);
      setLastImportResult(null);
      setLastFolderResult(null);

      const allowedAgents = parseCommaList(allowedAgentsText);
      const linkedSkillNames = parseCommaList(linkedSkillsText);

      if (mode === "folder") {
        const folderResult = await importKnowledgeSourceFolder({
          agentName,
          scope,
          allowedAgents,
          linkedSkillNames,
          sensitivityLevel,
        });

        setLastFolderResult(folderResult);

        await runMemoryVaultMaintenance({
          syncSkills: false,
          rebuild: true,
          embed: true,
          embedOnlyPending: false,
          limit: 500,
          maxChunkChars: 900,
          overlapChars: 120,
          minChunkChars: 40,
        });

        await onCompleted();
        return;
      }

      const importResult = await importKnowledgeSource({
        title,
        content: mode === "text" ? content : undefined,
        fileRelativePath: mode === "file" ? selectedFile : undefined,
        agentName,
        scope,
        allowedAgents,
        linkedSkillNames,
        sensitivityLevel,
      });

      setLastImportResult(importResult);

      if (importResult.imported) {
        await runMaintenanceAfterImport(importResult.memoryId);
      }

      await onCompleted();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to import knowledge source.";

      setErrorMessage(message);
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <section className="knowledge-source-import-card">
      <div className="memory-section-title">
        <div>
          <span>Knowledge source import</span>
          <h3>Import Text or Markdown into RAG</h3>
        </div>

        <div className="memory-page-badge">
          {isImporting ? "Importing" : "Foundation"}
        </div>
      </div>

      <p>
        Import markdown or text knowledge into Memory Vault as RAG-ready
        knowledge_source records. Imported sources are automatically rebuilt and
        embedded after import.
      </p>

      <div className="knowledge-source-mode-tabs">
        <button
          type="button"
          className={mode === "text" ? "active" : ""}
          onClick={() => setMode("text")}
        >
          Text
        </button>

        <button
          type="button"
          className={mode === "file" ? "active" : ""}
          onClick={() => setMode("file")}
        >
          Backend File
        </button>

        <button
          type="button"
          className={mode === "folder" ? "active" : ""}
          onClick={() => setMode("folder")}
        >
          Folder
        </button>
      </div>

      <div className="knowledge-source-grid">
        {mode !== "folder" && (
          <label className="memory-filter-field">
            <span>Title</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Brand Guide"
            />
          </label>
        )}

        <label className="memory-filter-field">
          <span>Agent</span>
          <select
            value={agentName}
            onChange={(event) => setAgentName(event.target.value)}
          >
            {normalizedAgentOptions.map((agent) => (
              <option key={agent} value={agent}>
                @{agent}
              </option>
            ))}
          </select>
        </label>

        <label className="memory-filter-field">
          <span>Scope</span>
          <select value={scope} onChange={(event) => setScope(event.target.value)}>
            <option value="project">project</option>
            <option value="agent">agent</option>
            <option value="skill">skill</option>
            <option value="global">global</option>
          </select>
        </label>

        <label className="memory-filter-field">
          <span>Sensitivity</span>
          <select
            value={sensitivityLevel}
            onChange={(event) => setSensitivityLevel(event.target.value)}
          >
            <option value="normal">normal</option>
            <option value="internal">internal</option>
          </select>
        </label>

        <label className="memory-filter-field">
          <span>Allowed agents</span>
          <input
            value={allowedAgentsText}
            onChange={(event) => setAllowedAgentsText(event.target.value)}
            placeholder="design-agent, writer-agent"
          />
        </label>

        <label className="memory-filter-field">
          <span>Linked skills</span>
          <input
            value={linkedSkillsText}
            onChange={(event) => setLinkedSkillsText(event.target.value)}
            placeholder="generate_ad_copy, social_caption"
          />
        </label>
      </div>

      {mode === "text" && (
        <label className="knowledge-source-textarea">
          <span>Knowledge content</span>
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Paste markdown or text knowledge here..."
            rows={8}
          />
        </label>
      )}

      {mode === "file" && (
        <div className="knowledge-source-file-panel">
          <label className="memory-filter-field">
            <span>Backend file</span>
            <select
              value={selectedFile}
              onChange={(event) => setSelectedFile(event.target.value)}
              disabled={isLoadingFiles || files.length === 0}
            >
              {files.length === 0 ? (
                <option value="">No .md/.txt files found</option>
              ) : (
                files.map((file) => (
                  <option key={file.relativePath} value={file.relativePath}>
                    {file.relativePath}
                  </option>
                ))
              )}
            </select>
          </label>

          <button type="button" onClick={loadFiles} disabled={isLoadingFiles}>
            {isLoadingFiles ? "Loading..." : "Refresh Files"}
          </button>
        </div>
      )}

      {mode === "folder" && (
        <div className="knowledge-source-folder-note">
          <strong>Folder import</strong>
          <span>
            Imports all .md and .txt files from backend/knowledge-sources and then
            rebuilds + embeds all chunks.
          </span>
        </div>
      )}

      <div className="knowledge-source-actions">
        <button
          type="button"
          disabled={disabled || isImporting}
          onClick={handleImport}
        >
          {isImporting ? "Importing..." : "Import + Rebuild + Embed"}
        </button>
      </div>

      {lastImportResult && (
        <div className="knowledge-source-result">
          <strong>
            {lastImportResult.imported
              ? `Knowledge source ${lastImportResult.action}`
              : "Knowledge source skipped"}
          </strong>
          <span>
            {lastImportResult.title} · {lastImportResult.sourceRef} ·{" "}
            {lastImportResult.contentChars} chars
          </span>
          {lastImportResult.reason && <span>{lastImportResult.reason}</span>}
        </div>
      )}

      {lastFolderResult && (
        <div className="knowledge-source-result">
          <strong>Folder import completed</strong>
          <span>
            Imported {lastFolderResult.importedCount}/
            {lastFolderResult.processedFileCount} files. Skipped{" "}
            {lastFolderResult.skippedCount}.
          </span>
        </div>
      )}

      {errorMessage && (
        <div className="knowledge-source-error">
          <strong>Import failed</strong>
          <span>{errorMessage}</span>
        </div>
      )}
    </section>
  );
}