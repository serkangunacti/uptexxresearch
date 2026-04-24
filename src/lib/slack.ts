import { readFile, stat } from "node:fs/promises";
import { basename } from "node:path";
import { WebClient } from "@slack/web-api";
import { env, slackIsConfigured } from "./env";
import type { GeneratedReport } from "./types";

type SlackDeliveryInput = {
  agentName: string;
  report: GeneratedReport;
  pdfPath: string;
  publicUrl: string;
};

export async function deliverReportToSlack(input: SlackDeliveryInput) {
  if (!slackIsConfigured()) {
    console.info("[slack] dry run; set SLACK_DRY_RUN=false, SLACK_BOT_TOKEN and SLACK_CHANNEL_ID to enable delivery.");
    return { dryRun: true };
  }

  const client = new WebClient(env.SLACK_BOT_TOKEN);
  const topFindings = input.report.findings.slice(0, 3);

  const message = await client.chat.postMessage({
    channel: env.SLACK_CHANNEL_ID,
    text: `${input.agentName}: ${input.report.title}`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: input.report.title.slice(0, 150),
          emoji: false
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${input.agentName}*\n${input.report.summary}\n\n<${input.publicUrl}|VPS uzerinden PDF indir>`
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text:
            topFindings.length > 0
              ? topFindings.map((finding) => `• *${escapeMrkdwn(finding.title)}*`).join("\n")
              : "Bulgular PDF icinde."
        }
      }
    ]
  });

  const uploaded = await uploadPdfToSlack({
    client,
    pdfPath: input.pdfPath,
    title: input.report.title,
    threadTs: message.ts
  });

  return {
    dryRun: false,
    messageTs: message.ts,
    fileId: uploaded.fileId
  };
}

async function uploadPdfToSlack(input: {
  client: WebClient;
  pdfPath: string;
  title: string;
  threadTs?: string;
}) {
  const filename = basename(input.pdfPath);
  const fileStats = await stat(input.pdfPath);

  const uploadRequest = await input.client.files.getUploadURLExternal({
    filename,
    length: fileStats.size,
    alt_text: input.title
  } as any);

  const uploadUrl = uploadRequest.upload_url;
  const fileId = uploadRequest.file_id;
  if (!uploadUrl || !fileId) {
    throw new Error("Slack did not return an upload URL or file id.");
  }

  const body = await readFile(input.pdfPath);
  const uploadResponse = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(fileStats.size)
    },
    body
  });

  if (!uploadResponse.ok) {
    throw new Error(`Slack upload URL returned ${uploadResponse.status}`);
  }

  await input.client.files.completeUploadExternal({
    channel_id: env.SLACK_CHANNEL_ID,
    initial_comment: "PDF raporu ektedir. Slack icinden indirebilir veya VPS linkini kullanabilirsin.",
    thread_ts: input.threadTs,
    files: [
      {
        id: fileId,
        title: filename
      }
    ]
  } as any);

  return { fileId };
}

function escapeMrkdwn(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
