"use client";

import { useState } from "react";
import { AgentForm } from "./AgentForm";

interface AgentCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AgentCreationModal({ isOpen, onClose, onSuccess }: AgentCreationModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: any) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/agents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Ajan oluşturulamadı");
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Agent creation error:", error);
      alert(error instanceof Error ? error.message : "Bir hata oluştu");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Yeni Ajan Oluştur</h2>
          <button onClick={onClose} className="modal-close">
            ×
          </button>
        </div>

        <div className="modal-body">
          <AgentForm
            onSubmit={handleSubmit}
            onCancel={onClose}
            isLoading={isLoading}
            submitLabel="Ajan Oluştur"
          />
        </div>
      </div>
    </div>
  );
}