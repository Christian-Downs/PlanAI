import prisma from "./prisma";
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
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) throw new Error("User not found");

  // Get pending tasks
  const tasks = await prisma.task.findMany({
    where: {
      userId,
      status: { in: ["TODO", "IN_PROGRESS"] },
      dueDate: { gte: new Date() },
    },
    orderBy: { dueDate: "asc" },
  });

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
    preferences: {
      studyHoursPerDay: user.studyHoursPerDay,
      preferredStudyStart: user.preferredStudyStart,
      preferredStudyEnd: user.preferredStudyEnd,
      breakDuration: user.breakDuration,
      timezone: user.timezone,
    },
    startDate: format(startDate, "yyyy-MM-dd"),
    endDate: format(endDate, "yyyy-MM-dd"),
  });

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
  }>
) {
  const created = [];

  for (const block of blocks) {
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
    created.push(scheduleBlock);
  }

  return created;
}
