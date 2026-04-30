"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";

export function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/login" || pathname.startsWith("/invite/")) {
    return <>{children}</>;
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">{children}</main>
    </div>
  );
}
