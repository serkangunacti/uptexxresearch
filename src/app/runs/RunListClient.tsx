"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DeleteRunButton } from "../DeleteRunButton";

type RunWithAgent = {
  id: string;
  status: string;
  createdAt: Date;
  agent: { name: string };
};

export function RunListClient({ runs }: { runs: RunWithAgent[] }) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  const toggleSelectAll = () => {
    if (selectedIds.length === runs.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(runs.map(r => r.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`${selectedIds.length} adet geçmiş kaydını silmek istediğinize emin misiniz?`)) return;

    setIsDeleting(true);
    try {
      const res = await fetch("/api/runs/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });
      
      if (res.ok) {
        setSelectedIds([]);
        router.refresh();
      } else {
        alert("Toplu silme işleminde hata oluştu.");
      }
    } catch (err) {
      console.error(err);
      alert("Bir hata oluştu.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="list-controls">
        <label className="checkbox-label">
          <input 
            type="checkbox" 
            checked={runs.length > 0 && selectedIds.length === runs.length}
            onChange={toggleSelectAll}
            disabled={runs.length === 0 || isDeleting}
          />
          <span className="checkbox-text">Tümünü Seç</span>
        </label>
        
        {selectedIds.length > 0 && (
          <button 
            className="bulk-delete-btn" 
            onClick={handleBulkDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "Siliniyor..." : `Seçilenleri Sil (${selectedIds.length})`}
          </button>
        )}
      </div>

      <div className="panel" style={{ marginTop: "1rem" }}>
        <div className="panel-header">
          <h3>Geçmiş</h3>
          <span className="count">{runs.length}</span>
        </div>
        {runs.length === 0 ? (
          <p className="empty-state">Henüz çalışma yok.</p>
        ) : (
          runs.map((run) => (
            <div className="run-item" key={run.id}>
              <div className="run-checkbox">
                <input 
                  type="checkbox" 
                  checked={selectedIds.includes(run.id)}
                  onChange={() => toggleSelect(run.id)}
                  disabled={isDeleting}
                />
              </div>
              <span className={`run-dot ${run.status.toLowerCase()}`} />
              <div className="run-info">
                <p className="run-agent">{run.agent.name}</p>
                <p className="run-meta">{new Date(run.createdAt).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })}</p>
              </div>
              <span className={`run-status-tag ${run.status.toLowerCase()}`}>
                {run.status}
              </span>
              <div className="run-actions">
                <DeleteRunButton runId={run.id} />
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
