import prisma from "./prisma";
import { EventType } from "@prisma/client";
import { analyzeTaskComplexity, generateOptimalSchedule } from "./openai";
import { addDays, format } from "date-fns";

// ---- Analyze All Pending Tasks ----

export async function analyzeUserTasks(userId: string) {
  const tasks = await prisma.task.findMany({
    where: {
      userId,
      status: { in: ["TODO", "IN_PROGRESS"] },
      dueDate: { gte: new Date() },
    },
    include: { event: true },
    orderBy: { dueDate: "asc" },
  });

  const analyses = [];

  for (const task of tasks) {
    // Skip if already analyzed recently (within 24h)
    if (
      task.complexityReason &&
      task.updatedAt > new Date(Date.now() - 24 * 60 * 60 * 1000)
    ) {
      analyses.push({
        taskId: task.id,
        score: task.complexityScore,
        estimatedMinutes: task.estimatedMinutes,
        reasoning: task.complexityReason,
        cached: true,
      });
      continue;
    }

    const analysis = await analyzeTaskComplexity({
      title: task.title,
      description: task.description || undefined,
      courseName: task.courseName || undefined,
      dueDate: task.dueDate,
      eventType: task.event.eventType,
    });

    // Update task with analysis
    await prisma.task.update({
      where: { id: task.id },
      data: {
        complexityScore: analysis.score,
        estimatedMinutes: analysis.estimatedMinutes,
        complexityReason: analysis.reasoning,
      },
    });

    analyses.push({
      taskId: task.id,
      ...analysis,
      cached: false,
    });
  }

  return analyses;
}

// ---- Generate Schedule for User ----

export async function generateUserSchedule(
  userId: string,
  days: number = 7
) {
  console.log("Generating schedule for user:", userId);

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) throw new Error("User not found");

  console.log("User found:", user.email, "preferences:", {
    studyHoursPerDay: user.studyHoursPerDay,
    preferredStudyStart: user.preferredStudyStart,
    preferredStudyEnd: user.preferredStudyEnd,
    breakDuration: user.breakDuration,
    timezone: user.timezone,
  });

  // Get pending tasks
  const tasks = await prisma.task.findMany({
    where: {
      userId,
      status: { in: ["TODO", "IN_PROGRESS"] },
      dueDate: { gte: new Date() },
    },
    orderBy: { dueDate: "asc" },
  });

  console.log("Found", tasks.length, "pending tasks");

  // Get existing events for the period
  const startDate = new Date();
  const endDate = addDays(startDate, days);

  const existingEvents = await prisma.calendarEvent.findMany({
    where: {
      userId,
      startTime: { gte: startDate },
      endTime: { lte: endDate },
    },
    orderBy: { startTime: "asc" },
  });

  console.log("Found", existingEvents.length, "existing events");

  // Use defaults if user preferences aren't set
  const preferences = {
    studyHoursPerDay: user.studyHoursPerDay || 6,
    preferredStudyStart: user.preferredStudyStart || "9:00",
    preferredStudyEnd: user.preferredStudyEnd || "17:00",
    breakDuration: user.breakDuration || 15,
    timezone: user.timezone || "America/New_York",
  };

  console.log("Using preferences:", preferences);

  // Generate schedule using LLM
  const schedule = await generateOptimalSchedule({
    tasks: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      dueDate: t.dueDate.toISOString(),
      estimatedMinutes: t.estimatedMinutes,
      complexityScore: t.complexityScore,
      priority: "MEDIUM",
      status: t.status,
    })),
    existingEvents: existingEvents.map((e) => ({
      title: e.title,
      startTime: e.startTime.toISOString(),
      endTime: e.endTime.toISOString(),
    })),
    preferences,
    startDate: format(startDate, "yyyy-MM-dd"),
    endDate: format(endDate, "yyyy-MM-dd"),
  });

  console.log("Schedule generation completed");
  return schedule;
}

// ---- Apply Schedule Blocks ----

export async function applyScheduleBlocks(
  userId: string,
  blocks: Array<{
    title: string;
    type: string;
    startTime: string;
    endTime: string;
    taskId?: string;
    reasoning?: string;
  }>
) {
  console.log("Applying", blocks.length, "schedule blocks as calendar events");
  const created = [];

  // First, ensure we have an AI Schedule source
  let aiSource;
  try {
    aiSource = await prisma.calendarSource.findFirst({
      where: {
        userId: userId,
        name: "AI Schedule"
      }
    });

    if (!aiSource) {
      aiSource = await prisma.calendarSource.create({
        data: {
          userId: userId,
          name: "AI Schedule",
          type: "MANUAL", // Use MANUAL type for AI-generated content
          color: "#3b82f6",
          enabled: true,
        }
      });
    }
  } catch (error) {
    console.error("Error creating AI source:", error);
    // Fallback - create with timestamp ID
    aiSource = await prisma.calendarSource.create({
      data: {
        userId: userId,
        name: `AI Schedule ${Date.now()}`,
        type: "MANUAL",
        color: "#3b82f6",
        enabled: true,
      }
    });
  }

  for (const block of blocks) {
    // Create as actual calendar events so they show up in the calendar
    const calendarEvent = await prisma.calendarEvent.create({
      data: {
        userId,
        sourceId: aiSource.id,
        title: block.title,
        description: block.reasoning ? `AI Suggestion: ${block.reasoning}` : "AI-generated schedule block",
        startTime: new Date(block.startTime),
        endTime: new Date(block.endTime),
        allDay: false,
        eventType: mapBlockTypeToEventType(block.type),
        priority: "MEDIUM",
        color: getBlockTypeColor(block.type),
      },
    });

    // Also create a schedule block for tracking
    const scheduleBlock = await prisma.scheduleBlock.create({
      data: {
        userId,
        taskId: block.taskId || null,
        title: block.title,
        type: block.type as any,
        startTime: new Date(block.startTime),
        endTime: new Date(block.endTime),
      },
    });

    created.push({ calendarEvent, scheduleBlock });
  }

  console.log("Created", created.length, "calendar events from AI schedule");
  return created;
}

// Helper functions for calendar event creation
function getBlockTypeColor(type: string): string {
  const colors: Record<string, string> = {
    STUDY: "#3b82f6", // Blue
    HOMEWORK: "#8b5cf6", // Purple
    EXAM_PREP: "#ef4444", // Red
    BREAK: "#22c55e", // Green
    BUFFER: "#6b7280", // Gray
  };
  return colors[type] || "#6b7280";
}

function mapBlockTypeToEventType(type: string): EventType {
  const mapping: Record<string, EventType> = {
    STUDY: EventType.STUDY_SESSION,
    HOMEWORK: EventType.ASSIGNMENT,
    EXAM_PREP: EventType.EXAM,
    BREAK: EventType.BREAK,
    BUFFER: EventType.OTHER,
  };
  return mapping[type] || EventType.OTHER;
}
