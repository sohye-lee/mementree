import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // pin the workspace root to this project so turbopack stops picking up
  // an unrelated lockfile in /Users/sohye/.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
