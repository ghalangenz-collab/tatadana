'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { TelegramSimulator } from '@/components/simulator/TelegramSimulator';
import { Card } from '@/components/ui/Card';
import { demoStore } from '@/lib/store/demo-store';
import { Wallet as WalletType } from '@/lib/types';
import {
  Bot,
  Sparkles,
  Terminal,
  ExternalLink,
  Wallet,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Settings,
} from 'lucide-react';

export default function SimulatorPage() {
  const getCleanWallets = () => {
    const user = demoStore.getCurrentUser();
    const isRealAdmin = Boolean(
      user &&
      user.role === 'admin' &&
      (user.email?.toLowerCase() === 'admin@tatadana.id' || user.full_name?.toLowerCase().includes('ghalan'))
    );
    let list = demoStore.getWallets();
    if (!isRealAdmin) {
      list = list.filter(
        (w) =>
          w &&
          !w.name.toLowerCase().includes('admin') &&
          !w.id.toLowerCase().includes('admin') &&
          (!w.user_id || (!w.user_id.toLowerCase().includes('adm') && (!user || w.user_id === user.id)))
      );
      if (list.length === 0) {
        list = [{
          id: `wal_${user?.id || 'main'}_clean`,
          user_id: user?.id || 'usr_main',
          name: 'Dompet Utama',
          type: 'cash',
          balance: 0,
          is_default: true,
          color: '#10B981',
          icon: 'banknote',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }];
      }
    }
    return list;
  };

  const [wallets, setWallets] = useState<WalletType[]>(getCleanWallets());
  const profile = demoStore.getProfile();

  useEffect(() => {
    const unsub = demoStore.subscribe(() => {
      setWallets(getCleanWallets());
    });
    return () => unsub();
  }, []);

  const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);

  return (
    <div className="flex min-h-screen bg-black">
      <Sidebar />

      <main className="flex-1 md:ml-64 ml-0 min-w-0">
        <Header
          title="Interactive Telegram Bot Simulator"
          subtitle="Uji coba langsung percakapan natural, scan struk foto, pesan suara, dan monitor mutasi dana real-time"
        />

        <div className="p-4 sm:p-8 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Full Telegram Simulator */}
            <div className="lg:col-span-8">
              <TelegramSimulator compact={false} />
            </div>

            {/* Right: Live Wallet Balances & Telegram Bot Fallback */}
            <div className="lg:col-span-4 space-y-5">
              {/* LIVE WALLETS MONITOR */}
              <Card className="p-5 border-amber-500/30 ring-1 ring-amber-500/20">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-amber-400" />
                    <h4 className="text-sm font-bold text-white">Mutasi Saldo Real-Time</h4>
                  </div>
                  <span className="text-[10px] bg-amber-500/15 text-amber-300 font-semibold px-2 py-0.5 rounded-full border border-amber-500/30">
                    Live Reactive
                  </span>
                </div>

                <div className="mb-4 p-3 bg-[#11141A] rounded-xl border border-[#262C38]">
                  <span className="text-[11px] text-gray-400 block">Total Saldo Tergabung:</span>
                  <span className="text-lg font-mono font-bold text-white">
                    Rp {totalBalance.toLocaleString('id-ID')}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {wallets.map((w) => (
                    <div
                      key={w.id}
                      className="p-2.5 rounded-xl bg-[#181C24] border border-[#262C38] flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: w.color }}
                        />
                        <div className="truncate">
                          <p className="text-xs font-semibold text-white truncate">
                            {w.name} {w.is_default && <span className="text-[10px] text-blue-400">(Default)</span>}
                          </p>
                          <p className="text-[10px] text-gray-400 capitalize">{w.type}</p>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-bold text-white">
                        Rp {w.balance.toLocaleString('id-ID')}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>

              {/* TELEGRAM BOT DIRECT LINK (FALLBACK JAGA-JAGA) */}
              <Card className="p-5 border-blue-600/40 bg-gradient-to-b from-[#181C24] to-[#14171D]">
                <div className="flex items-center gap-2.5 mb-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold">
                    <Bot className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Link Bot Telegram Asli</h4>
                    <p className="text-[10px] text-gray-400">Jaga-jaga jika ada kesalahan atau kendala browser</p>
                  </div>
                </div>

                <p className="text-xs text-gray-300 leading-relaxed mb-4">
                  Kamu bisa langsung berinteraksi dengan Bot resmi TataDana di Telegram. Setiap pesan yang kamu kirim di Telegram asli juga akan otomatis mencatat transaksi ke akunmu!
                </p>

                <div className="space-y-2">
                  <a
                    href="https://t.me/rumahtatdanabot"
                    target="_blank"
                    rel="noreferrer"
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/25"
                  >
                    <Bot className="w-4 h-4" />
                    <span>Buka Chat: @rumahtatdanabot</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <Link
                    href="/dashboard/settings"
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#1F242F] hover:bg-[#2A3140] text-gray-300 hover:text-white text-xs font-medium transition-colors"
                  >
                    <Settings className="w-3.5 h-3.5 text-blue-400" />
                    <span>Atur Token Bot Sendiri di Settings</span>
                  </Link>
                </div>
              </Card>

              {/* QUICK SCENARIOS */}
              <Card className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Terminal className="w-4 h-4 text-blue-400" />
                  <h4 className="text-sm font-bold text-white">Panduan Perintah Cepat</h4>
                </div>
                <div className="space-y-2.5 text-xs text-gray-300">
                  <div className="p-2.5 bg-[#181C24] rounded-xl border border-[#262C38]">
                    <span className="font-semibold text-rose-400 block mb-0.5">
                      💸 Pengeluaran (Pilih Rekening)
                    </span>
                    <code className="text-white bg-black/40 px-1 py-0.5 rounded text-[11px]">/makan</code>,{' '}
                    <code className="text-white bg-black/40 px-1 py-0.5 rounded text-[11px]">/bensin</code>,{' '}
                    <code className="text-white bg-black/40 px-1 py-0.5 rounded text-[11px]">/bayar</code>,{' '}
                    <code className="text-white bg-black/40 px-1 py-0.5 rounded text-[11px]">5 ribu makan</code>,{' '}
                    <code className="text-white bg-black/40 px-1 py-0.5 rounded text-[11px]">bayar baso 5 ribu pakai BCA</code>
                  </div>

                  <div className="p-2.5 bg-[#181C24] rounded-xl border border-[#262C38]">
                    <span className="font-semibold text-emerald-400 block mb-0.5">
                      💰 Top Up & Pemasukan (Pilih Rekening)
                    </span>
                    <code className="text-white bg-black/40 px-1 py-0.5 rounded text-[11px]">/topup</code>,{' '}
                    <code className="text-white bg-black/40 px-1 py-0.5 rounded text-[11px]">/tambah_saldo</code>,{' '}
                    <code className="text-white bg-black/40 px-1 py-0.5 rounded text-[11px]">top up dana 50rb</code>,{' '}
                    <code className="text-white bg-black/40 px-1 py-0.5 rounded text-[11px]">gajian 10jt</code>
                  </div>

                  <div className="p-2.5 bg-[#181C24] rounded-xl border border-[#262C38]">
                    <span className="font-semibold text-blue-400 block mb-0.5">
                      📊 Perintah & Ganti Dompet
                    </span>
                    <code className="text-white bg-black/40 px-1 py-0.5 rounded text-[11px]">/saldo</code>,{' '}
                    <code className="text-white bg-black/40 px-1 py-0.5 rounded text-[11px]">/pilih_dompet</code>,{' '}
                    <code className="text-white bg-black/40 px-1 py-0.5 rounded text-[11px]">/budget</code>,{' '}
                    <code className="text-white bg-black/40 px-1 py-0.5 rounded text-[11px]">/hari_ini</code>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
