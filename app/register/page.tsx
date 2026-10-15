'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Bot, Sparkles, Smartphone, Mail, User, ShieldCheck, Lock, Send } from 'lucide-react';
import { demoStore } from '@/lib/store/demo-store';

export default function RegisterPage() {
  const router = useRouter();

  // Personal form fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [telegramUsername, setTelegramUsername] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim() || !email.trim()) {
      setError('Harap lengkapi nama lengkap, email, dan nomor HP/WhatsApp.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Register personal user with status: pending_approval, balance: Rp 0 (FULL KOSONG)
      const cleanTelegram = telegramUsername.replace(/^@/, '').trim();
      const newUser = demoStore.registerUser({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password: password || 'password123',
        telegram_username: cleanTelegram || undefined,
      });

      if (typeof window !== 'undefined') {
        localStorage.setItem('tatadana_pending_verify_user_id', newUser.id);
      }

      // Redirect immediately to real-time verification page
      router.push('/verify');
    } catch (err: any) {
      setError(err.message || 'Gagal mendaftar akun.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0F12] flex flex-col md:flex-row">
      {/* Left Column: Branding Showcase */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-[#14171D] via-[#0D0F12] to-[#181C24] p-12 flex-col justify-between border-r border-[#262C38] relative overflow-hidden">
        <div className="absolute top-1/3 -left-20 w-96 h-96 bg-[#FF6B00]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-2.5 z-10">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#FF6B00] to-[#FFA370] flex items-center justify-center text-white font-bold shadow-lg shadow-[#FF6B00]/30 text-lg">
            ⚡
          </div>
          <span className="text-xl font-extrabold text-white tracking-tight">TataDana</span>
        </div>

        <div className="space-y-6 z-10 my-auto py-12">
          <span className="text-xs font-bold uppercase tracking-wider text-[#FF8533] bg-[#FF6B00]/10 px-3 py-1 rounded-full border border-[#FF6B00]/30 inline-block">
            Pendaftaran Akun Pribadi
          </span>
          <h2 className="text-4xl font-extrabold text-white leading-tight">
            Mulai Catat Keuangan Pribadimu dari Nol Rupiah.
          </h2>
          <p className="text-gray-400 text-sm leading-relaxed max-w-md">
            Daftarkan akun pribadi Anda secara real. Setiap pendaftaran diverifikasi oleh Admin untuk menjaga keamanan privasi data keuangan Anda.
          </p>

          <div className="pt-4 space-y-2 text-xs text-gray-400">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Saldo Awal Rp 0 (Murni kosong tanpa saldo mock)</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#FF8533] shrink-0" />
              <span>Verifikasi Kode Real & Persetujuan Admin</span>
            </div>
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-blue-400 shrink-0" />
              <span>Tersambung langsung ke Bot Telegram</span>
            </div>
          </div>
        </div>

        <div className="text-xs text-gray-500 z-10">
          © 2026 TataDana Indonesia. All rights reserved.
        </div>
      </div>

      {/* Right Column: Personal Registration Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-6">
          <div>
            <h3 className="text-2xl font-bold text-white tracking-tight">Daftar Akun Pribadi</h3>
            <p className="text-xs text-gray-400 mt-1">
              Isi data diri Anda. Akun baru akan dibuat dengan saldo awal Rp 0 dan menunggu persetujuan Admin.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Nama Lengkap</label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nama Lengkap Anda"
                  className="w-full bg-[#14171D] border border-[#262C38] focus:border-[#FF6B00] rounded-xl pl-10 pr-4 py-3 text-white text-sm outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Email Pribadi</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email.anda@domain.com"
                  className="w-full bg-[#14171D] border border-[#262C38] focus:border-[#FF6B00] rounded-xl pl-10 pr-4 py-3 text-white text-sm outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Nomor WhatsApp / HP</label>
              <div className="relative">
                <Smartphone className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+62 812 3456 7890"
                  className="w-full bg-[#14171D] border border-[#262C38] focus:border-[#FF6B00] rounded-xl pl-10 pr-4 py-3 text-white text-sm font-mono outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Kata Sandi</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="w-full bg-[#14171D] border border-[#262C38] focus:border-[#FF6B00] rounded-xl pl-10 pr-4 py-3 text-white text-sm outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Username Telegram <span className="text-gray-500 font-normal">(Opsional)</span>
              </label>
              <div className="relative">
                <Send className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={telegramUsername}
                  onChange={(e) => setTelegramUsername(e.target.value)}
                  placeholder="@username_kamu"
                  className="w-full bg-[#14171D] border border-[#262C38] focus:border-[#FF6B00] rounded-xl pl-10 pr-4 py-3 text-white text-sm outline-none"
                />
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                Untuk sinkronisasi pencatatan bot Telegram ke dompet Anda
              </p>
            </div>

            {/* Saldo Rp 0 Info Box */}
            <div className="p-3 bg-[#181C24] rounded-xl border border-[#262C38] flex items-center justify-between text-xs">
              <span className="text-gray-400">Saldo Awal Akun:</span>
              <span className="font-bold text-emerald-400 font-mono">Rp 0 (Full Nol)</span>
            </div>

            <Button type="submit" isLoading={isLoading} className="w-full" size="lg">
              Daftar & Lanjut ke Verifikasi Admin
            </Button>
          </form>

          <div className="text-center pt-2 space-y-2">
            <p className="text-xs text-gray-400">
              Sudah punya akun?{' '}
              <Link href="/login" className="text-[#FF8533] hover:underline font-semibold">
                Masuk di sini
              </Link>
            </p>

            <div className="pt-4 border-t border-[#262C38]/60">
              <Link
                href="/admin"
                className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors"
              >
                Khusus Pemilik: Buka Portal Admin (/admin) →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
