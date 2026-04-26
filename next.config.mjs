/** @type {import('next').NextConfig} */
const nextConfig = {
  // Include font files in the serverless function bundle for Vercel
  outputFileTracingIncludes: {
    "/api/reports/\\[id\\]/download": ["./src/fonts/**/*"],
  },
};

export default nextConfig;
