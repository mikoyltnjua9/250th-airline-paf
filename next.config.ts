import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Pin explicitly — otherwise Turbopack walks up looking for a lockfile
    // and can land on an unrelated one outside this repo.
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
