'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Bot, Smartphone, Mail, Lock, ShieldCheck, ArrowRight, AlertCircle, ShieldAlert } from 'lucide-react';
import { demoStore } from '@/lib/store/demo-store';

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setError('Nomor HP, WhatsApp, atau Email wajib diisi.');
      return;
    }

    setIsLoading(true);
    setError('');

    const res = demoStore.loginUser(identifier.trim(), password);
    if (!res.success || !res.user) {
      setError(res.error || 'Akun tidak ditemukan. Silakan mendaftar akun pribadi terlebih dahulu.');
      setIsLoading(false);
      return;
    }

    const user = res.user;

    // Check approval & verification status
    if (user.status !== 'approved' || !user.is_verified) {
      // Direct user to verify page
      router.push('/verify');
      return;
    }

    // Verified & approved user can enter dashboard
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-[#0D0F12] flex flex-col md:flex-row">
      {/* Left Column: Branding Showcase */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-[#14171D] via-[#0D0F12] to-[#181C24] p-12 flex-col justify-between border-r border-[#262C38] relative overflow-hidden">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-[#FF6B00]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-2.5 z-10">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#FF6B00] to-[#FFA370] flex items-center justify-center text-white font-bold shadow-lg shadow-[#FF6B00]/30 text-lg">
            ⚡
          </div>
          <span className="text-xl font-extrabold text-white tracking-tight">TataDana</span>
        </div>

        <div className="space-y-6 z-10 my-auto py-12">
          <span className="text-xs font-bold uppercase tracking-wider text-[#FF8533] bg-[#FF6B00]/10 px-3 py-1 rounded-full border border-[#FF6B00]/30 inline-block">
            Portal Pengguna Pribadi
          </span>
          <h2 className="text-4xl font-extrabold text-white leading-tight">
            Catat Keuangan Pribadimu Semudah Chat Langsung.
          </h2>
          <p className="text-gray-400 text-sm leading-relaxed max-w-md">
            Gunakan akun pribadi Anda untuk mencatat seluruh pengeluaran dan pemasukan dengan saldo awal Rp 0 yang bersih dan akurat.
          </p>

          <div className="pt-4 flex items-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Verifikasi Persetujuan Admin
            </span>
            <span className="flex items-center gap-1.5">
              <Bot className="w-4 h-4 text-[#FF8533]" /> AI Real-Time Parser
            </span>
          </div>
        </div>

        <div className="text-xs text-gray-500 z-10">
          © 2026 TataDana Indonesia. All rights reserved.
        </div>
      </div>

      {/* Right Column: Personal Auth Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center md:text-left">
            <h3 className="text-2xl font-bold text-white tracking-tight">Masuk Akun Pribadi</h3>
            <p className="text-xs text-gray-400 mt-1">
              Gunakan Email atau Nomor HP yang Anda daftarkan
            </p>
          </div>

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Email atau No HP / WhatsApp
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="email.anda@domain.com atau 08123456789"
                  className="w-full bg-[#14171D] border border-[#262C38] focus:border-[#FF6B00] rounded-xl pl-10 pr-4 py-3 text-white text-sm outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-gray-300">Kata Sandi</label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi akun"
                  className="w-full bg-[#14171D] border border-[#262C38] focus:border-[#FF6B00] rounded-xl pl-10 pr-4 py-3 text-white text-sm outline-none"
                />
              </div>
            </div>

            <Button type="submit" isLoading={isLoading} className="w-full" size="lg">
              Masuk ke Akun
            </Button>
          </form>

          {/* Registration link */}
          <div className="text-center pt-2 space-y-3">
            <p className="text-xs text-gray-400">
              Belum punya akun pribadi?{' '}
              <Link href="/register" className="text-[#FF8533] hover:underline font-semibold">
                Daftar Akun Baru (Saldo Rp 0)
              </Link>
            </p>

            <div className="pt-4 border-t border-[#262C38]/60">
              <Link
                href="/admin"
                className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors font-semibold bg-blue-500/10 hover:bg-blue-500/20 px-3 py-1.5 rounded-xl border border-blue-500/20"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-blue-400" />
                <span>Khusus Pemilik: Masuk Link Admin (/admin)</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
