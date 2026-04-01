import * as cheerio from "cheerio";
import { generateScrapeConfig } from "./openai";
import type { ScrapeConfig, ScrapeStep } from "@/types";

interface ScrapedEvent {
  title: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  eventType?: string;
  courseName?: string;
  url?: string;
}

// ---- LLM-Guided Scraping ----

export async function generateAndExecuteScrape(params: {
  platform: string;
  baseUrl: string;
  credentials?: { username: string; password: string };
}): Promise<ScrapedEvent[]> {
  // Step 1: LLM generates scraping config
  const config = await generateScrapeConfig({
    platform: params.platform,
    baseUrl: params.baseUrl,
    goal: "Extract calendar events, assignments, and deadlines",
  });

  if (!config) {
    throw new Error("Failed to generate scraping configuration");
  }

  // Step 2: Execute the scraping steps
  return executeScrapeConfig(config, params.baseUrl, params.credentials);
}

// ---- Execute Scrape Steps ----

async function executeScrapeConfig(
  config: ScrapeConfig,
  baseUrl: string,
  credentials?: { username: string; password: string }
): Promise<ScrapedEvent[]> {
  const events: ScrapedEvent[] = [];
  const extractedData: Record<string, string[]> = {};

  for (const step of config.steps) {
    try {
      switch (step.action) {
        case "navigate": {
          const url = step.url || baseUrl;
          const response = await fetch(url, {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
          });
          const html = await response.text();
          const $ = cheerio.load(html);

          // If this step also has extraction
          if (step.extractAs && step.selector) {
            const values: string[] = [];
            $(step.selector).each((_, el) => {
              values.push($(el).text().trim());
            });
            extractedData[step.extractAs] = values;
          }
          break;
        }

        case "extract": {
          // Extract would work on the last navigated page
          // In a server-side context, we re-fetch and extract
          if (step.selector && step.extractAs) {
            const response = await fetch(baseUrl, {
              headers: {
                "User-Agent":
                  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
              },
            });
            const html = await response.text();
            const $ = cheerio.load(html);
            const values: string[] = [];
            $(step.selector).each((_, el) => {
              values.push($(el).text().trim());
            });
            extractedData[step.extractAs] = values;
          }
          break;
        }

        default:
          // Other actions like click, type, scroll need a headless browser
          // For now, we log and skip
          console.log(`Skipping unsupported scrape action: ${step.action}`);
      }
    } catch (error) {
      console.error(`Scrape step failed: ${step.description}`, error);
    }
  }

  // Map extracted data to events using the output mapping
  const mapping = config.outputMapping || {};
  const titleKey = Object.entries(mapping).find(([_, v]) => v === "title")?.[0];
  const descKey = Object.entries(mapping).find(([_, v]) => v === "description")?.[0];
  const dateKey = Object.entries(mapping).find(([_, v]) => v === "startTime")?.[0];
  const courseKey = Object.entries(mapping).find(([_, v]) => v === "courseName")?.[0];

  if (titleKey && extractedData[titleKey]) {
    const titles = extractedData[titleKey];
    const descriptions = descKey ? extractedData[descKey] || [] : [];
    const dates = dateKey ? extractedData[dateKey] || [] : [];
    const courses = courseKey ? extractedData[courseKey] || [] : [];

    for (let i = 0; i < titles.length; i++) {
      events.push({
        title: titles[i],
        description: descriptions[i] || undefined,
        startTime: dates[i] || undefined,
        courseName: courses[i] || undefined,
      });
    }
  }

  return events;
}

// ---- Moodle Calendar API (when available) ----

export async function scrapeMoodleCalendar(params: {
  baseUrl: string;
  token: string;
}) {
  const url = `${params.baseUrl}/lib/ajax/service.php?sesskey=&info=core_calendar_get_calendar_monthly_view`;

  try {
    const now = new Date();
    const response = await fetch(
      `${params.baseUrl}/webservice/rest/server.php?` +
        new URLSearchParams({
          wstoken: params.token,
          moodlewsrestformat: "json",
          wsfunction: "core_calendar_get_calendar_upcoming_view",
        }),
      { method: "GET" }
    );

    const data = await response.json();

    if (data.events) {
      return data.events.map((event: any) => ({
        title: event.name,
        description: event.description,
        startTime: new Date(event.timestart * 1000).toISOString(),
        endTime: event.timeduration
          ? new Date((event.timestart + event.timeduration) * 1000).toISOString()
          : undefined,
        eventType: event.eventtype === "due" ? "ASSIGNMENT" : "CLASS",
        courseName: event.course?.fullname,
        url: event.url,
      }));
    }

    return [];
  } catch (error) {
    console.error("Moodle scrape failed:", error);
    return [];
  }
}

// ---- Canvas API Integration ----

export async function scrapeCanvasCalendar(params: {
  baseUrl: string;
  token: string;
}) {
  try {
    // Fetch assignments
    const assignmentsRes = await fetch(
      `${params.baseUrl}/api/v1/users/self/upcoming_events`,
      {
        headers: {
          Authorization: `Bearer ${params.token}`,
        },
      }
    );

    const events = await assignmentsRes.json();

    return events.map((event: any) => ({
      title: event.title,
      description: event.description,
      startTime: event.start_at || event.all_day_date,
      endTime: event.end_at || event.start_at,
      eventType: event.assignment ? "ASSIGNMENT" : "OTHER",
      courseName: event.context_name,
      url: event.html_url,
    }));
  } catch (error) {
    console.error("Canvas scrape failed:", error);
    return [];
  }
}
