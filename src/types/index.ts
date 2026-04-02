import {
  CalendarType,
  EventType,
  Priority,
  TaskStatus,
  BlockType,
  SyncStatus,
} from "@prisma/client";

// Re-export Prisma enums for convenience
export {
  CalendarType,
  EventType,
  Priority,
  TaskStatus,
  BlockType,
  SyncStatus,
};

// ---- Calendar Source Types ----

export interface CalendarSourceConfig {
  type: CalendarType;
  name: string;
  color: string;
  icon: string;
  description: string;
  requiresOAuth: boolean;
  requiresCredentials: boolean;
  requiresUrl: boolean;
  supportsWebhook: boolean;
  disabled?: boolean; // For "coming soon" services
}

export const CALENDAR_SOURCES: CalendarSourceConfig[] = [
  {
    type: "GOOGLE",
    name: "Google Calendar",
    color: "#4285F4",
    icon: "google",
    description: "Connect your Google Calendar and Gmail events",
    requiresOAuth: true,
    requiresCredentials: false,
    requiresUrl: false,
    supportsWebhook: true,
  },
  {
    type: "OUTLOOK",
    name: "Microsoft Outlook",
    color: "#0078D4",
    icon: "outlook",
    description: "Coming soon - Connect your Outlook calendar",
    requiresOAuth: true,
    requiresCredentials: false,
    requiresUrl: false,
    supportsWebhook: true,
    disabled: true,
  },
  {
    type: "BLACKBOARD",
    name: "Blackboard",
    color: "#262626",
    icon: "blackboard",
    description: "Coming soon - Import assignments using iCal calendar export",
    requiresOAuth: false,
    requiresCredentials: false,
    requiresUrl: true,
    supportsWebhook: false,
    disabled: true,
  },
  {
    type: "MOODLE",
    name: "Moodle",
    color: "#F98012",
    icon: "moodle",
    description: "Coming soon - Import course events using iCal calendar export",
    requiresOAuth: false,
    requiresCredentials: false,
    requiresUrl: true,
    supportsWebhook: false,
    disabled: true,
  },
  {
    type: "CANVAS",
    name: "Canvas",
    color: "#E13C2B",
    icon: "canvas",
    description: "Coming soon - Connect your Canvas courses",
    requiresOAuth: false,
    requiresCredentials: true,
    requiresUrl: true,
    supportsWebhook: false,
    disabled: true,
  },
  {
    type: "ICAL",
    name: "iCal / ICS Feed",
    color: "#34D399",
    icon: "calendar",
    description: "Subscribe to any calendar via iCal/ICS URL",
    requiresOAuth: false,
    requiresCredentials: false,
    requiresUrl: true,
    supportsWebhook: false,
  },
];

// ---- Event Types ----

export interface UnifiedEvent {
  id: string;
  sourceId: string;
  sourceName: string;
  sourceType: CalendarType;
  sourceColor: string;
  title: string;
  description?: string;
  location?: string;
  url?: string;
  startTime: Date;
  endTime: Date;
  allDay: boolean;
  eventType: EventType;
  priority: Priority;
  // Task info if applicable
  task?: {
    id: string;
    status: TaskStatus;
    estimatedMinutes: number;
    complexityScore: number;
    progress: number;
  };
}

// ---- Chat Types ----

export interface ChatMessageData {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  actions?: ChatAction[];
  createdAt: Date;
}

export interface ChatAction {
  type: "create_event" | "modify_event" | "delete_event" | "create_schedule" | "modify_preferences";
  description: string;
  data: Record<string, unknown>;
  applied: boolean;
}

// ---- Schedule Types ----

export interface ScheduleSuggestion {
  blocks: ScheduleBlockSuggestion[];
  reasoning: string;
  totalStudyMinutes: number;
  totalBreakMinutes: number;
}

export interface ScheduleBlockSuggestion {
  title: string;
  type: BlockType;
  startTime: Date;
  endTime: Date;
  taskId?: string;
  reasoning: string;
}

// ---- Task Complexity Types ----

export interface TaskComplexityAnalysis {
  score: number; // 0-1
  estimatedMinutes: number;
  reasoning: string;
  factors: ComplexityFactor[];
  suggestedApproach: string;
}

export interface ComplexityFactor {
  name: string;
  weight: number;
  description: string;
}

// ---- Scraping Types ----

export interface ScrapeStep {
  action: "navigate" | "click" | "type" | "extract" | "wait" | "scroll";
  selector?: string;
  value?: string;
  url?: string;
  description: string;
  extractAs?: string;
}

export interface ScrapeConfig {
  steps: ScrapeStep[];
  outputMapping: Record<string, string>;
  generatedBy: string; // LLM model
  generatedAt: string;
}

// ---- API Response Types ----

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
