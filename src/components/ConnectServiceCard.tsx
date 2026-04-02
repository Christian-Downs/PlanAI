"use client";

import { useState } from "react";
import {
  Calendar,
  Globe,
  GraduationCap,
  Mail,
  Shield,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { CALENDAR_SOURCES } from "@/types";
import type { CalendarSourceConfig } from "@/types";

const iconMap: Record<string, React.ReactNode> = {
  google: <Mail className="h-6 w-6" />,
  outlook: <Shield className="h-6 w-6" />,
  blackboard: <GraduationCap className="h-6 w-6" />,
  moodle: <GraduationCap className="h-6 w-6" />,
  canvas: <GraduationCap className="h-6 w-6" />,
  calendar: <Globe className="h-6 w-6" />,
};

interface ConnectServiceCardProps {
  source: CalendarSourceConfig;
  connected?: boolean;
  lastSync?: string;
  accountCount?: number; // Number of connected accounts
  onConnect: (data: {
    type: string;
    name: string;
    icalUrl?: string;
    username?: string;
    password?: string;
    baseUrl?: string;
    apiToken?: string;
  }) => Promise<void>;
  onDisconnect?: () => Promise<void>;
}

export function ConnectServiceCard({
  source,
  connected = false,
  lastSync,
  accountCount = 0,
  onConnect,
  onDisconnect,
}: ConnectServiceCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    icalUrl: "",
    username: "",
    password: "",
    baseUrl: "",
    apiToken: "",
    name: "", // For custom feed names
  });

  const isDisabled = source.disabled;

  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    try {
      if (source.requiresOAuth) {
        // Trigger OAuth flow
        await onConnect({
          type: source.type,
          name: source.name,
        });
      } else {
        // For non-OAuth sources, test connection first
        const connectionData = {
          type: source.type,
          icalUrl: formData.icalUrl || undefined,
          username: formData.username || undefined,
          password: formData.password || undefined,
          baseUrl: formData.baseUrl || undefined,
          apiToken: formData.apiToken || undefined,
        };

        // Test the connection
        const testResponse = await fetch("/api/calendars/test-connection", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(connectionData),
        });

        const testResult = await testResponse.json();

        if (!testResult.success) {
          throw new Error(testResult.error || "Connection test failed");
        }

        // If test passed, proceed with actual connection
        await onConnect({
          type: source.type,
          name: formData.name || source.name, // Use custom name if provided
          icalUrl: formData.icalUrl || undefined,
          username: formData.username || undefined,
          password: formData.password || undefined,
          baseUrl: formData.baseUrl || undefined,
          apiToken: formData.apiToken || undefined,
        });
      }
      setDialogOpen(false);
      setFormData({
        icalUrl: "",
        username: "",
        password: "",
        baseUrl: "",
        apiToken: "",
        name: "",
      });
    } catch (error) {
      console.error("Failed to connect:", error);
      setError((error as Error).message || "Failed to connect. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className={`relative overflow-hidden ${isDisabled ? 'opacity-75' : ''}`}>
      {/* Color bar */}
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{ backgroundColor: source.color }}
      />

      <CardHeader className="pt-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg"
              style={{ backgroundColor: source.color + "20", color: source.color }}
            >
              {iconMap[source.icon]}
            </div>
            <div>
              <CardTitle className="text-base">{source.name}</CardTitle>
              <CardDescription className="text-xs">
                {connected ? (
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="h-3 w-3" />
                    {accountCount > 1 ? `${accountCount} accounts connected` : "Connected"}
                    {lastSync && ` · Synced ${lastSync}`}
                  </span>
                ) : isDisabled ? (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <AlertCircle className="h-3 w-3" />
                    {source.description}
                  </span>
                ) : (
                  source.description
                )}
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex gap-2">
          {isDisabled ? (
            // Disabled state - show "Coming Soon" button
            <Button
              size="sm"
              className="w-full opacity-50 cursor-not-allowed"
              style={{ backgroundColor: source.color }}
              disabled
            >
              Coming Soon
            </Button>
          ) : connected && (source.requiresOAuth || source.type === "ICAL") ? (
            // For OAuth providers and iCal, show "Add Another Account" button
            <Dialog
              open={dialogOpen}
              onOpenChange={(open) => {
                setDialogOpen(open);
                if (!open) {
                  setError(null);
                }
              }}
            >
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="w-full">
                  {source.type === "ICAL" ? "Add Another Feed" : "Add Another Account"}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {source.type === "ICAL"
                      ? `Add Another ${source.name} Feed`
                      : `Add Another ${source.name} Account`
                    }
                  </DialogTitle>
                  <DialogDescription>
                    {source.type === "ICAL"
                      ? "Connect an additional calendar feed to sync more events."
                      : `Connect an additional ${source.name} account to sync more calendars.`
                    }
                  </DialogDescription>
                </DialogHeader>

                {!source.requiresOAuth && (
                  <div className="space-y-4 py-4">
                    {/* Error message */}
                    {error && (
                      <div className="p-3 rounded-md bg-red-50 border border-red-200">
                        <p className="text-sm text-red-600">{error}</p>
                      </div>
                    )}

                    {/* Feed Name for iCal */}
                    {source.type === "ICAL" && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Feed Name</label>
                        <Input
                          placeholder="e.g., Work Calendar, School Events"
                          value={formData.name || ""}
                          onChange={(e) =>
                            setFormData((f) => ({ ...f, name: e.target.value }))
                          }
                        />
                        <p className="text-xs text-muted-foreground">
                          Optional: Give this feed a custom name to identify it easily
                        </p>
                      </div>
                    )}

                    {source.requiresUrl && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          {source.type === "ICAL" ? "iCal/ICS URL" : "Base URL"}
                        </label>
                        <Input
                          placeholder={
                            source.type === "ICAL"
                              ? "https://example.com/calendar.ics"
                              : `https://your-school.${source.type.toLowerCase()}.com`
                          }
                          value={formData.baseUrl || formData.icalUrl}
                          onChange={(e) =>
                            setFormData((f) => ({
                              ...f,
                              [source.type === "ICAL" ? "icalUrl" : "baseUrl"]: e.target.value,
                            }))
                          }
                        />
                      </div>
                    )}
                  </div>
                )}

                <DialogFooter>
                  <Button
                    onClick={handleConnect}
                    disabled={loading}
                    style={{ backgroundColor: source.color }}
                  >
                    {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {loading
                      ? (source.requiresOAuth ? "Signing In..." : "Testing Connection...")
                      : (source.requiresOAuth ? "Sign In with Another Account" : "Connect Feed")
                    }
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : connected && !source.requiresOAuth && source.type !== "ICAL" ? (
            // For non-OAuth providers (except iCal), still show traditional controls
            <>
              <Button size="sm" variant="outline" className="flex-1">
                Sync Now
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={onDisconnect}
              >
                Disconnect
              </Button>
            </>
          ) : (
            // Not connected - show connect button
            <Dialog
              open={dialogOpen}
              onOpenChange={(open) => {
                setDialogOpen(open);
                if (!open) {
                  setError(null);
                }
              }}
            >
              <DialogTrigger asChild>
                <Button size="sm" className="w-full" style={{ backgroundColor: source.color }}>
                  Connect
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Connect {source.name}</DialogTitle>
                  <DialogDescription>
                    {source.requiresOAuth
                      ? "Click below to sign in with your account."
                      : "Enter your connection details below."}
                  </DialogDescription>
                </DialogHeader>

                {!source.requiresOAuth && (
                  <div className="space-y-4 py-4">
                    {/* Error message */}
                    {error && (
                      <div className="p-3 rounded-md bg-red-50 border border-red-200">
                        <p className="text-sm text-red-600">{error}</p>
                      </div>
                    )}

                    {/* Feed Name for iCal */}
                    {source.type === "ICAL" && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Feed Name (Optional)</label>
                        <Input
                          placeholder="e.g., Work Calendar, School Events"
                          value={formData.name || ""}
                          onChange={(e) =>
                            setFormData((f) => ({ ...f, name: e.target.value }))
                          }
                        />
                        <p className="text-xs text-muted-foreground">
                          Give this feed a custom name to identify it easily
                        </p>
                      </div>
                    )}

                    {source.requiresUrl && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          {source.type === "ICAL" ? "iCal/ICS URL" : "Base URL"}
                        </label>
                        <Input
                          placeholder={
                            source.type === "ICAL"
                              ? "https://example.com/calendar.ics"
                              : `https://your-school.${source.type.toLowerCase()}.com`
                          }
                          value={formData.baseUrl || formData.icalUrl}
                          onChange={(e) =>
                            setFormData((f) => ({
                              ...f,
                              [source.type === "ICAL" ? "icalUrl" : "baseUrl"]: e.target.value,
                            }))
                          }
                        />
                      </div>
                    )}

                    {source.requiresCredentials && (
                      <>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Username</label>
                          <Input
                            placeholder="Your username"
                            value={formData.username}
                            onChange={(e) =>
                              setFormData((f) => ({ ...f, username: e.target.value }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Password</label>
                          <Input
                            type="password"
                            placeholder="Your password"
                            value={formData.password}
                            onChange={(e) =>
                              setFormData((f) => ({ ...f, password: e.target.value }))
                            }
                          />
                        </div>
                      </>
                    )}

                    {source.type === "CANVAS" && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">API Token</label>
                        <Input
                          placeholder="Your Canvas API token"
                          value={formData.apiToken}
                          onChange={(e) =>
                            setFormData((f) => ({ ...f, apiToken: e.target.value }))
                          }
                        />
                        <p className="text-xs text-muted-foreground">
                          Find this in Canvas → Account → Settings → New Access Token
                        </p>
                      </div>
                    )}

                    <div className="flex items-start gap-2 rounded-md bg-muted p-3">
                      <AlertCircle className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">
                        Your credentials are encrypted and stored securely. They are only used
                        to sync your calendar data.
                      </p>
                    </div>
                  </div>
                )}

                <DialogFooter>
                  <Button
                    onClick={handleConnect}
                    disabled={loading}
                    style={{ backgroundColor: source.color }}
                  >
                    {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {loading
                      ? (source.requiresOAuth ? "Signing In..." : "Testing Connection...")
                      : (source.requiresOAuth ? "Sign In" : "Connect")
                    }
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
