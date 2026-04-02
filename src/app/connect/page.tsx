"use client";

import { useEffect, useState } from "react";
import { Link2, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConnectServiceCard } from "@/components/ConnectServiceCard";
import { CALENDAR_SOURCES } from "@/types";
import { useSession, signIn } from "next-auth/react";

export default function ConnectPage() {
  const { data: session } = useSession();
  const [connectedSources, setConnectedSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

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

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch("/api/calendars/sync", {
        method: "POST",
      });
      const result = await res.json();
      if (result.success) {
        console.log("Sync completed:", result);
        await fetchSources(); // Refresh the sources list
      } else {
        console.error("Sync failed:", result.error);
      }
    } catch (error) {
      console.error("Failed to sync calendars:", error);
    } finally {
      setSyncing(false);
    }
  }

  async function handleSyncAccount(accountId: string) {
    try {
      const res = await fetch(`/api/calendars/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId: accountId }),
      });
      const result = await res.json();
      if (result.success) {
        console.log("Account sync completed:", result);
        await fetchSources(); // Refresh the sources list
      } else {
        console.error("Account sync failed:", result.error);
      }
    } catch (error) {
      console.error("Failed to sync account:", error);
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
      // For OAuth sources (Google/Outlook), use signIn to redirect to provider
      const provider = data.type === "GOOGLE" ? "google" : "azure-ad";
      setConnecting(data.type);

      // Use NextAuth signIn function to properly trigger OAuth flow
      await signIn(provider, { callbackUrl: "/connect" });
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
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncing || connectedSources.length === 0}
          >
            {syncing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            {syncing ? "Syncing..." : "Sync Now"}
          </Button>
          <Button variant="outline" size="sm" onClick={fetchSources}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Connected count and status */}
      {connectedSources.length > 0 && (
        <div className="rounded-lg bg-primary/5 border border-primary/10 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
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
            <div className="text-xs text-muted-foreground">
              {connectedSources.some((s: any) => s.lastSyncAt) && (
                <>
                  Last synced:{" "}
                  {Math.max(
                    ...connectedSources
                      .filter((s: any) => s.lastSyncAt)
                      .map((s: any) => new Date(s.lastSyncAt).getTime())
                  ) > 0
                    ? new Date(
                        Math.max(
                          ...connectedSources
                            .filter((s: any) => s.lastSyncAt)
                            .map((s: any) => new Date(s.lastSyncAt).getTime())
                        )
                      ).toLocaleTimeString()
                    : "Never"}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Calendar Sources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {CALENDAR_SOURCES.map((source) => {
          const connectedAccounts = connectedSources.filter(
            (s: any) => s.type === source.type
          );

          return (
            <div key={source.type} className="space-y-2">
              <ConnectServiceCard
                source={source}
                connected={connectedAccounts.length > 0}
                accountCount={connectedAccounts.length}
                lastSync={
                  connectedAccounts.length > 0 && connectedAccounts[0]?.lastSyncAt
                    ? new Date(connectedAccounts[0].lastSyncAt).toLocaleDateString()
                    : undefined
                }
                onConnect={handleConnect}
                onDisconnect={() => Promise.resolve()} // Handled separately below
              />

              {/* Show connected accounts */}
              {connectedAccounts.map((account: any) => (
                <div
                  key={account.id}
                  className="ml-4 p-3 border rounded-lg bg-muted/50 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <div>
                      <p className="text-sm font-medium">
                        {account.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {account._count?.events || 0} events synced
                        {account.lastSyncAt && (
                          <> • Last sync: {new Date(account.lastSyncAt).toLocaleDateString()}</>
                        )}
                        {account.type === "ICAL" && account.accountEmail && (() => {
                          try {
                            return <> • {new URL(account.accountEmail).hostname}</>;
                          } catch {
                            return null;
                          }
                        })()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Add Sync Now button for non-OAuth sources */}
                    {!CALENDAR_SOURCES.find(s => s.type === account.type)?.requiresOAuth && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSyncAccount(account.id)}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        Sync Now
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDisconnect(account.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      Disconnect
                    </Button>
                  </div>
                </div>
              ))}
            </div>
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
