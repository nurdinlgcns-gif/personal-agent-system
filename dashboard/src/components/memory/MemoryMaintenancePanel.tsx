import { useState } from "react";
import {
  runMemoryVaultMaintenance,
  type MemoryVaultMaintenanceResponse,
} from "../../services/memoryVaultApi";

type MemoryMaintenancePanelProps = {
  selectedMemoryId?: string | null;
  disabled?: boolean;
  onCompleted: () => Promise<void>;
};

function formatResultSummary(result: MemoryVaultMaintenanceResponse) {
  const syncedSkills = result.skillSyncResult?.syncedSkillMemoryCount ?? 0;
  const processedSkills = result.skillSyncResult?.processedSkillCount ?? 0;
  const rebuilt = result.rebuildResult?.createdChunkCount ?? 0;
  const processedMemories = result.rebuildResult?.processedMemoryCount ?? 0;
  const embedded = result.embedResult?.embeddedChunkCount ?? 0;
  const processedChunks = result.embedResult?.processedChunkCount ?? 0;

  return `Synced ${syncedSkills}/${processedSkills} skills. Rebuilt ${rebuilt} chunks from ${processedMemories} memories. Embedded ${embedded}/${processedChunks} chunks.`;
}

export function MemoryMaintenancePanel({
  selectedMemoryId,
  disabled = false,
  onCompleted,
}: MemoryMaintenancePanelProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [lastResult, setLastResult] =
    useState<MemoryVaultMaintenanceResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function runMaintenance(input?: {
    memoryId?: string;
    syncSkills?: boolean;
  }) {
    try {
      setIsRunning(true);
      setErrorMessage(null);
      setLastResult(null);

      const result = await runMemoryVaultMaintenance({
        memoryId: input?.memoryId,
        syncSkills: input?.syncSkills,
        rebuild: true,
        embed: true,
        embedOnlyPending: false,
        limit: 500,
        maxChunkChars: 900,
        overlapChars: 120,
        minChunkChars: 40,
      });

      setLastResult(result);

      await onCompleted();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to run Memory Vault maintenance.";

      setErrorMessage(message);
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <section className="memory-maintenance-card">
      <div className="memory-section-title">
        <div>
          <span>Maintenance automation</span>
          <h3>Skill RAG + Chunk + Embedding Refresh</h3>
        </div>

        <div className="memory-page-badge">
          {isRunning ? "Running" : "Ready"}
        </div>
      </div>

      <p>
        Sync skill docs into RAG-ready memory records, rebuild chunks, and
        refresh embeddings. Use this after changing skill files, skill
        descriptions, memory content, scope, or retrieval behavior.
      </p>

      <div className="memory-maintenance-actions">
        <button
          type="button"
          disabled={disabled || isRunning}
          onClick={() =>
            runMaintenance({
              syncSkills: true,
            })
          }
        >
          {isRunning ? "Running..." : "Sync Skills + Rebuild + Embed All"}
        </button>

        <button
          type="button"
          disabled={disabled || isRunning || !selectedMemoryId}
          onClick={() =>
            runMaintenance({
              memoryId: selectedMemoryId || undefined,
              syncSkills: false,
            })
          }
        >
          {isRunning ? "Running..." : "Rebuild + Embed Selected"}
        </button>
      </div>

      {lastResult && (
        <div className="memory-maintenance-result">
          <strong>Maintenance completed</strong>
          <span>{formatResultSummary(lastResult)}</span>

          <div className="memory-maintenance-grid">
            <div>
              <small>Skills synced</small>
              <b>{lastResult.skillSyncResult?.syncedSkillMemoryCount ?? 0}</b>
            </div>

            <div>
              <small>Total chunks</small>
              <b>{lastResult.summary.totalChunks}</b>
            </div>

            <div>
              <small>Embedded</small>
              <b>{lastResult.summary.embeddedChunks}</b>
            </div>

            <div>
              <small>Pending</small>
              <b>{lastResult.summary.pendingEmbeddings}</b>
            </div>

            <div>
              <small>Failed</small>
              <b>{lastResult.summary.failedEmbeddings}</b>
            </div>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="memory-maintenance-error">
          <strong>Maintenance failed</strong>
          <span>{errorMessage}</span>
        </div>
      )}
    </section>
  );
}