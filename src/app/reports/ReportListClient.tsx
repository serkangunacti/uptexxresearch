"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DeleteRunButton } from "../DeleteRunButton";
import { ConfirmModal } from "../ConfirmModal";

type ReportWithAgent = {
  id: string;
  title: string;
  createdAt: Date;
  runId: string | null;
  agent: { name: string };
};

const READ_KEY = "uptexx_read_reports";

function getReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function markRead(id: string) {
  try {
    const set = getReadIds();
    set.add(id);
    localStorage.setItem(READ_KEY, JSON.stringify([...set]));
  } catch {}
}

export function ReportListClient({ reports }: { reports: ReportWithAgent[] }) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  // Track read state client-side (localStorage)
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    return getReadIds();
  });

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

  const handleReportClick = (id: string) => {
    markRead(id);
    setReadIds(getReadIds());
  };

  const handleBulkDeleteRequest = () => {
    if (selectedIds.length === 0) return;
    setShowModal(true);
  };

  const handleConfirmDelete = useCallback(async () => {
    setIsDeleting(true);
    try {
      const res = await fetch("/api/reports/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });

      if (res.ok) {
        setSelectedIds([]);
        setShowModal(false);
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
  }, [selectedIds, router]);

  const handleCancelDelete = useCallback(() => {
    if (!isDeleting) setShowModal(false);
  }, [isDeleting]);

  return (
    <>
      <ConfirmModal
        isOpen={showModal}
        count={selectedIds.length}
        entityLabel="raporu"
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />

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
            onClick={handleBulkDeleteRequest}
            disabled={isDeleting}
          >
            Seçilenleri Sil ({selectedIds.length})
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
          reports.map((report) => {
            const isRead = readIds.has(report.id);
            return (
              <div className={`run-item report-row ${isRead ? "report-read" : "report-unread"}`} key={report.id}>
                <div className="run-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(report.id)}
                    onChange={() => toggleSelect(report.id)}
                    disabled={isDeleting}
                  />
                </div>
                <span className="run-dot" style={{ background: isRead ? "var(--text-dim)" : "var(--accent)" }} />
                <div className="run-info" style={{ flex: 1 }}>
                  <Link
                    href={`/reports/${report.id}`}
                    style={{ textDecoration: "none", color: "inherit", display: "block" }}
                    onClick={() => handleReportClick(report.id)}
                  >
                    <p className="run-agent">{report.agent.name}</p>
                    <p className={`report-title-text ${isRead ? "" : "report-title-unread"}`}>
                      {!isRead && <span className="unread-dot" />}
                      {report.title}
                    </p>
                    <p className="run-meta">{new Date(report.createdAt).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })}</p>
                  </Link>
                </div>
                {isRead && <span className="read-badge">Okundu</span>}
                <div className="run-actions">
                  {report.runId && <DeleteRunButton runId={report.runId} />}
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
