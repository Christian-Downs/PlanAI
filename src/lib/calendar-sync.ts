import prisma from "./prisma";
import { CalendarType, SyncStatus } from "@prisma/client";
import { classifyEvent } from "./openai";

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

      // Skip past events older than 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      if (endTime < thirtyDaysAgo) continue;

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

  if (!source) throw new Error("Calendar source not found");

  await prisma.calendarSource.update({
    where: { id: sourceId },
    data: { lastSyncStatus: SyncStatus.SYNCING },
  });

  try {
    const response = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events?" +
        new URLSearchParams({
          maxResults: "250",
          singleEvents: "true",
          orderBy: "startTime",
          timeMin: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          timeMax: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        }),
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Google API error: ${response.status}`);
    }

    const data = await response.json();
    let syncedCount = 0;

    for (const event of data.items || []) {
      const startTime = new Date(event.start?.dateTime || event.start?.date);
      const endTime = new Date(event.end?.dateTime || event.end?.date);

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

// ---- Setup Google Webhook ----

export async function setupGoogleWebhook(sourceId: string, accessToken: string) {
  const channelId = `cal-condensor-${sourceId}-${Date.now()}`;
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
    return data;
  }

  throw new Error("Failed to set up Google webhook");
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
    case CalendarType.CANVAS:
      return syncICalFeed(sourceId);

    case CalendarType.GOOGLE:
      if (!accessToken) throw new Error("Access token required for Google sync");
      return syncGoogleCalendar(sourceId, accessToken);

    case CalendarType.OUTLOOK:
      // Similar to Google but with Microsoft Graph API
      throw new Error("Outlook sync not yet implemented - use iCal URL instead");

    default:
      throw new Error(`Unsupported calendar type: ${source.type}`);
  }
}
