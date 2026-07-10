type MetricCardProps = {
    title: string;
    value: string | number;
    subtitle: string;
    tone: "blue" | "orange" | "green" | "red" | "cyan";
  };
  
  export function MetricCard({ title, value, subtitle, tone }: MetricCardProps) {
    return (
      <div className={`metric-card metric-${tone}`}>
        <div className="metric-icon">▧</div>
  
        <div>
          <p>{title}</p>
          <strong>{value}</strong>
          <small>{subtitle}</small>
        </div>
  
        <div className="mini-sparkline">⌁⌁⌁</div>
      </div>
    );
  }