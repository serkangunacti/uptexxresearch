import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: __dirname,
  },
  // Include font files in the serverless function bundle for Vercel
  outputFileTracingIncludes: {
    "/api/reports/\\[id\\]/download": ["./src/fonts/**/*", "./public/uptexx-logo.png"],
  },
};

export default nextConfig;
