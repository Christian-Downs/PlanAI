import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navigation } from "@/components/Navigation";
import { ChatInterface } from "@/components/ChatInterface";
import { SessionProvider } from "@/components/SessionProvider";
import { AuthGuard } from "@/components/AuthGuard";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Calendar Condensor",
  description:
    "Consolidate all your calendars into one smart schedule. AI-powered scheduling for students and professionals.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CalCondensor",
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
            <main className="min-h-screen pt-14 pb-20 md:pl-64 md:pt-0 md:pb-0">
              <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                {children}
              </div>
            </main>
            <ChatInterface />
          </AuthGuard>
        </SessionProvider>
      </body>
    </html>
  );
}
