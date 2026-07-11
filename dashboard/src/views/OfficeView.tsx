
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

    <section className="office-view">

      <div className="office-hero">

        <div>

          <h1>Agent Office Visual Workspace</h1>

          <p>

            Isometric 2D workspace for visualizing AI agent activity, task flow,

            skills, and output.

          </p>

        </div>



        <div className={`office-live-badge ${isProcessing ? "working" : "idle"}`}>

          <span />

          {isProcessing ? "Agent activity running" : "Office standing by"}

        </div>

      </div>



      <OfficeCanvas

        agents={agents}

        agentStatuses={agentStatuses}

        recentTasks={recentTasks}

        skills={skills}

      />

    </section>

  );

}

``