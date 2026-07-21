export function ErrorState({
    title = "Something went wrong",
    message,
  }: {
    title?: string;
    message: string;
  }) {
    return (
      <div className="ui-error-state">
        <strong>{title}</strong>
        <p>{message}</p>
      </div>
    );
  }