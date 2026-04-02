"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { Calendar, Sparkles, Link2, Brain, ArrowRight, Smartphone, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function LandingPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard");
    }
  }, [status, router]);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-background overflow-y-auto">
      <div className="flex flex-col items-center justify-center min-h-screen w-full space-y-12 px-4 sm:px-6 lg:px-8">
        {/* Hero */}
        <div className="text-center space-y-4 max-w-2xl">
        <div className="flex items-center justify-center gap-3 mb-6">
          <Calendar className="h-12 w-12 text-primary" />
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            PlanAI
          </h1>
        </div>
        <p className="text-xl text-muted-foreground">
          Consolidate all your calendars into one smart schedule.
          AI-powered scheduling that adapts to your life.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <Button
            size="lg"
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
            className="gap-2"
          >
            <LogIn className="h-4 w-4" /> Sign In with Google
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => signIn("google", { callbackUrl: "/connect" })}
          >
            Sign Up &amp; Connect Calendars
          </Button>
        </div>
        <p className="text-xs text-muted-foreground pt-2">
          No separate sign-up needed — signing in with Google creates your account automatically.
        </p>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-5xl">
        <FeatureCard
          icon={<Link2 className="h-6 w-6" />}
          title="Connect Everything"
          description="Google, Outlook, Blackboard, Moodle, Canvas, and any iCal feed in one place."
        />
        <FeatureCard
          icon={<Brain className="h-6 w-6" />}
          title="AI Scheduling"
          description="Intelligent study planning that considers task complexity and due dates."
        />
        <FeatureCard
          icon={<Sparkles className="h-6 w-6" />}
          title="Chat with AI"
          description="Talk to your AI assistant to customize and optimize your schedule."
        />
        <FeatureCard
          icon={<Smartphone className="h-6 w-6" />}
          title="Mobile Ready"
          description="Install as an app on your phone for on-the-go schedule access."
        />
      </div>

      {/* How it works */}
      <div className="space-y-6 w-full max-w-3xl">
        <h2 className="text-2xl font-bold text-center">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Step number={1} title="Connect" description="Link your calendar services - Google, Outlook, Blackboard, and more." />
          <Step number={2} title="Analyze" description="AI analyzes your tasks, estimates complexity, and finds free time." />
          <Step number={3} title="Optimize" description="Get a smart schedule with study blocks, breaks, and task prioritization." />
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-16 pt-8 border-t border-border">
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 text-sm text-muted-foreground">
          <a href="/privacy-policy.html" className="hover:text-foreground transition-colors">
            Privacy Policy
          </a>
          <span className="hidden sm:inline">•</span>
          <a href="/terms-of-service.html" className="hover:text-foreground transition-colors">
            Terms of Service
          </a>
          <span className="hidden sm:inline">•</span>
          <span>© 2026 PlanAI. All rights reserved.</span>
        </div>
      </footer>
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Card className="text-center">
      <CardContent className="pt-6 space-y-2">
        <div className="flex justify-center text-primary">{icon}</div>
        <h3 className="font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function Step({
  number,
  title,
  description,
}: {
  number: number;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center text-center space-y-2">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
        {number}
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
