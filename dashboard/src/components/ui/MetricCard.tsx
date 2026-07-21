export function MetricCard({
    label,
    value,
  }: {
    label: string;
    value: string | number;
  }) {
    return (
      <div className="ui-metric-card">
        <span className="ui-metric-card-label">{label}</span>
        <strong className="ui-metric-card-value">{value}</strong>
      </div>
    );
  }
  
  export function MetricGrid({ children }: { children: React.ReactNode }) {
    return <div className="ui-metric-grid">{children}</div>;
  }