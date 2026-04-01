"use client";

import { useEffect, useState } from "react";
import { Link2, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConnectServiceCard } from "@/components/ConnectServiceCard";
import { CALENDAR_SOURCES } from "@/types";

export default function ConnectPage() {
  const [connectedSources, setConnectedSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSources();
  }, []);

  async function fetchSources() {
    try {
      const res = await fetch("/api/calendars");
      const data = await res.json();
      if (data.success) {
        setConnectedSources(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch sources:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleConnect(data: {
    type: string;
    name: string;
    icalUrl?: string;
    username?: string;
    password?: string;
    baseUrl?: string;
    apiToken?: string;
  }) {
    const sourceConfig = CALENDAR_SOURCES.find((s) => s.type === data.type);

    if (sourceConfig?.requiresOAuth) {
      // For OAuth sources, redirect to sign in
      // The calendar source will be created after OAuth completes
      window.location.href = `/api/auth/signin?callbackUrl=/connect`;
      return;
    }

    const res = await fetch("/api/calendars", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        color: sourceConfig?.color,
      }),
    });

    const result = await res.json();
    if (result.success) {
      await fetchSources();
    } else {
      throw new Error(result.error || "Failed to connect");
    }
  }

  async function handleDisconnect(sourceId: string) {
    const res = await fetch(`/api/calendars?id=${sourceId}`, {
      method: "DELETE",
    });
    const result = await res.json();
    if (result.success) {
      await fetchSources();
    }
  }

  if (loading) { 
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Link2 className="h-6 w-6 text-primary" />
            Connect Calendars
          </h1>
          <p className="text-muted-foreground">
            Add your calendar services to consolidate your schedule.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchSources}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Connected count */}
      {connectedSources.length > 0 && (
        <div className="rounded-lg bg-primary/5 border border-primary/10 p-4">
          <p className="text-sm">
            <span className="font-semibold">{connectedSources.length}</span> calendar
            {connectedSources.length !== 1 ? "s" : ""} connected ·{" "}
            <span className="font-semibold">
              {connectedSources.reduce(
                (acc: number, s: any) => acc + (s._count?.events || 0),
                0
              )}
            </span>{" "}
            total events synced
          </p>
        </div>
      )}

      {/* Calendar Sources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {CALENDAR_SOURCES.map((source) => {
          const connected = connectedSources.find(
            (s: any) => s.type === source.type
          );
          return (
            <ConnectServiceCard
              key={source.type}
              source={source}
              connected={!!connected}
              lastSync={
                connected?.lastSyncAt
                  ? new Date(connected.lastSyncAt).toLocaleDateString()
                  : undefined
              }
              onConnect={handleConnect}
              onDisconnect={() =>
                connected ? handleDisconnect(connected.id) : Promise.resolve()
              }
            />
          );
        })}
      </div>

      {/* iCal Feed Instructions */}
      <div className="rounded-lg border p-6 space-y-4">
        <h2 className="text-lg font-semibold">Finding Your Calendar Feed URL</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <h3 className="font-medium">Blackboard</h3>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Go to Blackboard Calendar</li>
              <li>Click the gear icon</li>
              <li>Select "Get External Calendar Link"</li>
              <li>Copy the iCal URL</li>
            </ol>
          </div>
          <div className="space-y-2">
            <h3 className="font-medium">Moodle</h3>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Go to Calendar in Moodle</li>
              <li>Click "Export Calendar"</li>
              <li>Select events and timeframe</li>
              <li>Copy the calendar URL</li>
            </ol>
          </div>
          <div className="space-y-2">
            <h3 className="font-medium">Canvas</h3>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Go to Calendar</li>
              <li>Click "Calendar Feed" at the bottom</li>
              <li>Copy the feed URL</li>
              <li>Or use API token from Settings</li>
            </ol>
          </div>
          <div className="space-y-2">
            <h3 className="font-medium">Google Calendar</h3>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Use the "Sign in with Google" option</li>
              <li>Or go to Calendar Settings</li>
              <li>Find "Secret address in iCal format"</li>
              <li>Copy the URL</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
