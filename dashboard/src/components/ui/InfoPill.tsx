export type InfoPillTone = "blue" | "green" | "yellow" | "red" | "purple";

export function InfoPill({
  children,
  tone = "blue",
}: {
  children: React.ReactNode;
  tone?: InfoPillTone;
}) {
  return <span className={`ui-pill ${tone}`}>{children}</span>;
}

export function PillRow({ children }: { children: React.ReactNode }) {
  return <div className="ui-pill-row">{children}</div>;
}