
import { Log } from "logging_middleware";
import dotenv from "dotenv";
import path from "path";


dotenv.config({ path: path.resolve(__dirname, "../.env") });

const BASE_URL = process.env.TEST_SERVER_BASE_URL || "http://4.224.186.213/evaluation-service";
const TOKEN = process.env.ACCESS_TOKEN;


interface Depot {
    ID: number;
    MechanicHours: number;
}

interface VehicleTask {
    TaskID: string;
    Duration: number;
    Impact: number;
}


async function fetchData<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
        headers: {
            "Authorization": `Bearer ${TOKEN}`
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch from ${endpoint}. Status: ${response.status}`);
    }
    return response.json();
}


function scheduleVehicles(budget: number, tasks: VehicleTask[]): { maxImpact: number, selectedTasks: string[] } {
    const n = tasks.length;
    
    
    const dp: number[][] = [];
    for (let i = 0; i <= n; i++) {
        dp[i] = new Array(budget + 1).fill(0);
    }

    
    for (let i = 1; i <= n; i++) {
        const task = tasks[i - 1]!; 
        for (let w = 1; w <= budget; w++) {
            if (task.Duration <= w) {
                dp[i]![w] = Math.max(dp[i - 1]![w]!, dp[i - 1]![w - task.Duration]! + task.Impact);
            } else {
                dp[i]![w] = dp[i - 1]![w]!;
            }
        }
    }

    
    let res = dp[n]![budget]!;
    let w = budget;
    const selectedTasks: string[] = [];

    for (let i = n; i > 0 && res > 0; i--) {
        if (res !== dp[i - 1]![w]!) {
            const task = tasks[i - 1]!;
            selectedTasks.push(task.TaskID);
            res -= task.Impact;
            w -= task.Duration;
        }
    }

    return {
        maxImpact: dp[n]![budget]!,
        selectedTasks
    };
}


async function runScheduler() {
    await Log("backend", "info", "service", "Starting Vehicle Maintenance Scheduler");

    try {
        const depotsData = await fetchData<{ depots: Depot[] }>("/depots");
        const vehiclesData = await fetchData<{ vehicles: VehicleTask[] }>("/vehicles");

        const depots = depotsData.depots;
        const tasks = vehiclesData.vehicles;

        console.log("VEHICLE MAINTENANCE SCHEDULE RESULTS");

        for (const depot of depots) {
            const result = scheduleVehicles(depot.MechanicHours, tasks);
            
            console.log(`Depot ID: ${depot.ID} (Budget: ${depot.MechanicHours} hours)`);
            console.log(`Max Impact Achieved: ${result.maxImpact}`);
            console.log(`Vehicles Serviced (${result.selectedTasks.length}):`);
            console.log(result.selectedTasks.join(", "));

            await Log("backend", "info", "domain", `Depot ${depot.ID} scheduled with max impact ${result.maxImpact}`);
        }

        await Log("backend", "info", "service", "Scheduler run completed successfully");

    } catch (error: any) {
        await Log("backend", "fatal", "handler", `Scheduler failed: ${error.message}`);
        console.error("Application Error:", error);
    }
}

runScheduler();