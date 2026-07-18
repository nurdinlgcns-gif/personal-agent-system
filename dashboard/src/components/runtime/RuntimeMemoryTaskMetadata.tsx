import type { TaskSnapshot } from "../../types/api";

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

function uniqueClean(values: string[]) {
    return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function MemoryPills({
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
        <div className="runtime-memory-task-pill-group">
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

export function RuntimeMemoryTaskMetadata({
    task,
    compact = false,
}: {
    task: TaskSnapshot;
    compact?: boolean;
}) {
    const memoryTypes = parseJsonArray(task.runtimeMemoryTypesJson);
    const memoryScopes = parseJsonArray(task.runtimeMemoryScopesJson);
    const memorySources = parseJsonArray(task.runtimeMemorySourcesJson);

    const hasMemoryMetadata =
        typeof task.runtimeMemoryInjected === "boolean" ||
        typeof task.runtimeMemoryItemCount === "number" ||
        memoryTypes.length > 0 ||
        memoryScopes.length > 0 ||
        memorySources.length > 0;

    if (!hasMemoryMetadata) {
        return null;
    }

    if (!task.runtimeMemoryInjected) {
        return (
            <div className="runtime-memory-task-card idle">
                <div className="runtime-memory-task-header">
                    <span>Memory</span>
                    <strong>Not injected</strong>
                </div>
            </div>
        );
    }

    return (
        <div className={`runtime-memory-task-card active ${compact ? "compact" : ""}`}>
            <div className="runtime-memory-task-header">
                <span>Memory</span>
                <strong>
                    Injected · {task.runtimeMemoryItemCount ?? 0} item
                    {(task.runtimeMemoryItemCount ?? 0) === 1 ? "" : "s"}
                </strong>
            </div>

            {!compact && (
                <div className="runtime-memory-task-stats">
                    <div>
                        <span>Chars</span>
                        <strong>{task.runtimeMemoryTotalChars ?? 0}</strong>
                    </div>

                    <div>
                        <span>Types</span>
                        <strong>{uniqueClean(memoryTypes).length}</strong>
                    </div>

                    <div>
                        <span>Scopes</span>
                        <strong>{uniqueClean(memoryScopes).length}</strong>
                    </div>
                </div>
            )}

            <MemoryPills label="Types" values={memoryTypes} />
            <MemoryPills label="Scopes" values={memoryScopes} />

            {!compact && <MemoryPills label="Sources" values={memorySources} />}
        </div>
    );
}