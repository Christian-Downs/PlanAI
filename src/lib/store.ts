import { create } from "zustand";
import type { UnifiedEvent, ChatMessageData, ScheduleSuggestion } from "@/types";

interface AppState {
  // Calendar events
  events: UnifiedEvent[];
  setEvents: (events: UnifiedEvent[]) => void;
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  viewMode: "month" | "week" | "day" | "list";
  setViewMode: (mode: "month" | "week" | "day" | "list") => void;

  // Filter
  enabledSources: Set<string>;
  toggleSource: (sourceId: string) => void;
  enableAllSources: () => void;

  // Chat
  chatMessages: ChatMessageData[];
  addChatMessage: (message: ChatMessageData) => void;
  setChatMessages: (messages: ChatMessageData[]) => void;
  isChatOpen: boolean;
  setChatOpen: (open: boolean) => void;

  // Schedule
  scheduleSuggestion: ScheduleSuggestion | null;
  setScheduleSuggestion: (schedule: ScheduleSuggestion | null) => void;

  // UI
  isSyncing: boolean;
  setIsSyncing: (syncing: boolean) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Calendar events
  events: [],
  setEvents: (events) => set({ events }),
  selectedDate: new Date(),
  setSelectedDate: (date) => set({ selectedDate: date }),
  viewMode: "week",
  setViewMode: (mode) => set({ viewMode: mode }),

  // Filter
  enabledSources: new Set<string>(),
  toggleSource: (sourceId) =>
    set((state) => {
      const newSources = new Set(state.enabledSources);
      if (newSources.has(sourceId)) {
        newSources.delete(sourceId);
      } else {
        newSources.add(sourceId);
      }
      return { enabledSources: newSources };
    }),
  enableAllSources: () =>
    set((state) => ({
      enabledSources: new Set(state.events.map((e) => e.sourceId)),
    })),

  // Chat
  chatMessages: [],
  addChatMessage: (message) =>
    set((state) => ({ chatMessages: [...state.chatMessages, message] })),
  setChatMessages: (messages) => set({ chatMessages: messages }),
  isChatOpen: false,
  setChatOpen: (open) => set({ isChatOpen: open }),

  // Schedule
  scheduleSuggestion: null,
  setScheduleSuggestion: (schedule) => set({ scheduleSuggestion: schedule }),

  // UI
  isSyncing: false,
  setIsSyncing: (syncing) => set({ isSyncing: syncing }),
  activeTab: "calendar",
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
