import type {
    AgentsStatusResponse,
    RecentTasksResponse,
  } from "../types/api";
  
  const API_BASE_URL = "http://localhost:3000";
  
  export async function fetchAgentsStatus() {
    const response = await fetch(`${API_BASE_URL}/agents/status`);
  
    if (!response.ok) {
      throw new Error("Failed to fetch agents status");
    }
  
    const data: AgentsStatusResponse = await response.json();
    return data.agents;
  }
  
  export async function fetchRecentTasks(limit = 10) {
    const response = await fetch(`${API_BASE_URL}/tasks/recent?limit=${limit}`);
  
    if (!response.ok) {
      throw new Error("Failed to fetch recent tasks");
    }
  
    const data: RecentTasksResponse = await response.json();
    return data.tasks;
  }