"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RunButton({ agentId, disabled }: { agentId: string; disabled?: boolean }) {
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const router = useRouter();

  async function run() {
    setState("loading");
    try {
      const response = await fetch(`/api/agents/${agentId}/run`, { method: "POST" });
      if (response.ok) {
        setState("success");
        router.refresh();
        setTimeout(() => setState("idle"), 3000);
      } else {
        const data = await response.json().catch(() => null);
        if (data?.error) {
          alert(data.error);
        }
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
    success: "Tamamlandı ✓",
    error: "Hata ✗",
  }[state];

  return (
    <button
      className={`run-btn ${state}`}
      disabled={disabled || state === "loading" || state === "success"}
      onClick={run}
    >
      {state === "loading" && <span className="spinner" />}
      {label}
    </button>
  );
}
