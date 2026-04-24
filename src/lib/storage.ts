import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { env } from "./env";

export async function ensureReportStorage() {
  await mkdir(env.REPORT_STORAGE_DIR, { recursive: true });
}

export function reportPaths(agentId: string, runId: string) {
  const safeName = `${new Date().toISOString().slice(0, 10)}-${agentId}-${runId}`;
  const htmlName = `${safeName}.html`;
  const pdfName = `${safeName}.pdf`;

  return {
    htmlName,
    pdfName,
    htmlPath: join(env.REPORT_STORAGE_DIR, htmlName),
    pdfPath: join(env.REPORT_STORAGE_DIR, pdfName),
    publicUrl: `${env.APP_PUBLIC_URL.replace(/\/$/, "")}/reports/${pdfName}`
  };
}
