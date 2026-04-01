"use client";

import { format } from "date-fns";
import {
  Clock,
  MapPin,
  ExternalLink,
  BookOpen,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { cn, getComplexityColor, getComplexityLabel, formatDuration, getPriorityColor } from "@/lib/utils";
import type { UnifiedEvent } from "@/types";

interface EventCardProps {
  event: UnifiedEvent;
  compact?: boolean;
  onClick?: () => void;
}

export function EventCard({ event, compact = false, onClick }: EventCardProps) {
  if (compact) {
    return (
      <div
        onClick={onClick}
        className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-accent transition-colors"
      >
        <div
          className="h-3 w-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: event.sourceColor }}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{event.title}</p>
          <p className="text-xs text-muted-foreground">
            {format(new Date(event.startTime), "h:mm a")} -{" "}
            {format(new Date(event.endTime), "h:mm a")}
          </p>
        </div>
        {event.task && (
          <Badge
            variant={event.task.status === "COMPLETED" ? "default" : "secondary"}
            className="flex-shrink-0"
          >
            {event.task.status === "COMPLETED" ? (
              <CheckCircle className="h-3 w-3 mr-1" />
            ) : null}
            {Math.round(event.task.progress)}%
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className="rounded-lg border p-4 cursor-pointer hover:bg-accent/50 transition-colors space-y-3"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            className="h-3 w-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: event.sourceColor }}
          />
          <h3 className="font-semibold text-base">{event.title}</h3>
        </div>
        <div className="flex items-center gap-1">
          <div className={cn("h-2 w-2 rounded-full", getPriorityColor(event.priority))} />
          <Badge variant="outline" className="text-xs">
            {event.eventType.replace("_", " ")}
          </Badge>
        </div>
      </div>

      {/* Time & Location */}
      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
          <Clock className="h-4 w-4" />
          {event.allDay ? (
            <span>All Day - {format(new Date(event.startTime), "MMM d")}</span>
          ) : (
            <span>
              {format(new Date(event.startTime), "MMM d, h:mm a")} -{" "}
              {format(new Date(event.endTime), "h:mm a")}
            </span>
          )}
        </div>
        {event.location && (
          <div className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            <span>{event.location}</span>
          </div>
        )}
        {event.url && (
          <a
            href={event.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-primary hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="h-4 w-4" />
            <span>Open</span>
          </a>
        )}
      </div>

      {/* Description */}
      {event.description && (
        <p className="text-sm text-muted-foreground line-clamp-2">
          {event.description}
        </p>
      )}

      {/* Source */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <BookOpen className="h-3 w-3" />
        <span>{event.sourceName}</span>
      </div>

      {/* Task details */}
      {event.task && (
        <div className="border-t pt-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium">Task Progress</span>
              <span className={getComplexityColor(event.task.complexityScore)}>
                {getComplexityLabel(event.task.complexityScore)}
              </span>
            </div>
            <span className="text-muted-foreground">
              ~{formatDuration(event.task.estimatedMinutes)}
            </span>
          </div>
          <Progress value={event.task.progress} className="h-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{Math.round(event.task.progress)}% complete</span>
            <span>{event.task.status.replace("_", " ")}</span>
          </div>
        </div>
      )}
    </div>
  );
}
