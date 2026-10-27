import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Лого, тоглогчийн зураг upload хийхэд server action-ийн body хязгаарыг нэмэгдүүлнэ
  experimental: {
    serverActions: { bodySizeLimit: '10mb' },
  },
  // exceljs нь node-only сан — bundle хийхгүй
  serverExternalPackages: ['exceljs', 'pg'],
  poweredByHeader: false,
};

export default nextConfig;
