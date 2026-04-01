"use client";

import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";

const PUBLIC_PATHS = ["/"];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const pathname = usePathname();

  if (PUBLIC_PATHS.includes(pathname)) {
    return <>{children}</>;
  }

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
    return null;
  }

  return <>{children}</>;
}
