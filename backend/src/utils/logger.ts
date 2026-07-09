export const logger = {
    server(message: string) {
      console.log(`[SERVER] ${message}`);
    },
  
    wa(message: string) {
      console.log(`[WA] ${message}`);
    },
  
    task(message: string) {
      console.log(`[TASK] ${message}`);
    },
  
    agent(message: string) {
      console.log(`[AGENT] ${message}`);
    },
  
    skill(message: string) {
      console.log(`[SKILL] ${message}`);
    },
  
    security(message: string) {
      console.log(`[SECURITY] ${message}`);
    },
  
    error(message: string, error?: unknown) {
      console.error(`[ERROR] ${message}`);
  
      if (error) {
        console.error(error);
      }
    },
  };