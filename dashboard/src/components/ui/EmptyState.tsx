export function EmptyState({
    title,
    description,
  }: {
    title: string;
    description?: string;
  }) {
    return (
      <div className="ui-empty-state">
        <strong>{title}</strong>
        {description && <p>{description}</p>}
      </div>
    );
  }