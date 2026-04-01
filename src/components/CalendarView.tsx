"use client";

import { useEffect, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import { useAppStore } from "@/lib/store";
import type { UnifiedEvent } from "@/types";

interface CalendarViewProps {
  events: UnifiedEvent[];
  onEventClick?: (event: UnifiedEvent) => void;
  onDateSelect?: (start: Date, end: Date) => void;
}

export function CalendarView({ events, onEventClick, onDateSelect }: CalendarViewProps) {
  const { viewMode, setViewMode, enabledSources } = useAppStore();
  const calendarRef = useRef<FullCalendar>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const filteredEvents = events.filter(
    (e) => enabledSources.size === 0 || enabledSources.has(e.sourceId)
  );

  const calendarEvents = filteredEvents.map((event) => ({
    id: event.id,
    title: event.title,
    start: event.startTime,
    end: event.endTime,
    allDay: event.allDay,
    backgroundColor: event.sourceColor,
    borderColor: event.sourceColor,
    extendedProps: { event },
  }));

  const viewMap: Record<string, string> = {
    month: "dayGridMonth",
    week: isMobile ? "listWeek" : "timeGridWeek",
    day: "timeGridDay",
    list: "listWeek",
  };

  return (
    <div className="calendar-container">
      {/* View mode switcher */}
      <div className="mb-4 flex gap-2">
        {(["day", "week", "month", "list"] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => {
              setViewMode(mode);
              calendarRef.current?.getApi().changeView(viewMap[mode]);
            }}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              viewMode === mode
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            {mode.charAt(0).toUpperCase() + mode.slice(1)}
          </button>
        ))}
      </div>

      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
        initialView={viewMap[viewMode]}
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "",
        }}
        events={calendarEvents}
        editable={false}
        selectable={true}
        selectMirror={true}
        dayMaxEvents={true}
        weekends={true}
        nowIndicator={true}
        height="auto"
        eventClick={(info) => {
          const event = info.event.extendedProps.event as UnifiedEvent;
          onEventClick?.(event);
        }}
        select={(info) => {
          onDateSelect?.(info.start, info.end);
        }}
        eventClassNames="cursor-pointer"
      />
    </div>
  );
}
