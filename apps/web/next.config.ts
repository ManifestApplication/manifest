import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow the dev server's HMR/resources to be loaded from the LAN IP (e.g. when
  // testing on a phone on the same Wi-Fi). Dev-only; ignored in production.
  allowedDevOrigins: ["192.168.8.105"],
  // Pin the workspace root so Turbopack doesn't wander up to a stray
  // lockfile in the home directory. Points at the manifest/ root.
  turbopack: {
    root: path.join(__dirname, "..", ".."),
  },
};

export default nextConfig;
