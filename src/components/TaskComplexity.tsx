"use client";

import { Brain, BarChart3, Timer, Lightbulb } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Progress } from "./ui/progress";
import { cn, getComplexityColor, getComplexityLabel, formatDuration } from "@/lib/utils";
import type { TaskComplexityAnalysis } from "@/types";

interface TaskComplexityProps {
  analysis: TaskComplexityAnalysis;
  taskTitle: string;
}

export function TaskComplexity({ analysis, taskTitle }: TaskComplexityProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Brain className="h-4 w-4 text-primary" />
          Complexity Analysis
        </CardTitle>
        <p className="text-sm text-muted-foreground">{taskTitle}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Score bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Complexity</span>
            <span className={cn("font-semibold", getComplexityColor(analysis.score))}>
              {getComplexityLabel(analysis.score)} ({Math.round(analysis.score * 100)}%)
            </span>
          </div>
          <Progress value={analysis.score * 100} className="h-2" />
        </div>

        {/* Estimated time */}
        <div className="flex items-center gap-2 rounded-md bg-muted p-3">
          <Timer className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">
            Estimated time: <strong>{formatDuration(analysis.estimatedMinutes)}</strong>
          </span>
        </div>

        {/* Reasoning */}
        <div className="space-y-2">
          <div className="flex items-center gap-1 text-sm font-medium">
            <BarChart3 className="h-4 w-4" />
            Analysis
          </div>
          <p className="text-sm text-muted-foreground">{analysis.reasoning}</p>
        </div>

        {/* Factors */}
        {analysis.factors.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Difficulty Factors</p>
            <div className="space-y-1">
              {analysis.factors.map((factor, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{factor.name}</span>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${factor.weight * 100}%` }}
                      />
                    </div>
                    <span className="text-xs w-8 text-right">
                      {Math.round(factor.weight * 100)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Suggested approach */}
        {analysis.suggestedApproach && (
          <div className="flex gap-2 rounded-md bg-primary/5 border border-primary/10 p-3">
            <Lightbulb className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-sm">{analysis.suggestedApproach}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
