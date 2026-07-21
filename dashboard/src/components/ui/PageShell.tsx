import type { ReactNode } from "react";

export function PageShell({
  children,
  full = false,
  className = "",
}: {
  children: ReactNode;
  full?: boolean;
  className?: string;
}) {
  return (
    <section className={`ui-page-shell ${full ? "full" : ""} ${className}`}>
      {children}
    </section>
  );
}