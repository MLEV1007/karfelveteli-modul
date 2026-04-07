import os from 'os'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // distDir outside Google Drive to avoid file locking issues during dev
  distDir: `${os.homedir()}/.next-m1szerviz`,
  experimental: {
    serverComponentsExternalPackages: ["@react-pdf/renderer"],
  },
}

export default nextConfig
