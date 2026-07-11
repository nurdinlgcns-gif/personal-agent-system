
import type { AgentSnapshot, SkillSnapshot, TaskSnapshot } from "../types/api";

import { OfficeCanvas } from "../components/office/OfficeCanvas";



type OfficeViewProps = {

  agents: AgentSnapshot[];

  agentStatuses: Record<string, string>;

  recentTasks: TaskSnapshot[];

  skills: SkillSnapshot[];

  isProcessing: boolean;

};



export function OfficeView({

  agents,

  agentStatuses,

  recentTasks,

  skills,

  isProcessing,

}: OfficeViewProps) {

  return (

    <section className="office-view office-view-compact">

      <OfficeCanvas

        agents={agents}

        agentStatuses={agentStatuses}

        recentTasks={recentTasks}

        skills={skills}

        isProcessing={isProcessing}

      />

    </section>

  );

}