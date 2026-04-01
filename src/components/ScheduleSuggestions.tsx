"use client";

import { format } from "date-fns";
import {
  Clock,
  Brain,
  CheckCircle,
  ChevronRight,
  Zap,
} from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { cn, getComplexityColor, getComplexityLabel, formatDuration } from "@/lib/utils";
import type { ScheduleSuggestion, ScheduleBlockSuggestion } from "@/types";

interface ScheduleSuggestionsProps {
  suggestion: ScheduleSuggestion | null;
  onApply: (blocks: ScheduleBlockSuggestion[]) => void;
  onRegenerate: () => void;
  loading?: boolean;
}

export function ScheduleSuggestions({
  suggestion,
  onApply,
  onRegenerate,
  loading,
}: ScheduleSuggestionsProps) {
  if (!suggestion && !loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Brain className="h-5 w-5 text-primary" />
            AI Schedule Optimizer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Let AI analyze your tasks and create an optimal study schedule
            based on due dates, complexity, and your preferences.
          </p>
          <Button onClick={onRegenerate} className="w-full">
            <Zap className="h-4 w-4 mr-2" />
            Generate Schedule
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">
              AI is optimizing your schedule...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!suggestion) return null;

  const blockTypeColors: Record<string, string> = {
    STUDY: "bg-blue-100 text-blue-800 border-blue-200",
    HOMEWORK: "bg-purple-100 text-purple-800 border-purple-200",
    EXAM_PREP: "bg-red-100 text-red-800 border-red-200",
    BREAK: "bg-green-100 text-green-800 border-green-200",
    BUFFER: "bg-gray-100 text-gray-800 border-gray-200",
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Brain className="h-5 w-5 text-primary" />
            AI Schedule Suggestion
          </CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={onRegenerate}>
              Regenerate
            </Button>
            <Button size="sm" onClick={() => onApply(suggestion.blocks)}>
              Apply
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{formatDuration(suggestion.totalStudyMinutes)} study</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <CheckCircle className="h-4 w-4" />
            <span>{formatDuration(suggestion.totalBreakMinutes)} breaks</span>
          </div>
        </div>

        {/* AI Reasoning */}
        <p className="text-sm text-muted-foreground bg-muted rounded-md p-3">
          {suggestion.reasoning}
        </p>

        {/* Schedule Blocks */}
        <div className="space-y-2">
          {suggestion.blocks.map((block, i) => (
            <div
              key={i}
              className={cn(
                "flex items-center gap-3 rounded-md border p-3",
                blockTypeColors[block.type] || blockTypeColors.BUFFER
              )}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{block.title}</p>
                <p className="text-xs opacity-75">
                  {format(new Date(block.startTime), "EEE h:mm a")} -{" "}
                  {format(new Date(block.endTime), "h:mm a")}
                </p>
              </div>
              <Badge variant="outline" className="text-xs capitalize">
                {block.type.toLowerCase().replace("_", " ")}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
