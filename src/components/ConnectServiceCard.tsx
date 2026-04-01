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
  onConnect,
  onDisconnect,
}: ConnectServiceCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    icalUrl: "",
    username: "",
    password: "",
    baseUrl: "",
    apiToken: "",
  });

  const handleConnect = async () => {
    setLoading(true);
    try {
      if (source.requiresOAuth) {
        // Trigger OAuth flow
        await onConnect({
          type: source.type,
          name: source.name,
        });
      } else {
        await onConnect({
          type: source.type,
          name: source.name,
          icalUrl: formData.icalUrl || undefined,
          username: formData.username || undefined,
          password: formData.password || undefined,
          baseUrl: formData.baseUrl || undefined,
          apiToken: formData.apiToken || undefined,
        });
      }
      setDialogOpen(false);
    } catch (error) {
      console.error("Failed to connect:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="relative overflow-hidden">
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
                    Connected{lastSync ? ` · Synced ${lastSync}` : ""}
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
          {connected ? (
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
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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
                    {source.requiresOAuth ? "Sign In" : "Connect"}
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
