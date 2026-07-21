import type { ReactNode } from "react";

export function PageHero({
  eyebrow,
  title,
  description,
  actions,
  badges,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  badges?: ReactNode;
}) {
  return (
    <header className="ui-page-hero">
      <div className="ui-page-hero-content">
        <span className="ui-eyebrow">{eyebrow}</span>
        <h1 className="ui-page-title">{title}</h1>

        {description && <p className="ui-page-description">{description}</p>}

        {badges && <div className="ui-pill-row">{badges}</div>}
      </div>

      {actions && <div className="ui-page-hero-actions">{actions}</div>}
    </header>
  );
}