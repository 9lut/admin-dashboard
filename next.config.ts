import type { NextConfig } from "next";


const nextConfig: NextConfig = {
  // `/api/*` is now served by this app's own Route Handlers (backend merged in),
  // so the old rewrite to the standalone NestJS backend is removed.

  // Keep native/dynamic-require packages out of the webpack bundle — bundling
  // firebase-admin/sharp breaks them at runtime on Vercel (500 on every route).
  serverExternalPackages: ['firebase-admin', '@google-cloud/firestore', 'sharp'],

  // import เฉพาะไอคอน/ฟังก์ชันที่ใช้จริง (ลดขนาด bundle หน้าแอดมิน)
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', 'date-fns', '@tiptap/react'],
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.r2.dev',
      },
      {
        protocol: 'https',
        hostname: '**.fbcdn.net',
      },
      {
        protocol: 'https',
        hostname: '**.facebook.com',
      },
    ],
  },
};

export default nextConfig;

