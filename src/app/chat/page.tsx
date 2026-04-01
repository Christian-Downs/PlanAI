"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import {
  Send,
  Loader2,
  Sparkles,
  Calendar,
  Brain,
  Clock,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  loading?: boolean;
}

const quickActions = [
  {
    label: "Plan my study schedule",
    icon: Calendar,
    prompt: "Create an optimized study schedule for this week based on my upcoming tasks and deadlines.",
  },
  {
    label: "Analyze task complexity",
    icon: Brain,
    prompt: "Analyze the complexity of all my pending tasks and tell me which ones I should prioritize.",
  },
  {
    label: "What's due soon?",
    icon: Clock,
    prompt: "What assignments and tasks are due in the next 3 days? How should I prepare?",
  },
  {
    label: "Optimize my day",
    icon: Sparkles,
    prompt: "Look at my schedule for today and suggest how I can be most productive with my free time.",
  },
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `Welcome to CalCondensor AI! 👋

I'm your intelligent scheduling assistant. I can help you with:

• **Schedule Planning** - Create optimal study/work schedules
• **Task Analysis** - Estimate complexity and time for assignments
• **Calendar Management** - View, create, and modify events
• **Smart Suggestions** - Get personalized scheduling advice
• **Preference Tuning** - Customize how your schedule is organized

What would you like help with today?`,
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageText,
    };

    const loadingMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: "",
      loading: true,
    };

    setMessages((prev) => [...prev, userMessage, loadingMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const chatHistory = [...messages, userMessage]
        .filter((m) => !m.loading)
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: chatHistory }),
      });

      if (!response.ok) throw new Error("Chat request failed");

      // Try streaming
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          // Parse SSE data chunks from AI SDK
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("0:")) {
              try {
                const text = JSON.parse(line.slice(2));
                fullContent += text;
              } catch {
                fullContent += line.slice(2);
              }
            }
          }

          setMessages((prev) =>
            prev.map((m) =>
              m.loading ? { ...m, content: fullContent } : m
            )
          );
        }
      }

      // Finalize message
      setMessages((prev) =>
        prev.map((m) =>
          m.loading
            ? {
                ...m,
                content: fullContent || "I apologize, but I couldn't generate a response. Please try again.",
                loading: false,
              }
            : m
        )
      );
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) =>
        prev.map((m) =>
          m.loading
            ? {
                ...m,
                content: "Sorry, I encountered an error. Please check your connection and try again.",
                loading: false,
              }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: "welcome-new",
        role: "assistant",
        content: "Chat cleared! How can I help you with your schedule?",
      },
    ]);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-3rem)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            AI Assistant
          </h1>
          <p className="text-muted-foreground">
            Chat with AI to manage and optimize your schedule
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={clearChat}>
          <Trash2 className="h-4 w-4 mr-2" />
          Clear
        </Button>
      </div>

      {/* Quick Actions */}
      {messages.length <= 1 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {quickActions.map((action) => (
            <Card
              key={action.label}
              className="cursor-pointer hover:bg-accent transition-colors"
              onClick={() => handleSend(action.prompt)}
            >
              <CardContent className="flex items-center gap-3 py-3 px-4">
                <action.icon className="h-5 w-5 text-primary flex-shrink-0" />
                <span className="text-sm font-medium">{action.label}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto rounded-lg border bg-muted/30 p-4 space-y-4"
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex",
              message.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "max-w-[85%] rounded-lg px-4 py-3 text-sm",
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background border shadow-sm"
              )}
            >
              {message.loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-muted-foreground">Thinking...</span>
                </div>
              ) : (
                <div className="whitespace-pre-wrap leading-relaxed">
                  {message.content}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="mt-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-2"
        >
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your schedule, get task estimates, plan study time..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
