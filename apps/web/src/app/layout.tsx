import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SubTrack AI',
  description: 'AI 서비스 구독/크레딧 통합 관리 대시보드',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body
        className={`${inter.className} min-h-screen bg-gray-50 text-gray-900 antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
