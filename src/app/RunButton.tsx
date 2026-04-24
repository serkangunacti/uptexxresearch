"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RunButton({ agentId, disabled }: { agentId: string; disabled?: boolean }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const router = useRouter();

  async function run() {
    setState("loading");
    try {
      const response = await fetch(`/api/agents/${agentId}/run`, { method: "POST" });
      if (response.ok) {
        setState("done");
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
    done: "Tamamlandı ✓",
    error: "Hata ✗",
  }[state];

  return (
    <button
      className={`run-btn ${state}`}
      disabled={disabled || state === "loading" || state === "done"}
      onClick={run}
    >
      {state === "loading" && <span className="spinner" />}
      {label}
    </button>
  );
}
