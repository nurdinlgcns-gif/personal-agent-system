import { MetricCard } from "./MetricCard";

type MetricsGridProps = {
    agentCount: number;
    runningTaskCount: number;
    completedTaskCount: number;
    errorTaskCount: number;
    whatsappTaskCount: number;
  };
  
  export function MetricsGrid({
    agentCount,
    runningTaskCount,
    completedTaskCount,
    errorTaskCount,
    whatsappTaskCount,
  }: MetricsGridProps) {
    return (
      <section className="metrics-grid">
        <MetricCard
          title="Active Agents"
          value={agentCount}
          subtitle="Registered agents"
          tone="blue"
        />
  
        <MetricCard
          title="Running Tasks"
          value={runningTaskCount}
          subtitle="In progress"
          tone="orange"
        />
  
        <MetricCard

          title="Completed Tasks"
          value={completedTaskCount}
          subtitle="Realtime session"
          tone="green"
        />
  
        <MetricCard
          title="Error Tasks"
          value={errorTaskCount}
          subtitle="Need attention"
          tone="red"
        />
  
        <MetricCard
          title="WhatsApp Requests"
          value={whatsappTaskCount}
          subtitle="From WA source"
          tone="cyan"
        />
      </section>
    );
  }
  