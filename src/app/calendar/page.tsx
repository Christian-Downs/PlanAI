"use client";

import { useEffect, useState } from "react";
import { addDays, subDays } from "date-fns";
import { Loader2 } from "lucide-react";
import { CalendarView } from "@/components/CalendarView";
import { EventCard } from "@/components/EventCard";
import { ScheduleSuggestions } from "@/components/ScheduleSuggestions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAppStore } from "@/lib/store";
import type { UnifiedEvent, ScheduleSuggestion } from "@/types";

export default function CalendarPage() {
  const [events, setEvents] = useState<UnifiedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<UnifiedEvent | null>(null);
  const [schedule, setSchedule] = useState<ScheduleSuggestion | null>(null);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const { enableAllSources } = useAppStore();

  useEffect(() => {
    fetchEvents();
  }, []);

  async function fetchEvents() {
    setLoading(true);
    try {
      const res = await fetch(
        "/api/events?" +
          new URLSearchParams({
            start: subDays(new Date(), 30).toISOString(),
            end: addDays(new Date(), 90).toISOString(),
          })
      );
      const data = await res.json();
      if (data.success) {
        setEvents(data.data || []);
        enableAllSources();
      }
    } catch (error) {
      console.error("Failed to fetch events:", error);
    } finally {
      setLoading(false);
    }
  }

  async function generateSchedule() {
    setScheduleLoading(true);
    try {
      const res = await fetch("/api/schedule?days=7");
      const data = await res.json();
      if (data.success) {
        setSchedule(data.data);
      }
    } catch (error) {
      console.error("Failed to generate schedule:", error);
    } finally {
      setScheduleLoading(false);
    }
  }

  async function applySchedule(blocks: any[]) {
    try {
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocks }),
      });
      const data = await res.json();
      if (data.success) {
        // Refresh events to show new schedule blocks
        await fetchEvents();
        setSchedule(null);
      }
    } catch (error) {
      console.error("Failed to apply schedule:", error);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Calendar</h1>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="xl:col-span-2">
          <CalendarView
            events={events}
            onEventClick={setSelectedEvent}
            onDateSelect={(start, end) => {
              console.log("Selected range:", start, end);
            }}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <ScheduleSuggestions
            suggestion={schedule}
            onApply={applySchedule}
            onRegenerate={generateSchedule}
            loading={scheduleLoading}
          />
        </div>
      </div>

      {/* Event Detail Dialog */}
      <Dialog
        open={!!selectedEvent}
        onOpenChange={(open) => !open && setSelectedEvent(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Event Details</DialogTitle>
          </DialogHeader>
          {selectedEvent && <EventCard event={selectedEvent} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
