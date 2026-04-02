import prisma from "./prisma";
import { CalendarType, SyncStatus } from "@prisma/client";
import { classifyEvent } from "./openai";

// ---- Blackboard Calendar Sync ----

export async function syncBlackboardCalendar(sourceId: string) {
  const source = await prisma.calendarSource.findUnique({
    where: { id: sourceId },
    include: { user: true },
  });

  if (!source || !source.baseUrl || !source.username || !source.password) {
    throw new Error("Invalid Blackboard source or missing credentials");
  }

  await prisma.calendarSource.update({
    where: { id: sourceId },
    data: { lastSyncStatus: SyncStatus.SYNCING },
  });

  try {
    console.log(`Starting Blackboard sync for: ${source.baseUrl}`);

    // For now, create a placeholder message since full Blackboard scraping requires complex session management
    // This will be expanded to actual calendar scraping in future iterations
    const result = await mockBlackboardSync(source);

    await prisma.calendarSource.update({
      where: { id: sourceId },
      data: {
        lastSyncStatus: SyncStatus.SUCCESS,
        lastSyncAt: new Date(),
        lastSyncError: null,
      },
    });

    console.log(`Blackboard sync completed: ${result.eventsProcessed} events processed`);
    return result;

  } catch (error: any) {
    console.error("Blackboard sync failed:", error.message);

    await prisma.calendarSource.update({
      where: { id: sourceId },
      data: {
        lastSyncStatus: SyncStatus.ERROR,
        lastSyncError: `Blackboard sync error: ${error.message}`,
      },
    });

    throw error;
  }
}

// Mock function for Blackboard sync - to be replaced with actual implementation
async function mockBlackboardSync(source: any) {
  console.log(`Mock sync for Blackboard at ${source.baseUrl} with user ${source.username}`);

  // Create a sample assignment event to show the integration works
  const sampleEvent = {
    title: "Sample Assignment (Blackboard)",
    description: "This is a sample event to demonstrate Blackboard integration. Replace this with actual calendar scraping.",
    startTime: new Date(),
    endTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
  };

  // Classify the event
  const classification = await classifyEvent({
    title: sampleEvent.title,
    description: sampleEvent.description,
    source: source.name,
  });

  // Save the event
  await prisma.calendarEvent.upsert({
    where: {
      sourceId_externalId: {
        sourceId: source.id,
        externalId: "blackboard-sample-1",
      },
    },
    update: {
      title: sampleEvent.title,
      description: sampleEvent.description,
      startTime: sampleEvent.startTime,
      endTime: sampleEvent.endTime,
      eventType: classification.eventType,
      priority: classification.priority,
      allDay: false,
    },
    create: {
      userId: source.userId,
      sourceId: source.id,
      externalId: "blackboard-sample-1",
      title: sampleEvent.title,
      description: sampleEvent.description,
      startTime: sampleEvent.startTime,
      endTime: sampleEvent.endTime,
      eventType: classification.eventType,
      priority: classification.priority,
      allDay: false,
    },
  });

  return {
    eventsProcessed: 1,
    eventsAdded: 1,
    eventsUpdated: 0,
    message: "Blackboard integration connected! This is a placeholder event. Full calendar scraping will be implemented in the next update.",
  };
}

// ---- Moodle Calendar Sync ----

export async function syncMoodleCalendar(sourceId: string) {
  const source = await prisma.calendarSource.findUnique({
    where: { id: sourceId },
  });

  if (!source) throw new Error("Moodle source not found");

  await prisma.calendarSource.update({
    where: { id: sourceId },
    data: {
      lastSyncStatus: SyncStatus.ERROR,
      lastSyncError: "Moodle sync not yet implemented. Please use iCal URL export from Moodle instead.",
    },
  });

  throw new Error("Moodle sync not yet implemented. Please use iCal URL export from Moodle instead.");
}

// ---- Canvas Calendar Sync ----

export async function syncCanvasCalendar(sourceId: string) {
  const source = await prisma.calendarSource.findUnique({
    where: { id: sourceId },
  });

  if (!source) throw new Error("Canvas source not found");

  await prisma.calendarSource.update({
    where: { id: sourceId },
    data: {
      lastSyncStatus: SyncStatus.ERROR,
      lastSyncError: "Canvas sync not yet implemented. Please use API token method instead.",
    },
  });

  throw new Error("Canvas sync not yet implemented. Please use API token method instead.");
}

// ---- iCal/ICS Feed Sync ----

export async function syncICalFeed(sourceId: string) {
  const source = await prisma.calendarSource.findUnique({
    where: { id: sourceId },
    include: { user: true },
  });

  if (!source || !source.icalUrl) {
    throw new Error("Invalid calendar source or missing iCal URL");
  }

  await prisma.calendarSource.update({
    where: { id: sourceId },
    data: { lastSyncStatus: SyncStatus.SYNCING },
  });

  try {
    // Dynamic import for node-ical (server-side only)
    const ical = await import("node-ical");
    const events = await ical.async.fromURL(source.icalUrl);

    let syncedCount = 0;

    for (const [key, event] of Object.entries(events)) {
      if ((event as any).type !== "VEVENT") continue;

      const vevent = event as any;
      const startTime = new Date(vevent.start);
      const endTime = new Date(vevent.end || vevent.start);

      // Skip past events older than 7 days (prioritize future events)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      if (endTime < sevenDaysAgo) continue;

      // Classify the event using LLM
      const classification = await classifyEvent({
        title: vevent.summary || "Untitled",
        description: vevent.description,
        source: source.name,
      });

      await prisma.calendarEvent.upsert({
        where: {
          sourceId_externalId: {
            sourceId: source.id,
            externalId: key,
          },
        },
        create: {
          userId: source.userId,
          sourceId: source.id,
          externalId: key,
          title: vevent.summary || "Untitled Event",
          description: vevent.description || null,
          location: vevent.location || null,
          url: vevent.url || null,
          startTime,
          endTime,
          allDay: vevent.datetype === "date",
          recurring: !!vevent.rrule,
          recurrence: vevent.rrule?.toString() || null,
          eventType: classification.eventType,
          priority: classification.priority,
          color: source.color,
          rawData: JSON.parse(JSON.stringify(vevent)),
        },
        update: {
          title: vevent.summary || "Untitled Event",
          description: vevent.description || null,
          location: vevent.location || null,
          startTime,
          endTime,
          allDay: vevent.datetype === "date",
          eventType: classification.eventType,
          priority: classification.priority,
          rawData: JSON.parse(JSON.stringify(vevent)),
        },
      });

      // If it's a task-like event, create/update task
      if (classification.isTask) {
        const calEvent = await prisma.calendarEvent.findUnique({
          where: {
            sourceId_externalId: {
              sourceId: source.id,
              externalId: key,
            },
          },
        });

        if (calEvent) {
          await prisma.task.upsert({
            where: { eventId: calEvent.id },
            create: {
              userId: source.userId,
              eventId: calEvent.id,
              title: vevent.summary || "Untitled Task",
              description: vevent.description || null,
              courseName: classification.courseName,
              dueDate: endTime,
            },
            update: {
              title: vevent.summary || "Untitled Task",
              description: vevent.description || null,
              courseName: classification.courseName,
              dueDate: endTime,
            },
          });
        }
      }

      syncedCount++;
    }

    await prisma.calendarSource.update({
      where: { id: sourceId },
      data: {
        lastSyncAt: new Date(),
        lastSyncStatus: SyncStatus.SUCCESS,
        lastSyncError: null,
      },
    });

    return { syncedCount };
  } catch (error: any) {
    await prisma.calendarSource.update({
      where: { id: sourceId },
      data: {
        lastSyncStatus: SyncStatus.ERROR,
        lastSyncError: error.message,
      },
    });
    throw error;
  }
}

// ---- Google Calendar Sync ----

export async function syncGoogleCalendar(sourceId: string, accessToken: string) {
  const source = await prisma.calendarSource.findUnique({
    where: { id: sourceId },
  });

  if (!source) {
    console.error("Calendar source not found:", sourceId);
    throw new Error("Calendar source not found");
  }

  console.log("Starting Google Calendar sync for source:", sourceId);

  await prisma.calendarSource.update({
    where: { id: sourceId },
    data: { lastSyncStatus: SyncStatus.SYNCING },
  });

  try {
    // Prioritize future events - get events from 7 days ago to 180 days in the future
    const response = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events?" +
        new URLSearchParams({
          maxResults: "250",
          singleEvents: "true",
          orderBy: "startTime",
          timeMin: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago instead of 30
          timeMax: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(), // 6 months ahead instead of 3
        }),
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Google API error:", response.status, errorData);
      throw new Error(`Google API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    let syncedCount = 0;

    console.log(`Processing ${data.items?.length || 0} events from Google Calendar`);

    // Sort events to prioritize future events (especially today onwards)
    const now = new Date();
    const sortedEvents = (data.items || []).sort((a: any, b: any) => {
      const dateA = new Date(a.start?.dateTime || a.start?.date);
      const dateB = new Date(b.start?.dateTime || b.start?.date);

      // Prioritize future events over past events
      const aIsFuture = dateA >= now;
      const bIsFuture = dateB >= now;

      if (aIsFuture && !bIsFuture) return -1; // a is future, b is past - prioritize a
      if (!aIsFuture && bIsFuture) return 1;  // a is past, b is future - prioritize b
      return dateA.getTime() - dateB.getTime(); // same category, sort by time
    });

    for (const event of sortedEvents) {
      const startTime = new Date(event.start?.dateTime || event.start?.date);
      const endTime = new Date(event.end?.dateTime || event.end?.date);

      if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
        console.warn("Invalid date in event:", event.id, event.summary);
        continue;
      }

      const classification = await classifyEvent({
        title: event.summary || "Untitled",
        description: event.description,
        source: "Google Calendar",
      });

      await prisma.calendarEvent.upsert({
        where: {
          sourceId_externalId: {
            sourceId: source.id,
            externalId: event.id,
          },
        },
        create: {
          userId: source.userId,
          sourceId: source.id,
          externalId: event.id,
          title: event.summary || "Untitled Event",
          description: event.description || null,
          location: event.location || null,
          url: event.htmlLink || null,
          startTime,
          endTime,
          allDay: !event.start?.dateTime,
          eventType: classification.eventType,
          priority: classification.priority,
          color: source.color,
          rawData: event,
        },
        update: {
          title: event.summary || "Untitled Event",
          description: event.description || null,
          location: event.location || null,
          startTime,
          endTime,
          allDay: !event.start?.dateTime,
          eventType: classification.eventType,
          priority: classification.priority,
          rawData: event,
        },
      });
      syncedCount++;
    }

    await prisma.calendarSource.update({
      where: { id: sourceId },
      data: {
        lastSyncAt: new Date(),
        lastSyncStatus: SyncStatus.SUCCESS,
        lastSyncError: null,
      },
    });

    console.log(`Google Calendar sync completed: ${syncedCount} events synced`);
    return { syncedCount };
  } catch (error: any) {
    console.error("Google Calendar sync error:", error);
    await prisma.calendarSource.update({
      where: { id: sourceId },
      data: {
        lastSyncStatus: SyncStatus.ERROR,
        lastSyncError: error.message,
      },
    });
    throw error;
  }
}

// ---- Setup Google Webhook ----

export async function setupGoogleWebhook(sourceId: string, accessToken: string) {
  try {
    // Skip webhook setup if no token is configured
    if (!process.env.GOOGLE_WEBHOOK_TOKEN) {
      console.log("Skipping webhook setup - GOOGLE_WEBHOOK_TOKEN not configured");
      return null;
    }

    const channelId = `planai-${sourceId}-${Date.now()}`;
    const appUrl = process.env.APP_URL || "https://your-app.vercel.app";

    const response = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events/watch",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: channelId,
          type: "web_hook",
          address: `${appUrl}/api/webhooks/google`,
          token: process.env.GOOGLE_WEBHOOK_TOKEN,
          params: {
            ttl: "604800", // 7 days
          },
        }),
      }
    );

    if (response.ok) {
      const data = await response.json();
      await prisma.calendarSource.update({
        where: { id: sourceId },
        data: {
          webhookId: data.resourceId,
          webhookChannelId: channelId,
          webhookExpiry: new Date(parseInt(data.expiration)),
        },
      });
      console.log("Google webhook set up successfully");
      return data;
    } else {
      const errorData = await response.text();
      console.error("Failed to set up Google webhook:", response.status, errorData);
      return null;
    }
  } catch (error) {
    console.error("Error setting up Google webhook:", error);
    return null;
  }
}

// ---- Generic Sync Dispatcher ----

export async function syncCalendarSource(sourceId: string, accessToken?: string) {
  const source = await prisma.calendarSource.findUnique({
    where: { id: sourceId },
  });

  if (!source) throw new Error("Source not found");

  switch (source.type) {
    case CalendarType.ICAL:
    case CalendarType.BLACKBOARD:
    case CalendarType.MOODLE:
      return syncICalFeed(sourceId);

    case CalendarType.CANVAS:
      throw new Error("Canvas sync coming soon - please use iCal export for now");

    case CalendarType.GOOGLE:
      if (!accessToken) throw new Error("Access token required for Google sync");
      return syncGoogleCalendar(sourceId, accessToken);

    case CalendarType.OUTLOOK:
      throw new Error("Outlook sync coming soon - please use iCal export for now");

    default:
      throw new Error(`Unsupported calendar type: ${source.type}`);
  }
}
