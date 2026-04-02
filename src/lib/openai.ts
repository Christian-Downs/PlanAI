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
    // Clean the response to handle markdown code blocks
    let jsonText = result.text.trim();

    // Remove markdown code blocks if present
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.replace(/```json\n?/, "").replace(/\n?```$/, "");
    } else if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/```\n?/, "").replace(/\n?```$/, "");
    }

    return JSON.parse(jsonText);
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
  console.log("Generating optimal schedule with OpenAI...");
  console.log("Tasks:", params.tasks.length);
  console.log("Existing events:", params.existingEvents.length);
  console.log("Preferences:", params.preferences);

  try {
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

IMPORTANT: Respond ONLY with valid JSON, no markdown formatting, no code blocks, no explanations. Just pure JSON:
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

    console.log("OpenAI response received, parsing...");
    console.log("Raw response:", result.text);

    // Clean the response to handle markdown code blocks
    let jsonText = result.text.trim();

    // Remove markdown code blocks if present
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.replace(/```json\n?/, "").replace(/\n?```$/, "");
    } else if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/```\n?/, "").replace(/\n?```$/, "");
    }

    console.log("Cleaned JSON text:", jsonText);

    const parsedResult = JSON.parse(jsonText);
    console.log("Schedule generated successfully:", parsedResult.blocks?.length || 0, "blocks");

    return parsedResult;
  } catch (error) {
    console.error("Error generating optimal schedule:", error);
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
  console.log("Creating OpenAI chat stream with", params.messages.length, "messages");

  try {
    const result = streamText({
      model,
      system: `You are PlanAI, an intelligent scheduling assistant. You help ${params.userContext.name} (a ${params.userContext.role}) manage their calendar and academic/work schedule.

You can:
1. **Schedule Planning** - Create optimal study/work schedules
2. **Schedule Adjustments** - Modify existing AI-generated schedule blocks
3. **Task Analysis** - Estimate complexity and time for assignments
4. **Calendar Management** - View, create, and modify events
5. **Smart Suggestions** - Provide personalized scheduling advice
6. **Preference Tuning** - Customize how schedules are organized

Current context:
- Timezone: ${params.userContext.timezone}
- Upcoming events: ${params.userContext.upcomingEvents}
- Pending tasks: ${params.userContext.pendingTasks}

**SCHEDULE COMMANDS**:
When the user wants to adjust their AI-generated schedule, look for requests like:
- "Move my morning study block to afternoon"
- "Make my break longer"
- "Schedule more time for math homework"
- "Change my study time from 9am to 10am"
- "Remove the break at 2pm"
- "Add a 30-minute break after lunch"

For schedule adjustments, include this action format in your response:
[SCHEDULE_ACTION: type=<action>, data=<json>]

Schedule action types:
- "regenerate" - Create a new complete schedule
- "adjust_time" - Move/resize existing blocks
- "add_block" - Add new study/break blocks
- "remove_block" - Remove specific blocks
- "modify_preferences" - Update study preferences

Example schedule actions:
[SCHEDULE_ACTION: type="adjust_time", data={"blockTitle": "Math Study", "newStartTime": "10:00", "newEndTime": "11:30"}]
[SCHEDULE_ACTION: type="add_block", data={"title": "Chemistry Review", "type": "STUDY", "startTime": "14:00", "duration": 90}]

For other actions, use:
[ACTION: type=<action_type>, data=<json>]
Action types: create_event, modify_event, delete_event, create_schedule, modify_preferences

Be conversational, helpful, and proactive. If you notice scheduling conflicts or opportunities for optimization, mention them. When handling schedule adjustments, confirm what you understood and explain the changes you're making.`,
      messages: params.messages,
    });

    console.log("OpenAI streamText created successfully");
    return result;
  } catch (error) {
    console.error("Error creating OpenAI stream:", error);
    throw error;
  }
}

// ---- Event Classification ----

export async function classifyEvent(event: {
  title: string;
  description?: string;
  source: string;
}) {
  // Skip AI classification if no OpenAI API key is configured
  if (!process.env.OPENAI_API_KEY) {
    return getDefaultClassification(event.title);
  }

  try {
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

    // Clean the response to handle markdown code blocks
    let jsonText = result.text.trim();

    // Remove markdown code blocks if present
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.replace(/```json\n?/, "").replace(/\n?```$/, "");
    } else if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/```\n?/, "").replace(/\n?```$/, "");
    }

    return JSON.parse(jsonText);
  } catch {
    return getDefaultClassification(event.title);
  }
}

// Helper function for basic event classification without AI
function getDefaultClassification(title: string) {
  const lowerTitle = title.toLowerCase();

  // Basic keyword-based classification
  if (lowerTitle.includes("exam") || lowerTitle.includes("test") || lowerTitle.includes("quiz")) {
    return { eventType: "EXAM", priority: "HIGH", isTask: true, courseName: null };
  }
  if (lowerTitle.includes("assignment") || lowerTitle.includes("homework") || lowerTitle.includes("due")) {
    return { eventType: "ASSIGNMENT", priority: "MEDIUM", isTask: true, courseName: null };
  }
  if (lowerTitle.includes("class") || lowerTitle.includes("lecture") || lowerTitle.includes("seminar")) {
    return { eventType: "CLASS", priority: "MEDIUM", isTask: false, courseName: null };
  }
  if (lowerTitle.includes("meeting") || lowerTitle.includes("call") || lowerTitle.includes("1:1")) {
    return { eventType: "MEETING", priority: "MEDIUM", isTask: false, courseName: null };
  }
  if (lowerTitle.includes("office hour")) {
    return { eventType: "OFFICE_HOURS", priority: "LOW", isTask: false, courseName: null };
  }
  if (lowerTitle.includes("study") || lowerTitle.includes("review")) {
    return { eventType: "STUDY_SESSION", priority: "MEDIUM", isTask: false, courseName: null };
  }

  return { eventType: "OTHER", priority: "MEDIUM", isTask: false, courseName: null };
}
