export function StatusBadge({
    children,
    tone = "blue",
  }: {
    children: React.ReactNode;
    tone?: "blue" | "green" | "yellow" | "red" | "purple";
  }) {
    return <span className={`ui-badge ${tone}`}>{children}</span>;
  }