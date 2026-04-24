"use client";

import { useState } from "react";

export function RunButton({ agentId, disabled }: { agentId: string; disabled?: boolean }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function run() {
    setState("loading");
    try {
      const response = await fetch(`/api/agents/${agentId}/run`, { method: "POST" });
      setState(response.ok ? "done" : "error");
      if (response.ok) {
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch {
      setState("error");
    }
  }

  const label = {
    idle: "Çalıştır",
    loading: "Kuyrukta...",
    done: "Başarılı ✓",
    error: "Hata",
  }[state];

  return (
    <button
      className={`run-btn ${state}`}
      disabled={disabled || state === "loading"}
      onClick={run}
    >
      {state === "loading" && <span className="spinner" />}
      {label}
    </button>
  );
}
