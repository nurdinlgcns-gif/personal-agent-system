import type { ManualTaskRuntimeRagContext } from "../../types/api";

function uniqueClean(values: string[]) {
    return Array.from(
        new Set(values.map((value) => value.trim()).filter(Boolean))
    );
}

function RuntimeRagPillGroup({
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
        <div className="runtime-rag-pill-group">
            <span>{label}</span>

            <div>
                {cleanedValues.map((value) => (
                    <strong key={`${label}-${value}`}>{value}</strong>
                ))}
            </div>
        </div>
    );
}

export function RuntimeRagContextDisplay({
    runtimeRagContext,
}: {
    runtimeRagContext?: ManualTaskRuntimeRagContext | null;
}) {
    if (!runtimeRagContext) {
        return null;
    }

    if (!runtimeRagContext.retrieved) {
        return (
            <div className="runtime-rag-context-display idle">
                <div className="runtime-rag-context-header">
                    <span>RAG Preview</span>
                    <strong>No chunk retrieved</strong>
                </div>

                <p>No semantic chunk was selected for this manual runtime preview.</p>
            </div>
        );
    }

    return (
        <div className="runtime-rag-context-display active">
            <div className="runtime-rag-context-header">
                <span>RAG Preview</span>
                <strong>
                    Retrieved · {runtimeRagContext.itemCount} chunk
                    {runtimeRagContext.itemCount === 1 ? "" : "s"}
                </strong>
            </div>

            <div className="runtime-rag-context-stats">
                <div>
                    <span>Chars</span>
                    <strong>{runtimeRagContext.totalChars}</strong>
                </div>

                <div>
                    <span>Scores</span>
                    <strong>
                        {runtimeRagContext.scores.length > 0
                            ? runtimeRagContext.scores[0].toFixed(3)
                            : "-"}
                    </strong>
                </div>

                <div>
                    <span>Preview</span>
                    <strong>{runtimeRagContext.previewOnly ? "Only" : "Active"}</strong>
                </div>
            </div>

            <RuntimeRagPillGroup
                label="Types"
                values={runtimeRagContext.usedMemoryTypes}
            />

            <RuntimeRagPillGroup
                label="Scopes"
                values={runtimeRagContext.usedMemoryScopes}
            />

            <div className="runtime-rag-top-results">
                {runtimeRagContext.topResults.slice(0, 3).map((item) => (
                    <article key={item.chunkId}>
                        <div>
                            <strong>
                                @{item.agentName} · {item.memoryType}
                            </strong>
                            <span>{item.score.toFixed(4)}</span>
                        </div>

                        <p>{item.contentPreview}</p>
                    </article>
                ))}
            </div>
        </div>
    );
}