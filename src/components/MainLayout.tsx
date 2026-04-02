"use client";

import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";

export function MainLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();

  // Don't apply navigation padding on landing page when not authenticated
  const isLandingPage = pathname === "/" && !session;

  if (isLandingPage) {
    return <>{children}</>;
  }

  return (
    <main className="min-h-screen pt-14 pb-20 md:pl-64 md:pt-0 md:pb-0">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </div>
    </main>
  );
}
