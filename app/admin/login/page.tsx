'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { demoStore } from '@/lib/store/demo-store';
import { ShieldAlert, Lock, User, Phone, CheckCircle2, ArrowRight } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('Muhammad Ghalan');
  const [password, setPassword] = useState('ghalan123');
  const [whatsapp, setWhatsapp] = useState('6285156847921');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    demoStore.initFromClientStorage(true);
    if (demoStore.isAdminAuthenticated()) {
      router.push('/admin');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const cleanId = identifier.trim() || 'Muhammad Ghalan';
      const cleanPass = password.trim() || 'ghalan123';
      const cleanWa = whatsapp.trim().replace(/[^\d+]/g, '') || '6285156847921';

      // 1. Authenticate in demoStore
      const res = demoStore.loginAdmin(cleanId, cleanPass);
      if (!res.success) {
        setError(res.error || 'Kata sandi atau nama admin salah.');
        setIsLoading(false);
        return;
      }

      // 2. Set WhatsApp admin to 6285156847921
      demoStore.setAdminWhatsApp(cleanWa);

      // 3. Sync config to server network
      try {
        await fetch('/api/admin/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ adminWhatsApp: cleanWa }),
        });
      } catch (err) {
        console.warn('Config sync warning:', err);
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/admin');
      }, 500);
    } catch (err: any) {
      setError(err.message || 'Gagal login admin');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0F12] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-1/3 -left-20 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 -right-20 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6 z-10">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold text-2xl shadow-lg shadow-blue-500/20">
            <ShieldAlert className="w-7 h-7 text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Login Admin TataDana</h2>
          <p className="text-xs text-gray-400">
            Portal khusus Admin & Pemilik sistem. Kelola persetujuan akun, buat kode verifikasi real, dan pantau AI.
          </p>
        </div>

        <Card className="p-6 sm:p-8 bg-[#14171D] border-[#262C38] space-y-5">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Login berhasil! Mengalihkan ke Portal Admin...</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Nama Akun / Email Admin
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Muhammad Ghalan"
                  className="w-full bg-[#181C24] border border-[#262C38] focus:border-blue-500 rounded-xl pl-10 pr-4 py-2.5 text-white text-xs outline-none"
                />
              </div>
              <p className="text-[11px] text-gray-500 mt-1">Nama akun admin: <code>Muhammad Ghalan</code></p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Kata Sandi Admin
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="ghalan123"
                  className="w-full bg-[#181C24] border border-[#262C38] focus:border-blue-500 rounded-xl pl-10 pr-4 py-2.5 text-white text-xs outline-none"
                />
              </div>
              <p className="text-[11px] text-gray-500 mt-1">Password admin: <code>ghalan123</code></p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Nomor WhatsApp Admin (Untuk Support & Verifikasi User)
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-emerald-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="6285156847921"
                  className="w-full bg-[#181C24] border border-[#262C38] focus:border-emerald-500 rounded-xl pl-10 pr-4 py-2.5 text-emerald-300 font-mono text-xs outline-none"
                />
              </div>
              <p className="text-[11px] text-emerald-400/80 mt-1">Nomor WhatsApp aktif: <code>6285156847921</code></p>
            </div>

            <Button
              type="submit"
              variant="primary"
              isLoading={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-500 border-none font-bold text-xs py-3"
            >
              Masuk Portal Admin (/admin)
            </Button>
          </form>

          <div className="pt-3 border-t border-[#262C38] flex items-center justify-between text-xs text-gray-400">
            <Link href="/login" className="hover:text-white transition-colors">
              ← Kembali ke Login Pengguna
            </Link>
            <Link href="/register" className="hover:text-[#FF8533] transition-colors">
              Daftar Akun Baru →
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
