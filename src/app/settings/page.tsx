"use client";

import { useState } from "react";
import {
  Settings,
  User,
  Clock,
  Sun,
  Moon,
  BookOpen,
  Save,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SettingsPage() {
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    name: "",
    email: "",
    role: "STUDENT",
    timezone: "America/New_York",
    studyHoursPerDay: 4,
    preferredStudyStart: "09:00",
    preferredStudyEnd: "22:00",
    breakDuration: 15,
    darkMode: false,
    notifications: true,
    autoSync: true,
    syncInterval: 30,
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      // TODO: Save to API
      await new Promise((resolve) => setTimeout(resolve, 1000));
      // Success notification would go here
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" />
          Settings
        </h1>
        <p className="text-muted-foreground">
          Customize your calendar and scheduling preferences.
        </p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile
          </CardTitle>
          <CardDescription>Your account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Name</label>
            <Input
              value={settings.name}
              onChange={(e) =>
                setSettings((s) => ({ ...s, name: e.target.value }))
              }
              placeholder="Your name"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Role</label>
            <select
              value={settings.role}
              onChange={(e) =>
                setSettings((s) => ({ ...s, role: e.target.value }))
              }
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="STUDENT">Student</option>
              <option value="PROFESSIONAL">Professional</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Timezone</label>
            <select
              value={settings.timezone}
              onChange={(e) =>
                setSettings((s) => ({ ...s, timezone: e.target.value }))
              }
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="America/New_York">Eastern Time</option>
              <option value="America/Chicago">Central Time</option>
              <option value="America/Denver">Mountain Time</option>
              <option value="America/Los_Angeles">Pacific Time</option>
              <option value="Europe/London">GMT/London</option>
              <option value="Europe/Berlin">CET/Berlin</option>
              <option value="Asia/Tokyo">JST/Tokyo</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Study Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Study Preferences
          </CardTitle>
          <CardDescription>
            Help AI create better schedules for you
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Max Study Hours Per Day
            </label>
            <Input
              type="number"
              min={1}
              max={16}
              value={settings.studyHoursPerDay}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  studyHoursPerDay: parseInt(e.target.value) || 4,
                }))
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1">
                <Sun className="h-4 w-4" /> Study Start Time
              </label>
              <Input
                type="time"
                value={settings.preferredStudyStart}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    preferredStudyStart: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1">
                <Moon className="h-4 w-4" /> Study End Time
              </label>
              <Input
                type="time"
                value={settings.preferredStudyEnd}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    preferredStudyEnd: e.target.value,
                  }))
                }
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Break Duration (minutes)
            </label>
            <Input
              type="number"
              min={5}
              max={60}
              step={5}
              value={settings.breakDuration}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  breakDuration: parseInt(e.target.value) || 15,
                }))
              }
            />
            <p className="text-xs text-muted-foreground">
              AI will schedule breaks of this duration every 90 minutes of study.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Sync Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Sync & Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Auto-sync calendars</p>
              <p className="text-xs text-muted-foreground">
                Automatically sync connected calendars
              </p>
            </div>
            <Switch
              checked={settings.autoSync}
              onCheckedChange={(checked) =>
                setSettings((s) => ({ ...s, autoSync: checked }))
              }
            />
          </div>
          {settings.autoSync && (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Sync Interval (minutes)
              </label>
              <Input
                type="number"
                min={5}
                max={120}
                step={5}
                value={settings.syncInterval}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    syncInterval: parseInt(e.target.value) || 30,
                  }))
                }
              />
            </div>
          )}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Push Notifications</p>
              <p className="text-xs text-muted-foreground">
                Get notified about upcoming events and tasks
              </p>
            </div>
            <Switch
              checked={settings.notifications}
              onCheckedChange={(checked) =>
                setSettings((s) => ({ ...s, notifications: checked }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Save className="h-4 w-4 mr-2" />
        )}
        Save Settings
      </Button>
    </div>
  );
}
