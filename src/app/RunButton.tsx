"use client";

import { useState, useEffect } from "react";

export function RunButton({ agentId, disabled }: { agentId: string; disabled?: boolean }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function run() {
    setState("loading");
    try {
      const response = await fetch(`/api/agents/${agentId}/run`, { method: "POST" });
      if (response.ok) {
        setState("done");
        // Poll for completion — refresh page after a delay
        setTimeout(() => window.location.reload(), 45000);
      } else {
        setState("error");
      }
    } catch {
      setState("error");
    }
  }

  // Auto-refresh hint
  useEffect(() => {
    if (state === "done") {
      const interval = setInterval(() => window.location.reload(), 30000);
      return () => clearInterval(interval);
    }
  }, [state]);

  const label = {
    idle: "Çalıştır",
    loading: "Gönderiliyor...",
    done: "Araştırılıyor ⏳",
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
