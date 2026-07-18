import type { ManualTaskRuntimeMemoryContext } from "../../types/api";

function uniqueClean(values: string[]) {
    return Array.from(
        new Set(
            values
                .map((value) => value.trim())
                .filter(Boolean)
        )
    );
}

function RuntimeMemoryPillGroup({
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
        <div className="runtime-memory-pill-group">
            <span>{label}</span>

            <div>
                {cleanedValues.map((value) => (
                    <strong key={`${label}-${value}`}>{value}</strong>
                ))}
            </div>
        </div>
    );
}

export function RuntimeMemoryContextDisplay({
    runtimeMemoryContext,
}: {
    runtimeMemoryContext?: ManualTaskRuntimeMemoryContext | null;
}) {
    if (!runtimeMemoryContext) {
        return null;
    }

    if (!runtimeMemoryContext.injected) {
        return (
            <div className="runtime-memory-context-display idle">
                <div className="runtime-memory-context-header">
                    <span>Memory</span>
                    <strong>Not injected</strong>
                </div>

                <p>No eligible runtime memory context was injected for this response.</p>
            </div>
        );
    }

    return (
        <div className="runtime-memory-context-display active">
            <div className="runtime-memory-context-header">
                <span>Memory</span>
                <strong>
                    Injected · {runtimeMemoryContext.itemCount} item
                    {runtimeMemoryContext.itemCount === 1 ? "" : "s"}
                </strong>
            </div>

            <div className="runtime-memory-context-stats">
                <div>
                    <span>Chars</span>
                    <strong>{runtimeMemoryContext.totalChars}</strong>
                </div>

                <div>
                    <span>Sources</span>
                    <strong>{uniqueClean(runtimeMemoryContext.usedMemorySources).length}</strong>
                </div>

                <div>
                    <span>Scopes</span>
                    <strong>{uniqueClean(runtimeMemoryContext.usedMemoryScopes).length}</strong>
                </div>
            </div>

            <RuntimeMemoryPillGroup
                label="Types"
                values={runtimeMemoryContext.usedMemoryTypes}
            />

            <RuntimeMemoryPillGroup
                label="Scopes"
                values={runtimeMemoryContext.usedMemoryScopes}
            />

            <RuntimeMemoryPillGroup
                label="Sources"
                values={runtimeMemoryContext.usedMemorySources}
            />
        </div>
    );
}