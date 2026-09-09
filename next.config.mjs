import path from "node:path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // A sibling project's lockfile in the parent directory otherwise makes Next.js misdetect
  // the workspace root; pin it explicitly to this repo.
  outputFileTracingRoot: path.resolve(import.meta.dirname),
};

export default nextConfig;
