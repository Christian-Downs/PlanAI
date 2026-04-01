import { openai } from "@ai-sdk/openai";
import { generateText, streamText } from "ai";

const model = openai("gpt-4o");
const fastModel = openai("gpt-4o-mini");

// ---- Task Complexity Analysis ----

export async function analyzeTaskComplexity(task: {
  title: string;
  description?: string;
  courseName?: string;
  dueDate: Date;
  eventType: string;
}) {
  const now = new Date();
  const daysUntilDue = Math.max(
    0,
    Math.ceil((task.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  );

  const result = await generateText({
    model: fastModel,
    system: `You are an academic task complexity analyzer. Given a task, estimate its complexity and time requirements. 
Respond ONLY with valid JSON in this exact format:
{
  "score": <number 0-1>,
  "estimatedMinutes": <number>,
  "reasoning": "<brief explanation>",
  "factors": [{"name": "<factor>", "weight": <0-1>, "description": "<why>"}],
  "suggestedApproach": "<how to tackle this>"
}`,
    prompt: `Analyze this academic task:
Title: ${task.title}
${task.description ? `Description: ${task.description}` : ""}
${task.courseName ? `Course: ${task.courseName}` : ""}
Type: ${task.eventType}
Due: ${task.dueDate.toISOString()} (${daysUntilDue} days from now)

Consider:
- Type of work (essay, problem set, reading, coding, exam prep, etc.)
- Typical time requirements for this kind of task
- Urgency based on due date
- Course type implications`,
  });

  try {
    return JSON.parse(result.text);
  } catch {
    return {
      score: 0.5,
      estimatedMinutes: 60,
      reasoning: "Could not analyze - using defaults",
      factors: [],
      suggestedApproach: "Break the task into smaller parts and start early.",
    };
  }
}

// ---- Schedule Optimization ----

export async function generateOptimalSchedule(params: {
  tasks: Array<{
    id: string;
    title: string;
    dueDate: string;
    estimatedMinutes: number;
    complexityScore: number;
    priority: string;
    status: string;
  }>;
  existingEvents: Array<{
    title: string;
    startTime: string;
    endTime: string;
  }>;
  preferences: {
    studyHoursPerDay: number;
    preferredStudyStart: string;
    preferredStudyEnd: string;
    breakDuration: number;
    timezone: string;
  };
  startDate: string;
  endDate: string;
}) {
  const result = await generateText({
    model,
    system: `You are an intelligent schedule optimizer for students. Create an optimal study/work schedule.
Rules:
- Never overlap with existing events
- Respect preferred study hours
- Include breaks (${params.preferences.breakDuration} min every 90 min of work)
- Prioritize by urgency (due date) and priority level
- Distribute complex tasks over multiple sessions
- Max ${params.preferences.studyHoursPerDay} hours of study per day
- Study window: ${params.preferences.preferredStudyStart} to ${params.preferences.preferredStudyEnd}

Respond ONLY with valid JSON:
{
  "blocks": [
    {
      "title": "<task title or break>",
      "type": "STUDY|HOMEWORK|EXAM_PREP|BREAK|BUFFER",
      "startTime": "<ISO datetime>",
      "endTime": "<ISO datetime>",
      "taskId": "<task id or null>",
      "reasoning": "<why this slot>"
    }
  ],
  "reasoning": "<overall strategy explanation>",
  "totalStudyMinutes": <number>,
  "totalBreakMinutes": <number>
}`,
    prompt: `Create an optimal schedule from ${params.startDate} to ${params.endDate}.

TASKS TO SCHEDULE:
${JSON.stringify(params.tasks, null, 2)}

EXISTING CALENDAR EVENTS (do not overlap):
${JSON.stringify(params.existingEvents, null, 2)}

Timezone: ${params.preferences.timezone}`,
  });

  try {
    return JSON.parse(result.text);
  } catch {
    return {
      blocks: [],
      reasoning: "Could not generate schedule. Please try again.",
      totalStudyMinutes: 0,
      totalBreakMinutes: 0,
    };
  }
}

// ---- Scraping Config Generation ----

export async function generateScrapeConfig(params: {
  platform: string;
  baseUrl: string;
  goal: string;
}) {
  const result = await generateText({
    model,
    system: `You are a web scraping expert. Generate step-by-step scraping instructions for extracting calendar/assignment data from learning management systems.

Respond ONLY with valid JSON:
{
  "steps": [
    {
      "action": "navigate|click|type|extract|wait|scroll",
      "selector": "<CSS selector if applicable>",
      "value": "<value to type if applicable>",
      "url": "<URL if navigate>",
      "description": "<human readable description>",
      "extractAs": "<field name if extracting>"
    }
  ],
  "outputMapping": {
    "<extracted field>": "<calendar event field>"
  }
}`,
    prompt: `Generate scraping instructions for:
Platform: ${params.platform}
Base URL: ${params.baseUrl}
Goal: ${params.goal}

The scraping should extract calendar events, assignments, and deadlines.
Map the extracted data to: title, description, startTime, endTime, eventType, courseName`,
  });

  try {
    const config = JSON.parse(result.text);
    config.generatedBy = "gpt-4o";
    config.generatedAt = new Date().toISOString();
    return config;
  } catch {
    return null;
  }
}

// ---- Chat Stream ----

export function createChatStream(params: {
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  userContext: {
    name: string;
    role: string;
    timezone: string;
    upcomingEvents: string;
    pendingTasks: string;
  };
}) {
  return streamText({
    model,
    system: `You are CalendarCondensor AI, an intelligent scheduling assistant. You help ${params.userContext.name} (a ${params.userContext.role}) manage their calendar and academic/work schedule.

You can:
1. Answer questions about their schedule
2. Suggest schedule optimizations
3. Help plan study sessions
4. Estimate task complexity
5. Create, modify, or remove events
6. Adjust preferences

Current context:
- Timezone: ${params.userContext.timezone}
- Upcoming events: ${params.userContext.upcomingEvents}
- Pending tasks: ${params.userContext.pendingTasks}

When you want to take an action, include it in your response as:
[ACTION: type=<action_type>, data=<json>]

Action types: create_event, modify_event, delete_event, create_schedule, modify_preferences

Be conversational, helpful, and proactive. If you notice scheduling conflicts or opportunities for optimization, mention them.`,
    messages: params.messages,
  });
}

// ---- Event Classification ----

export async function classifyEvent(event: {
  title: string;
  description?: string;
  source: string;
}) {
  const result = await generateText({
    model: fastModel,
    system: `Classify a calendar event. Respond with ONLY valid JSON:
{
  "eventType": "CLASS|ASSIGNMENT|EXAM|MEETING|OFFICE_HOURS|STUDY_SESSION|BREAK|PERSONAL|OTHER",
  "priority": "LOW|MEDIUM|HIGH|URGENT",
  "isTask": true/false,
  "courseName": "<course name if academic, null otherwise>"
}`,
    prompt: `Classify this event:
Title: ${event.title}
${event.description ? `Description: ${event.description}` : ""}
Source: ${event.source}`,
  });

  try {
    return JSON.parse(result.text);
  } catch {
    return {
      eventType: "OTHER",
      priority: "MEDIUM",
      isTask: false,
      courseName: null,
    };
  }
}
