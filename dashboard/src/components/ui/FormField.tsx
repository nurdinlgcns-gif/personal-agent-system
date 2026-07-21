import type { ReactNode } from "react";

export function FormField({
  label,
  children,
  wide = false,
}: {
  label: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <label className={`ui-field ${wide ? "wide" : ""}`}>
      <span className="ui-field-label">{label}</span>
      {children}
    </label>
  );
}

export function FilterGrid({ children }: { children: ReactNode }) {
  return <div className="ui-filter-grid">{children}</div>;
}