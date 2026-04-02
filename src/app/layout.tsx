import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navigation } from "@/components/Navigation";
import { ChatInterface } from "@/components/ChatInterface";
import { SessionProvider } from "@/components/SessionProvider";
import { AuthGuard } from "@/components/AuthGuard";
import { MainLayout } from "@/components/MainLayout";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PlanAI",
  description:
    "Consolidate all your calendars into one smart schedule. AI-powered scheduling for students and professionals.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PlanAI",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#3b82f6",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body className={inter.className}>
        <SessionProvider>
          <AuthGuard>
            <Navigation />
            <MainLayout>
              {children}
            </MainLayout>
            <ChatInterface />
          </AuthGuard>
        </SessionProvider>
      </body>
    </html>
  );
}
