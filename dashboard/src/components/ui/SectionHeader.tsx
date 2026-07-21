import type { ReactNode } from "react";

export function SectionHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="ui-section-header">
      <div className="ui-section-header-content">
        {eyebrow && <span className="ui-eyebrow">{eyebrow}</span>}
        <h2 className="ui-section-title">{title}</h2>
        {description && <p className="ui-section-description">{description}</p>}
      </div>

      {actions && <div className="ui-section-actions">{actions}</div>}
    </div>
  );
}