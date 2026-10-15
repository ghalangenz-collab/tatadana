import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TataDana — Catat Keuangan Semudah Chat Langsung dari Telegram Kamu',
  description: 'Aplikasi manajemen keuangan pribadi yang terintegrasi dengan Telegram Bot. Catat pemasukan dan pengeluaran dengan bahasa santai, scan foto struk, dan monitor dashboard real-time.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400;1,600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#0D0F12] text-[#F1F5F9] min-h-screen antialiased font-sans selection:bg-[#2563EB]/40 selection:text-white">
        {children}
      </body>
    </html>
  );
}
