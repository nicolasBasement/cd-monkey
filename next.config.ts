import type { NextConfig } from "next";
const nextConfig: NextConfig = { output: "export", devIndicators: false, experimental: { useTypeScriptCli: false, workerThreads: true, cpus: 2 }, images: { unoptimized: true } };
export default nextConfig;
