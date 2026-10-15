'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Bot,
  Sparkles,
  Zap,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Receipt,
  Mic,
  Camera,
  Target,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  Star,
  Smartphone,
  Wallet,
  ArrowUpRight,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { TelegramSimulator } from '@/components/simulator/TelegramSimulator';

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const toggleFaq = (idx: number) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  const faqs = [
    {
      q: 'Bagaimana cara kerja TataDana dengan Telegram Bot?',
      a: 'Setelah mendaftar, kamu cukup menghubungkan bot Telegram TataDana atau bot buatanmu sendiri via @BotFather. Kapan pun kamu jajan atau terima uang, cukup ketik di chat (misal: "beli kopi 25rb" atau "gajian 10jt"). Bot menggunakan AI canggih untuk mengekstrak nominal, kategori, dan mencatatnya ke dompet pilihanmu.',
    },
    {
      q: 'Apakah saya bisa mengirim foto struk belanjaan fisik?',
      a: 'Bisa! Di paket TataDana Pro, kamu cukup memotret struk belanja (seperti Indomaret, Alfamart, supermarket, resto) dan kirim ke bot. AI Vision akan otomatis membaca nama merchant, total belanja, dan merinci setiap item ke dalam riwayat transaksimu.',
    },
    {
      q: 'Apakah bisa input lewat pesan suara / voice note?',
      a: 'Bisa banget! Kirim voice note Telegram seperti "GoCar dari kantor ke stasiun 32 ribu". Fitur Speech-to-Text kami akan mentranskrip suara dan mencatat transaksinya seketika.',
    },
    {
      q: 'Apakah data keuangan saya aman di Supabase?',
      a: '100% aman. Data keuangan disimpan dalam database PostgreSQL privat yang dienkripsi menggunakan Row-Level Security (RLS) Supabase. Kami tidak pernah membagikan atau menjual data transaksi kamu ke pihak ketiga.',
    },
    {
      q: 'Bagaimana sistem pembayaran paket Pro?',
      a: 'Paket Pro tersedia dengan opsi bayar sekali untuk akses seumur hidup (Rp99.000 Lifetime Deal) melalui Payment Gateway Midtrans (QRIS, GoPay, BCA VA, ShopeePay) atau konfirmasi transfer manual.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#0D0F12] text-white selection:bg-[#FF6B00]/30 selection:text-[#FF6B00]">
      {/* 1. NAVBAR */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0D0F12]/80 backdrop-blur-md border-b border-[#262C38]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#FF6B00] to-[#FFA370] flex items-center justify-center text-white font-bold shadow-md shadow-[#FF6B00]/30">
              ⚡
            </div>
            <span className="text-lg font-extrabold tracking-tight text-white">TataDana</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-gray-300">
            <a href="#fitur" className="hover:text-white transition-colors">
              Fitur Utama
            </a>
            <a href="#simulator" className="hover:text-white transition-colors">
              Coba Simulator
            </a>
            <a href="#harga" className="hover:text-white transition-colors">
              Paket & Harga
            </a>
            <a href="#faq" className="hover:text-white transition-colors">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Masuk
              </Button>
            </Link>
            <Link href="/register">
              <Button variant="primary" size="sm">
                Mulai Gratis
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        {/* Glow background elements */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-[#FF6B00]/15 rounded-full blur-[140px] pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#181C24] border border-[#262C38] text-xs font-semibold text-[#FF8533] shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-[#FF6B00]" />
            <span>Fintech Personal Finance #1 di Indonesia</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Catat Keuangan Semudah Chat —{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF6B00] via-[#FFA370] to-[#FF8533]">
              Langsung dari Telegram Kamu
            </span>
          </h1>

          <p className="text-base sm:text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
            TataDana adalah aplikasi manajemen keuangan pribadi yang terintegrasi dengan Telegram Bot.
            Ketik bahasa santai seperti <code className="text-white bg-[#181C24] px-2 py-0.5 rounded border border-[#262C38]">&quot;beli bakso 15rb&quot;</code> atau kirim foto struk, semua otomatis tersinkron ke dashboard laporan web.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto text-sm px-8" icon={<ArrowRight className="w-4 h-4" />}>
                Mulai Catat Sekarang (Gratis)
              </Button>
            </Link>
            <a href="#simulator" className="w-full sm:w-auto">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto text-sm px-6" icon={<Bot className="w-4 h-4 text-[#FF8533]" />}>
                Uji Coba di Simulator
              </Button>
            </a>
          </div>

          <div className="pt-6 flex items-center justify-center gap-8 text-xs text-gray-400">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> 100% Bahasa Indonesia
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Tanpa Instalasi Aplikasi Tambahan
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Database Supabase RLS
            </span>
          </div>
        </div>

        {/* Interactive Simulator & Dashboard Preview Embed */}
        <div id="simulator" className="max-w-6xl mx-auto mt-16 relative z-10">
          <div className="p-3 bg-[#181C24] border border-[#262C38] rounded-3xl shadow-2xl">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
              {/* Simulator on Left */}
              <div className="lg:col-span-6 p-2">
                <TelegramSimulator compact={true} />
              </div>

              {/* Live Dashboard Mockup Snapshot on Right */}
              <div className="lg:col-span-6 p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant="orange" size="md">
                    LIVE DASHBOARD PREVIEW
                  </Badge>
                  <span className="text-xs text-gray-400">Terupdate otomatis saat chat</span>
                </div>

                <h3 className="text-2xl font-bold text-white tracking-tight">
                  Ketik di Telegram, Monitor Lengkap di Web Dashboard
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Semua transaksi yang kamu ketikkan di simulator sebelah kiri langsung memotong saldo dompetmu, menghitung persentase budget bulanan, dan masuk ke laporan siap cetak!
                </p>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3 bg-[#11141A] rounded-xl border border-[#262C38]">
                    <span className="text-[10px] text-gray-500 uppercase font-semibold">Total Saldo Terhitung</span>
                    <p className="text-lg font-bold font-mono text-white mt-1">Rp 14.835.000</p>
                  </div>
                  <div className="p-3 bg-[#11141A] rounded-xl border border-[#262C38]">
                    <span className="text-[10px] text-gray-500 uppercase font-semibold">Alert Budget Makanan</span>
                    <p className="text-lg font-bold font-mono text-[#FF8533] mt-1">82.8% Terpakai</p>
                  </div>
                </div>

                <div className="pt-2">
                  <Link href="/dashboard">
                    <Button variant="secondary" size="md" className="w-full" icon={<ArrowUpRight className="w-4 h-4 text-[#FF8533]" />}>
                      Buka Dashboard Lengkap
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. PROBLEM & SOLUTION */}
      <section className="py-20 px-6 bg-[#11141A] border-y border-[#262C38]">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-bold text-white tracking-tight">
              Kenapa Banyak Orang Gagal Mengelola Keuangan?
            </h2>
            <p className="text-xs text-gray-400 max-w-xl mx-auto">
              Masalah klasik karyawan & anak muda di Indonesia yang membuat gaji cepat habis tanpa jejak.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6 space-y-3 border-rose-500/20 bg-rose-500/[0.02]">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center font-bold text-base">
                1
              </div>
              <h4 className="font-bold text-base text-white">Aplikasi Biasa Terlalu Ribet</h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                Harus buka aplikasi, pilih akun, pilih tanggal, pilih kategori bertingkat. Akhirnya malas dan lupa mencatat setelah beberapa hari.
              </p>
            </Card>

            <Card className="p-6 space-y-3 border-rose-500/20 bg-rose-500/[0.02]">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center font-bold text-base">
                2
              </div>
              <h4 className="font-bold text-base text-white">Struk Kertas Menumpuk</h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                Struk belanja mingguan atau makan di resto menumpuk di dompet sampai tintanya pudar dan tidak pernah dihitung.
              </p>
            </Card>

            <Card className="p-6 space-y-3 border-[#FF6B00]/30 bg-[#FF6B00]/[0.02]">
              <div className="w-10 h-10 rounded-xl bg-[#FF6B00]/15 text-[#FF8533] flex items-center justify-center font-bold text-base">
                ⚡
              </div>
              <h4 className="font-bold text-base text-white">Solusi TataDana</h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                Cukup buka Telegram yang tiap hari kamu pakai. Ketik pesan natural atau foto struknya dalam 3 detik, AI kami yang selesaikan sisanya.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* 4. FITUR UTAMA */}
      <section id="fitur" className="py-24 px-6">
        <div className="max-w-6xl mx-auto space-y-16">
          <div className="text-center space-y-3">
            <Badge variant="orange" size="md">
              FITUR UNGGULAN
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              Semua yang Kamu Butuhkan untuk Bebas Finansial
            </h2>
            <p className="text-xs text-gray-400 max-w-xl mx-auto">
              Dibangun khusus untuk kebiasaan dan format finansial masyarakat Indonesia.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="p-6 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#FF6B00]/15 text-[#FF8533] flex items-center justify-center">
                <Bot className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-white">Parsing Teks Natural Indonesia</h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                Paham format uang lokal: &quot;15rb&quot;, &quot;1.5jt&quot;, &quot;500k&quot;, &quot;25ribu&quot;, hingga bahasa gaul tanpa perlu regex kaku.
              </p>
            </Card>

            <Card className="p-6 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/15 text-blue-400 flex items-center justify-center">
                <Camera className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-white">Scan Struk Belanja (Vision AI)</h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                Foto struk minimarket atau restoran, AI Vision mengekstrak merchant, total, dan rincian per barang secara otomatis.
              </p>
            </Card>

            <Card className="p-6 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                <Mic className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-white">Input via Voice Note (Audio)</h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                Sedang menyetir atau jalan kaki? Kirim voice note ke bot, suara ditranskrip dan dicatat tanpa perlu mengetik satu huruf pun.
              </p>
            </Card>

            <Card className="p-6 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/15 text-purple-400 flex items-center justify-center">
                <Wallet className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-white">Multi-Dompet & Transfer</h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                Kelola BCA, Mandiri, Cash, GoPay, dan akun investasi dalam satu tempat dengan dukungan transfer antar dompet.
              </p>
            </Card>

            <Card className="p-6 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-400 flex items-center justify-center">
                <Target className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-white">Alert Budget 80% & 100%</h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                Bot mengirimkan peringatan visual langsung di Telegram saat pos budget makanan atau hiburanmu mendekati batas kritis.
              </p>
            </Card>

            <Card className="p-6 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-white">Export PDF & Excel (.xlsx)</h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                Cetak laporan keuangan formal atau download spreadsheet untuk pembukuan dan arsip pajak kapan saja.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* 5. PRICING */}
      <section id="harga" className="py-20 px-6 bg-[#11141A] border-y border-[#262C38]">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <Badge variant="orange" size="md">
              PILIHAN PAKET
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              Investasi Kecil untuk Keuangan Teratur
            </h2>
            <p className="text-xs text-gray-400">
              Pilih paket yang paling sesuai dengan kebutuhan pencatatan harianmu.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto items-stretch">
            {/* Starter Plan */}
            <Card className="p-8 flex flex-col justify-between">
              <div>
                <h4 className="text-lg font-bold text-white">Starter Plan</h4>
                <p className="text-xs text-gray-400 mt-1">Cocok untuk pemula yang ingin coba kemudahan bot</p>

                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold font-mono text-white">Rp 49.000</span>
                  <span className="text-xs text-gray-400">/ bulan</span>
                </div>

                <div className="mt-8 space-y-3 text-xs text-gray-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Maksimal 50 transaksi / bulan</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Input teks natural Telegram Bot</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Input pesan suara / Voice Note</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Multi-dompet (hingga 3 dompet)</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500">
                    <span>✕ Tidak termasuk Scan Struk Foto Vision</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500">
                    <span>✕ Tidak termasuk AI Financial Advisor</span>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <Link href="/register">
                  <Button variant="secondary" size="lg" className="w-full">
                    Pilih Paket Starter
                  </Button>
                </Link>
              </div>
            </Card>

            {/* Pro Plan (Best Value / Recommended) */}
            <Card className="p-8 flex flex-col justify-between border-[#FF6B00] ring-1 ring-[#FF6B00]/40 relative overflow-hidden bg-gradient-to-b from-[#181C24] to-[#14171D]">
              <div className="absolute top-0 right-0 bg-[#FF6B00] text-white text-[10px] font-extrabold px-3 py-1 rounded-bl-xl uppercase tracking-wider">
                PALING POPULER
              </div>

              <div>
                <h4 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>TataDana Pro</span>
                  <Star className="w-4 h-4 fill-[#FF8533] text-[#FF8533]" />
                </h4>
                <p className="text-xs text-gray-400 mt-1">Akses penuh fitur AI & tanpa batas transaksi</p>

                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold font-mono text-[#FF8533]">Rp 99.000</span>
                  <span className="text-xs text-gray-400">Sekali Bayar (Lifetime Deal)</span>
                </div>

                <div className="mt-8 space-y-3 text-xs text-gray-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#FF8533] shrink-0" />
                    <span className="font-semibold text-white">Transaksi Tanpa Batas (Unlimited)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#FF8533] shrink-0" />
                    <span>Scan Foto Struk Belanja (Vision AI)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#FF8533] shrink-0" />
                    <span>AI Financial Advisor & Prediksi Budget</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#FF8533] shrink-0" />
                    <span>Export Laporan ke PDF & Excel (.xlsx)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#FF8533] shrink-0" />
                    <span>Multi-Dompet Tak Terbatas + Transfer</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#FF8533] shrink-0" />
                    <span>Peringatan Alert Budget 80% & 100% di Telegram</span>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <Link href="/register">
                  <Button variant="primary" size="lg" className="w-full">
                    Ambil Promo Pro Rp 99.000
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* 6. FAQ */}
      <section id="faq" className="py-20 px-6">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold text-white">Pertanyaan Sering Diajukan</h2>
            <p className="text-xs text-gray-400">Semua yang perlu kamu ketahui tentang TataDana</p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <Card
                key={idx}
                className="p-5 cursor-pointer hover:border-[#FF6B00]/40 transition-colors"
                onClick={() => toggleFaq(idx)}
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white">{faq.q}</h4>
                  {openFaq === idx ? (
                    <ChevronUp className="w-4 h-4 text-[#FF8533]" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </div>
                {openFaq === idx && (
                  <p className="text-xs text-gray-400 mt-3 leading-relaxed border-t border-[#262C38] pt-3 animate-in fade-in duration-200">
                    {faq.a}
                  </p>
                )}
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 7. FOOTER */}
      <footer className="py-12 px-6 bg-[#0D0F12] border-t border-[#262C38] text-xs text-gray-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#FF6B00] flex items-center justify-center text-white font-bold">
              ⚡
            </div>
            <span className="font-extrabold text-white text-sm">TataDana</span>
            <span className="text-[11px] text-gray-400 ml-2">
              — Catat keuangan semudah chat langsung dari Telegram kamu.
            </span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/login" className="hover:text-white transition-colors">
              Masuk
            </Link>
            <Link href="/register" className="hover:text-white transition-colors">
              Daftar
            </Link>
            <Link href="/dashboard" className="hover:text-white transition-colors">
              Dashboard
            </Link>
            <Link href="/admin" className="hover:text-white transition-colors">
              Admin Portal
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
