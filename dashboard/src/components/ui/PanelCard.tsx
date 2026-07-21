import type { ReactNode } from "react";

export type PanelAccent = "blue" | "green" | "purple" | "pink" | "yellow";

export function PanelCard({
  children,
  accent = "blue",
  compact = false,
  className = "",
}: {
  children: ReactNode;
  accent?: PanelAccent;
  compact?: boolean;
  className?: string;
}) {
  return (
    <section
      className={`ui-panel-card ${accent} ${compact ? "compact" : ""} ${className}`}
    >
      {children}
    </section>
  );
}