

export type LogStack = "backend" | "frontend";
export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";
export type LogPackage = 
  | "cache" | "controller" | "cron_job" | "db" | "domain" | "handler" | "repository" | "route" | "service" 
  | "api" | "component" | "hook" | "page" | "state" | "style" 
  | "auth" | "config" | "middleware" | "utils"; 


export const Log = async (
  stack: LogStack,
  level: LogLevel,
  pkgName: LogPackage, 
  message: string
): Promise<void> => {
  try {
    
    const token = process.env.ACCESS_TOKEN; 
    const baseUrl = process.env.TEST_SERVER_BASE_URL || "http://4.224.186.213/evaluation-service";

    if (!token) {
      
      process.stderr.write("Log Middleware Error: ACCESS_TOKEN is missing.\n");
      return;
    }

    const response = await fetch(`${baseUrl}/logs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        stack,
        level,
        package: pkgName, 
        message
      })
    });

    if (!response.ok) {
      process.stderr.write(`Log API Failed. Status: ${response.status}\n`);
    }
  } catch (error) {
    process.stderr.write(`Log Middleware Fetch Error: ${error}\n`);
  }
};