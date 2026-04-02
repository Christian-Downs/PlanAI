"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { Calendar, Sparkles, Link2, Brain, ArrowRight, Smartphone, LogIn, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function LandingPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard");
    }
  }, [status, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoading(true);
    try {
      const result = await signIn("credentials", {
        email,
        password,
        action: isLogin ? "login" : "register",
        callbackUrl: "/dashboard",
        redirect: false
      });

      if (result?.error) {
        alert(result.error);
      } else if (!isLogin) {
        alert("Account created successfully! You are now signed in.");
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Authentication error:", error);
      alert("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-background flex items-center justify-center">
      <div className="w-full max-w-4xl mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center space-y-12">
          {/* Hero Section */}
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <div className="flex items-center justify-center gap-3 mb-6">
              <Calendar className="h-10 w-10 text-primary" />
              <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
                PlanAI
              </h1>
            </div>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
              Consolidate all your calendars into one smart schedule.
              AI-powered scheduling that adapts to your life.
            </p>
          </div>

          {/* Authentication Section */}
          <div className="w-full max-w-sm mx-auto space-y-4">
            {/* Email/Password Form */}
            <div className="bg-card border rounded-lg p-6 shadow-sm">
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold">
                  {isLogin ? "Sign In" : "Create Account"}
                </h3>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-10"
                />

                <Input
                  type="password"
                  placeholder="Password (6+ characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="h-10"
                />

                <Button
                  type="submit"
                  disabled={isLoading || !email || !password}
                  className="w-full h-10"
                >
                  {isLoading ? "Loading..." : (isLogin ? "Sign In" : "Create Account")}
                </Button>

                <div className="text-center pt-1">
                  <p className="text-xs text-muted-foreground">
                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                    <button
                      type="button"
                      onClick={() => setIsLogin(!isLogin)}
                      className="text-primary hover:underline font-medium"
                    >
                      {isLogin ? "Sign up" : "Sign in"}
                    </button>
                  </p>
                </div>
              </form>
            </div>

            {/* Divider */}
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-background px-3 text-muted-foreground">
                  or continue with
                </span>
              </div>
            </div>

            {/* Google Authentication */}
            <div className="space-y-2">
              <Button
                onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
                className="w-full h-10 gap-2"
                variant="outline"
              >
                <LogIn className="h-4 w-4" />
                Sign In with Google
              </Button>

              <Button
                variant="outline"
                onClick={() => signIn("google", { callbackUrl: "/connect" })}
                className="w-full h-10"
              >
                Google + Connect Calendars
              </Button>
            </div>

            <p className="text-center text-xs text-muted-foreground">
              Create an account to get started with AI-powered scheduling
            </p>
          </div>

          {/* Features Section */}
          <div className="w-full max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <FeatureCard
                icon={<Link2 className="h-5 w-5" />}
                title="Connect Everything"
                description="Google, Outlook, iCal feeds in one place."
              />
              <FeatureCard
                icon={<Brain className="h-5 w-5" />}
                title="AI Scheduling"
                description="Intelligent study planning with complexity analysis."
              />
              <FeatureCard
                icon={<Sparkles className="h-5 w-5" />}
                title="Chat with AI"
                description="Customize your schedule with AI assistance."
              />
              <FeatureCard
                icon={<Smartphone className="h-5 w-5" />}
                title="Mobile Ready"
                description="Install as an app for mobile access."
              />
            </div>
          </div>

          {/* How It Works Section */}
          <div className="w-full max-w-3xl mx-auto space-y-6">
            <h2 className="text-2xl font-bold text-center">How It Works</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Step
                number={1}
                title="Connect"
                description="Link your calendar services and LMS platforms."
              />
              <Step
                number={2}
                title="Analyze"
                description="AI analyzes tasks and finds optimal time slots."
              />
              <Step
                number={3}
                title="Optimize"
                description="Get smart schedules with study blocks and breaks."
              />
            </div>
          </div>

          {/* Footer */}
          <footer className="w-full border-t border-border pt-6 mt-8">
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 text-xs text-muted-foreground">
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
    <Card className="text-center border-border/50 hover:border-border transition-colors">
      <CardContent className="pt-4 pb-4 space-y-2">
        <div className="flex justify-center text-primary">{icon}</div>
        <h3 className="font-semibold text-sm">{title}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
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
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
        {number}
      </div>
      <h3 className="font-semibold text-sm">{title}</h3>
      <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
