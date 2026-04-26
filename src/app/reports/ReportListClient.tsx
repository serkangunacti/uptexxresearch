"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DeleteRunButton } from "../DeleteRunButton";

type ReportWithAgent = {
  id: string;
  title: string;
  createdAt: Date;
  runId: string | null;
  agent: { name: string };
};

export function ReportListClient({ reports }: { reports: ReportWithAgent[] }) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  const toggleSelectAll = () => {
    if (selectedIds.length === reports.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(reports.map(r => r.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`${selectedIds.length} adet raporu silmek istediğinize emin misiniz?`)) return;

    setIsDeleting(true);
    try {
      const res = await fetch("/api/reports/bulk-delete", {
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
            checked={reports.length > 0 && selectedIds.length === reports.length}
            onChange={toggleSelectAll}
            disabled={reports.length === 0 || isDeleting}
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
          <h3>Rapor Arşivi</h3>
          <span className="count">{reports.length}</span>
        </div>
        {reports.length === 0 ? (
          <p className="empty-state">Henüz rapor oluşmadı.</p>
        ) : (
          reports.map((report) => (
            <div className="run-item" key={report.id}>
              <div className="run-checkbox">
                <input 
                  type="checkbox" 
                  checked={selectedIds.includes(report.id)}
                  onChange={() => toggleSelect(report.id)}
                  disabled={isDeleting}
                />
              </div>
              <span className="run-dot" style={{ background: "var(--accent)" }} />
              <div className="run-info" style={{ flex: 1 }}>
                <Link href={`/reports/${report.id}`} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                  <p className="run-agent">{report.agent.name}</p>
                  <p style={{ margin: "4px 0", color: "var(--text-primary)", fontWeight: 500 }}>{report.title}</p>
                  <p className="run-meta">{new Date(report.createdAt).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })}</p>
                </Link>
              </div>
              <div className="run-actions">
                {report.runId && <DeleteRunButton runId={report.runId} />}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
