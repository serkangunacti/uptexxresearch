"use client";

import { useState } from "react";
import { z } from "zod";

const AgentSchema = z.object({
  name: z.string().min(1, "İsim gerekli"),
  description: z.string().min(1, "Açıklama gerekli"),
  cadence: z.string().min(1, "Kadans gerekli"),
  scheduleLabel: z.string().min(1, "Zamanlama etiketi gerekli"),
  defaultPrompt: z.string().min(10, "Prompt en az 10 karakter olmalı"),
  queries: z.array(z.string().min(1, "Sorgu boş olamaz")).min(1, "En az bir sorgu gerekli"),
  status: z.enum(["ACTIVE", "PAUSED"]),
});

type AgentFormData = z.infer<typeof AgentSchema>;

interface AgentFormProps {
  initialData?: Partial<AgentFormData>;
  onSubmit: (data: AgentFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  submitLabel?: string;
}

export function AgentForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  submitLabel = "Kaydet"
}: AgentFormProps) {
  const [formData, setFormData] = useState<Partial<AgentFormData>>({
    name: "",
    description: "",
    cadence: "",
    scheduleLabel: "",
    defaultPrompt: "",
    queries: [""],
    status: "ACTIVE",
    ...initialData
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const validated = AgentSchema.parse(formData);
      await onSubmit(validated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMap: Record<string, string> = {};
        error.errors.forEach((err) => {
          const path = err.path.join('.');
          errorMap[path] = err.message;
        });
        setErrors(errorMap);
      }
    }
  };

  const updateFormData = (field: keyof AgentFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const addQuery = () => {
    setFormData(prev => ({
      ...prev,
      queries: [...(prev.queries || []), ""]
    }));
  };

  const updateQuery = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      queries: (prev.queries || []).map((q, i) => i === index ? value : q)
    }));
  };

  const removeQuery = (index: number) => {
    setFormData(prev => ({
      ...prev,
      queries: (prev.queries || []).filter((_, i) => i !== index)
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Name */}
        <div className="form-group">
          <label>Ajan Adı</label>
          <input
            type="text"
            value={formData.name || ""}
            onChange={(e) => updateFormData("name", e.target.value)}
            placeholder="Örneğin: Teknoloji Haberleri Ajanı"
          />
          {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name}</p>}
        </div>

        {/* Status */}
        <div className="form-group">
          <label>Durum</label>
          <select
            value={formData.status || "ACTIVE"}
            onChange={(e) => updateFormData("status", e.target.value)}
          >
            <option value="ACTIVE">Aktif</option>
            <option value="PAUSED">Durdurulmuş</option>
          </select>
        </div>
      </div>

      {/* Description */}
      <div className="form-group">
        <label>Açıklama</label>
        <textarea
          value={formData.description || ""}
          onChange={(e) => updateFormData("description", e.target.value)}
          rows={3}
          placeholder="Ajanın ne yaptığını açıklayın..."
        />
        {errors.description && <p className="text-red-400 text-sm mt-1">{errors.description}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cadence */}
        <div className="form-group">
          <label>Kadans</label>
          <input
            type="text"
            value={formData.cadence || ""}
            onChange={(e) => updateFormData("cadence", e.target.value)}
            placeholder="Örneğin: Her gün"
          />
          {errors.cadence && <p className="text-red-400 text-sm mt-1">{errors.cadence}</p>}
        </div>

        {/* Schedule Label */}
        <div className="form-group">
          <label>Zamanlama Etiketi</label>
          <input
            type="text"
            value={formData.scheduleLabel || ""}
            onChange={(e) => updateFormData("scheduleLabel", e.target.value)}
            placeholder="Örneğin: Her gün 09:00"
          />
          {errors.scheduleLabel && <p className="text-red-400 text-sm mt-1">{errors.scheduleLabel}</p>}
        </div>
      </div>

      {/* Default Prompt */}
      <div className="form-group">
        <label>AI Prompt'u</label>
        <textarea
          value={formData.defaultPrompt || ""}
          onChange={(e) => updateFormData("defaultPrompt", e.target.value)}
          rows={6}
          placeholder="AI'ya verilecek talimatları yazın..."
          className="font-mono text-sm"
        />
        {errors.defaultPrompt && <p className="text-red-400 text-sm mt-1">{errors.defaultPrompt}</p>}
      </div>

      {/* Queries */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <label className="text-sm font-medium text-gray-300">
            Arama Sorguları
          </label>
          <button
            type="button"
            onClick={addQuery}
            className="query-add-btn"
          >
            + Sorgu Ekle
          </button>
        </div>

        <div className="query-list">
          {(formData.queries || []).map((query, index) => (
            <div key={index} className="query-item">
              <input
                type="text"
                value={query}
                onChange={(e) => updateQuery(index, e.target.value)}
                placeholder={`Sorgu ${index + 1}`}
              />
              {(formData.queries || []).length > 1 && (
                <button
                  type="button"
                  onClick={() => removeQuery(index)}
                  className="query-remove-btn"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
        {errors.queries && <p className="text-red-400 text-sm mt-1">{errors.queries}</p>}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-4 pt-6 border-t border-gray-700">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2 text-gray-300 hover:text-white transition-colors"
          disabled={isLoading}
        >
          İptal
        </button>
        <button
          type="submit"
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
          disabled={isLoading}
        >
          {isLoading ? "Kaydediliyor..." : submitLabel}
        </button>
      </div>
    </form>
  );
}