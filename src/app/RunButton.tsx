"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RunButton({ agentId, disabled }: { agentId: string; disabled?: boolean }) {
  const [state, setState] = useState<"idle" | "loading" | "queued" | "error">("idle");
  const router = useRouter();

  async function run() {
    setState("loading");
    try {
      const response = await fetch(`/api/agents/${agentId}/run`, { method: "POST" });
      if (response.ok) {
        setState("queued");
        router.refresh(); // Refresh dashboard data immediately
        setTimeout(() => setState("idle"), 3000); // Reset button after 3s
      } else {
        setState("error");
        setTimeout(() => setState("idle"), 3000);
      }
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 3000);
    }
  }

  const label = {
    idle: "Çalıştır",
    loading: "Araştırılıyor ⏳",
    queued: "Kuyruğa alındı ✓",
    error: "Hata ✗",
  }[state];

  return (
    <button
      className={`run-btn ${state}`}
      disabled={disabled || state === "loading" || state === "queued"}
      onClick={run}
    >
      {state === "loading" && <span className="spinner" />}
      {label}
    </button>
  );
}
