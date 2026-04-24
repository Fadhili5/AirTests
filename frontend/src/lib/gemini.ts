import type { AlertItem, InterventionTask, UldExposure } from "../types";

type GeminiContext = {
  prompt: string;
  tasks: InterventionTask[];
  alerts: AlertItem[];
  ulds: UldExposure[];
};

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

export async function requestGeminiInterventionAssist(context: GeminiContext) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const systemPrompt = buildSystemPrompt(context);

  if (!apiKey) {
    return buildFallbackResponse(context);
  }

  const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: systemPrompt }],
        },
      ],
      generationConfig: {
        temperature: 0.4,
        topP: 0.9,
        maxOutputTokens: 500,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini request failed with ${response.status}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts
    ?.map((part: { text?: string }) => part.text || "")
    .join("")
    .trim();

  return text || buildFallbackResponse(context);
}

function buildSystemPrompt({ prompt, tasks, alerts, ulds }: GeminiContext) {
  const urgentTasks = tasks.slice(0, 5).map((task) => `- ${task.uldId}: ${task.action} (${task.priority}, ${task.status})`).join("\n");
  const activeAlerts = alerts.slice(0, 5).map((alert) => `- ${alert.uldId}: ${alert.title} (${alert.level})`).join("\n");
  const hotUlds = ulds
    .filter((uld) => uld.risk === "HIGH" || uld.status === "Intervention")
    .slice(0, 5)
    .map((uld) => `- ${uld.id}: ${uld.airport}, ${uld.phase}, temp ${uld.currentTemp}C, risk ${uld.risk}`)
    .join("\n");

  return `You are Gemini acting as an air-cargo interventions copilot for AeroSentinel.
Provide a concise operational answer with:
1. Immediate action
2. Risk reasoning
3. Next verification step

User request:
${prompt}

Active tasks:
${urgentTasks || "- None"}

Active alerts:
${activeAlerts || "- None"}

High-risk ULD context:
${hotUlds || "- None"}`;
}

function buildFallbackResponse({ prompt, tasks, alerts, ulds }: GeminiContext) {
  const nextTask = tasks.find((task) => task.status !== "Completed");
  const hottestUld = [...ulds].sort((a, b) => b.riskScore - a.riskScore)[0];
  const topAlert = alerts[0];

  return [
    `Gemini fallback plan for: ${prompt}`,
    nextTask ? `Immediate action: execute "${nextTask.action}" for ${nextTask.uldId} with ${nextTask.role} ownership.` : "Immediate action: no pending task is blocking; maintain live monitoring.",
    hottestUld ? `Risk reasoning: ${hottestUld.id} remains the hottest unit at ${hottestUld.currentTemp}C in ${hottestUld.phase} with ${Math.round(hottestUld.riskScore * 100)}% risk score.` : "Risk reasoning: no high-risk ULD is currently dominating the queue.",
    topAlert ? `Next verification: confirm recovery against alert "${topAlert.title}" and recheck telemetry within 5 minutes.` : "Next verification: validate the latest telemetry and task completion state in the next refresh cycle.",
  ].join("\n");
}
