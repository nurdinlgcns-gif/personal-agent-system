import type { TaskSnapshot } from "../../types/api";

type RuntimeRagTopResult = {
    chunkId: string;
    memoryId: string;
    agentName: string;
    memoryType: string;
    scope: string;
    score: number;
    contentPreview: string;
};

function parseJsonArray(value?: string | null) {
    if (!value) {
        return [];
    }

    try {
        const parsed = JSON.parse(value);

        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed
            .filter((item): item is string => typeof item === "string")
            .map((item) => item.trim())
            .filter(Boolean);
    } catch {
        return [];
    }
}

function parseNumberArray(value?: string | null) {
    if (!value) {
        return [];
    }

    try {
        const parsed = JSON.parse(value);

        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed
            .map((item) => Number(item))
            .filter((item) => Number.isFinite(item));
    } catch {
        return [];
    }
}

function parseTopResults(value?: string | null): RuntimeRagTopResult[] {
    if (!value) {
        return [];
    }

    try {
        const parsed = JSON.parse(value);

        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed
            .map((item) => ({
                chunkId: typeof item?.chunkId === "string" ? item.chunkId : "",
                memoryId: typeof item?.memoryId === "string" ? item.memoryId : "",
                agentName: typeof item?.agentName === "string" ? item.agentName : "",
                memoryType:
                    typeof item?.memoryType === "string" ? item.memoryType : "",
                scope: typeof item?.scope === "string" ? item.scope : "",
                score: Number(item?.score),
                contentPreview:
                    typeof item?.contentPreview === "string" ? item.contentPreview : "",
            }))
            .filter((item) => item.chunkId && item.memoryId);
    } catch {
        return [];
    }
}

function uniqueClean(values: string[]) {
    return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function RagPills({
    label,
    values,
}: {
    label: string;
    values: string[];
}) {
    const cleanedValues = uniqueClean(values);

    if (cleanedValues.length === 0) {
        return null;
    }

    return (
        <div className="runtime-rag-task-pill-group">
            <span>{label}</span>

            <div>
                {cleanedValues.slice(0, 4).map((value) => (
                    <strong key={`${label}-${value}`}>{value}</strong>
                ))}

                {cleanedValues.length > 4 && (
                    <strong>+{cleanedValues.length - 4}</strong>
                )}
            </div>
        </div>
    );
}

export function RuntimeRagTaskMetadata({
    task,
    compact = false,
}: {
    task: TaskSnapshot;
    compact?: boolean;
}) {
    const ragTypes = parseJsonArray(task.runtimeRagTypesJson);
    const ragScopes = parseJsonArray(task.runtimeRagScopesJson);
    const ragSources = parseJsonArray(task.runtimeRagSourcesJson);
    const ragScores = parseNumberArray(task.runtimeRagScoresJson);
    const ragTopResults = parseTopResults(task.runtimeRagTopResultsJson);

    const hasRagMetadata =
        typeof task.runtimeRagRetrieved === "boolean" ||
        typeof task.runtimeRagItemCount === "number" ||
        ragTypes.length > 0 ||
        ragScopes.length > 0 ||
        ragScores.length > 0 ||
        ragTopResults.length > 0;

    if (!hasRagMetadata) {
        return null;
    }

    if (!task.runtimeRagRetrieved) {
        return (
            <div className="runtime-rag-task-card idle">
                <div className="runtime-rag-task-header">
                    <span>Runtime RAG</span>
                    <strong>Not retrieved</strong>
                </div>
            </div>
        );
    }

    const topScore = ragScores.length > 0 ? ragScores[0] : null;

    return (
        <div className={`runtime-rag-task-card active ${compact ? "compact" : ""}`}>
            <div className="runtime-rag-task-header">
                <span>Runtime RAG</span>
                <strong>
                    Retrieved · {task.runtimeRagItemCount ?? 0} chunk
                    {(task.runtimeRagItemCount ?? 0) === 1 ? "" : "s"}
                </strong>
            </div>

            {!compact && (
                <div className="runtime-rag-task-query">
                    <span>Query</span>
                    <p>{task.runtimeRagQuery || "-"}</p>
                </div>
            )}

            <div className="runtime-rag-task-stats">
                <div>
                    <span>Chars</span>
                    <strong>{task.runtimeRagTotalChars ?? 0}</strong>
                </div>

                <div>
                    <span>Top score</span>
                    <strong>{topScore === null ? "-" : topScore.toFixed(3)}</strong>
                </div>

                <div>
                    <span>Mode</span>
                    <strong>{task.runtimeRagPreviewOnly ? "Preview" : "Active"}</strong>
                </div>
            </div>

            <RagPills label="Types" values={ragTypes} />
            <RagPills label="Scopes" values={ragScopes} />

            {!compact && <RagPills label="Sources" values={ragSources} />}

            {!compact && ragTopResults.length > 0 && (
                <div className="runtime-rag-task-top-results">
                    {ragTopResults.slice(0, 3).map((item) => (
                        <article key={item.chunkId}>
                            <div>
                                <strong>
                                    @{item.agentName} · {item.memoryType}
                                </strong>
                                <span>{Number.isFinite(item.score) ? item.score.toFixed(4) : "-"}</span>
                            </div>

                            <p>{item.contentPreview}</p>
                        </article>
                    ))}
                </div>
            )}
        </div>
    );
}