"use client";

import { useEffect, useState } from "react";
import { format, isToday, isTomorrow, addDays, startOfDay } from "date-fns";
import {
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  BookOpen,
  Brain,
  TrendingUp,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { EventCard } from "@/components/EventCard";
import { useAppStore } from "@/lib/store";
import type { UnifiedEvent } from "@/types";

export default function DashboardPage() {
  const [events, setEvents] = useState<UnifiedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [sources, setSources] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [eventsRes, sourcesRes] = await Promise.all([
        fetch("/api/events?" + new URLSearchParams({
          start: new Date().toISOString(),
          end: addDays(new Date(), 7).toISOString(),
        })),
        fetch("/api/calendars"),
      ]);

      const eventsData = await eventsRes.json();
      const sourcesData = await sourcesRes.json();

      if (eventsData.success) setEvents(eventsData.data || []);
      if (sourcesData.success) setSources(sourcesData.data || []);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }

  // Group events by day
  const todayEvents = events.filter((e) => isToday(new Date(e.startTime)));
  const tomorrowEvents = events.filter((e) => isTomorrow(new Date(e.startTime)));
  const upcomingTasks = events
    .filter((e) => e.task && e.task.status !== "COMPLETED")
    .sort((a, b) => a.task!.complexityScore - b.task!.complexityScore)
    .reverse();
  const overdueCount = events.filter(
    (e) => e.task && e.task.status === "OVERDUE"
  ).length;

  const totalEvents = events.length;
  const completedTasks = events.filter(
    (e) => e.task?.status === "COMPLETED"
  ).length;
  const pendingTasks = events.filter(
    (e) => e.task && e.task.status !== "COMPLETED"
  ).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading your schedule...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            {format(new Date(), "EEEE, MMMM d, yyyy")}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchData}
          disabled={syncing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Today's Events"
          value={todayEvents.length}
          icon={<Calendar className="h-4 w-4" />}
          color="text-blue-500"
        />
        <StatCard
          title="Pending Tasks"
          value={pendingTasks}
          icon={<Clock className="h-4 w-4" />}
          color="text-orange-500"
        />
        <StatCard
          title="Completed"
          value={completedTasks}
          icon={<CheckCircle2 className="h-4 w-4" />}
          color="text-green-500"
        />
        <StatCard
          title="Sources"
          value={sources.length}
          icon={<BookOpen className="h-4 w-4" />}
          color="text-purple-500"
        />
      </div>

      {/* Overdue Alert */}
      {overdueCount > 0 && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <div className="flex-1">
              <p className="font-medium text-destructive">
                {overdueCount} overdue task{overdueCount > 1 ? "s" : ""}
              </p>
              <p className="text-sm text-muted-foreground">
                Some tasks have passed their due dates.
              </p>
            </div>
            <Link href="/calendar">
              <Button size="sm" variant="destructive">
                View <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* No sources yet */}
      {sources.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Calendars Connected</h3>
            <p className="text-muted-foreground mb-4 max-w-sm">
              Connect your first calendar source to start consolidating your schedule.
            </p>
            <Link href="/connect">
              <Button>Connect a Calendar</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Today
            </CardTitle>
            <CardDescription>
              {todayEvents.length} event{todayEvents.length !== 1 ? "s" : ""} scheduled
            </CardDescription>
          </CardHeader>
          <CardContent>
            {todayEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No events scheduled for today.
              </p>
            ) : (
              <div className="space-y-2">
                {todayEvents.slice(0, 5).map((event) => (
                  <EventCard key={event.id} event={event} compact />
                ))}
                {todayEvents.length > 5 && (
                  <Link href="/calendar" className="block">
                    <Button variant="ghost" size="sm" className="w-full">
                      +{todayEvents.length - 5} more events
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Priority Tasks
            </CardTitle>
            <CardDescription>
              Tasks ranked by complexity and urgency
            </CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No pending tasks. You're all caught up!
              </p>
            ) : (
              <div className="space-y-3">
                {upcomingTasks.slice(0, 5).map((event) => (
                  <div key={event.id} className="flex items-center gap-3">
                    <div
                      className="h-2 w-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: event.sourceColor }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{event.title}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Due {format(new Date(event.endTime), "MMM d")}</span>
                        {event.task && (
                          <Badge variant="outline" className="text-xs">
                            {Math.round(event.task.complexityScore * 100)}% complex
                          </Badge>
                        )}
                      </div>
                    </div>
                    {event.task && (
                      <div className="w-16">
                        <Progress value={event.task.progress} className="h-1.5" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tomorrow Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Tomorrow
            </CardTitle>
            <CardDescription>
              {tomorrowEvents.length} event{tomorrowEvents.length !== 1 ? "s" : ""} scheduled
            </CardDescription>
          </CardHeader>
          <CardContent>
            {tomorrowEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Nothing scheduled for tomorrow yet.
              </p>
            ) : (
              <div className="space-y-2">
                {tomorrowEvents.slice(0, 5).map((event) => (
                  <EventCard key={event.id} event={event} compact />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Connected Sources */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Connected Sources
              </CardTitle>
              <Link href="/connect">
                <Button variant="ghost" size="sm">
                  Manage
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {sources.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No sources connected yet.
              </p>
            ) : (
              <div className="space-y-3">
                {sources.map((source: any) => (
                  <div key={source.id} className="flex items-center gap-3">
                    <div
                      className="h-3 w-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: source.color }}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{source.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {source._count?.events || 0} events · {source.lastSyncStatus}
                      </p>
                    </div>
                    <Badge
                      variant={
                        source.lastSyncStatus === "SUCCESS" ? "default" : "secondary"
                      }
                      className="text-xs"
                    >
                      {source.lastSyncStatus === "SUCCESS" ? "Synced" : source.lastSyncStatus}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
          <div className={color}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}
