
import { Log } from "logging_middleware";
import dotenv from "dotenv";
import path from "path";


dotenv.config({ path: path.resolve(__dirname, "../.env") });

const BASE_URL = process.env.TEST_SERVER_BASE_URL || "http://4.224.186.213/evaluation-service";
const TOKEN = process.env.ACCESS_TOKEN;


interface APIResponse {
    notifications: Notification[];
}

interface Notification {
    ID: string;
    Type: "Placement" | "Result" | "Event";
    Message: string;
    Timestamp: string;
}

interface RankedNotification extends Notification {
    Weight: number;
    TimeValue: number;
}


function getWeight(type: string): number {
    switch (type) {
        case "Placement": return 3;
        case "Result": return 2;
        case "Event": return 1;
        default: return 0;
    }
}


async function fetchNotifications(): Promise<Notification[]> {
    const response = await fetch(`${BASE_URL}/notifications`, {
        headers: { "Authorization": `Bearer ${TOKEN}` }
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch notifications. Status: ${response.status}`);
    }
    const data: APIResponse = await response.json();
    return data.notifications;
}


async function generatePriorityInbox() {
    await Log("backend", "info", "service", "Starting Priority Inbox Generation");

    try {
        await Log("backend", "debug", "service", "Fetching notifications from test server");
        const rawNotifications = await fetchNotifications();
        
        await Log("backend", "info", "handler", `Successfully fetched ${rawNotifications.length} notifications`);

        
        const ranked: RankedNotification[] = rawNotifications.map(n => ({
            ...n,
            Weight: getWeight(n.Type),
            
            TimeValue: new Date(n.Timestamp.replace(" ", "T")).getTime() 
        }));

        
        ranked.sort((a, b) => {
            if (b.Weight !== a.Weight) {
                return b.Weight - a.Weight; 
            }
            return b.TimeValue - a.TimeValue; 
        });

        
        const top10 = ranked.slice(0, 10);
        await Log("backend", "info", "domain", "Successfully calculated top 10 priority notifications");

        
        console.log("PRIORITY INBOX");
        
        top10.forEach((notif, index) => {
            const rank = (index + 1).toString().padStart(2, '0');
            console.log(`[${rank}] TYPE: ${notif.Type.padEnd(10)} | TIME: ${notif.Timestamp}`);
            console.log(`     MSG:  ${notif.Message}`);
            console.log(`     ID:   ${notif.ID}`);
        
        });

        await Log("backend", "info", "service", "Priority Inbox generated successfully");

    } catch (error: any) {
        await Log("backend", "fatal", "handler", `Priority Inbox failed: ${error.message}`);
        console.error("Application Error:", error);
    }
}


generatePriorityInbox();