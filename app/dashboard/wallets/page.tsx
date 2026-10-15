'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { TransferModal } from '@/components/dashboard/TransferModal';
import { demoStore } from '@/lib/store/demo-store';
import { parseIndonesianAmount, parseNominalInput } from '@/lib/ai/parser';
import {
  Wallet as WalletIcon,
  Landmark,
  Smartphone,
  Banknote,
  TrendingUp,
  Plus,
  ArrowRightLeft,
  Star,
  CheckCircle,
  Trash2,
  Sparkles,
} from 'lucide-react';

export default function WalletsPage() {
  const [wallets, setWallets] = useState(demoStore.getWallets());
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isAddWalletOpen, setIsAddWalletOpen] = useState(false);
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [topUpWalletId, setTopUpWalletId] = useState('');
  const [topUpAmount, setTopUpAmount] = useState('');
  const [topUpNote, setTopUpNote] = useState('Top Up Saldo');
  const [notification, setNotification] = useState<string | null>(null);

  // New Wallet Form
  const [name, setName] = useState('');
  const [type, setType] = useState<'bank' | 'ewallet' | 'cash' | 'investment'>('bank');
  const [balance, setBalance] = useState('');
  const [color, setColor] = useState('#CBD5E1');
  const [isDefaultWallet, setIsDefaultWallet] = useState(false);

  useEffect(() => {
    // Hydrate store on mount
    demoStore.initFromClientStorage(true);
    const refreshWallets = () => {
      const freshWallets = demoStore.getWallets();
      setWallets([...freshWallets]);
      if (freshWallets.length > 0 && !topUpWalletId) {
        setTopUpWalletId(demoStore.getDefaultWallet()?.id || freshWallets[0].id);
      }
    };

    refreshWallets();

    const unsub = demoStore.subscribe(() => {
      refreshWallets();
    });

    const handleCustomWalletUpdate = () => {
      refreshWallets();
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key && e.key.startsWith('tatadana_')) {
        demoStore.initFromClientStorage(true);
        refreshWallets();
      }
    };

    window.addEventListener('tatadana_wallets_updated', handleCustomWalletUpdate);
    window.addEventListener('tatadana_store_updated', handleCustomWalletUpdate);
    window.addEventListener('storage', handleStorage);

    return () => {
      unsub();
      window.removeEventListener('tatadana_wallets_updated', handleCustomWalletUpdate);
      window.removeEventListener('tatadana_store_updated', handleCustomWalletUpdate);
      window.removeEventListener('storage', handleStorage);
    };
  }, [topUpWalletId]);

  const handleOpenTopUp = (walletId?: string) => {
    const freshWallets = demoStore.getWallets();
    const targetId = walletId || demoStore.getDefaultWallet()?.id || freshWallets[0]?.id || '';
    setTopUpWalletId(targetId);
    setTopUpAmount('');
    setTopUpNote('Top Up Saldo');
    setIsTopUpOpen(true);
  };

  const handleTopUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseNominalInput(topUpAmount);
    if (!num || num <= 0) {
      alert('Masukkan nominal top up yang valid (cth: 500rb, 1jt, 500.000).');
      return;
    }

    const targetWallet = wallets.find((w) => w.id === topUpWalletId) || demoStore.getDefaultWallet();
    if (!targetWallet) return;

    try {
      const res = demoStore.topUpWallet(targetWallet.id, num, topUpNote.trim() || 'Top Up Saldo');
      setWallets([...demoStore.getWallets()]);
      setIsTopUpOpen(false);
      setTopUpAmount('');
      showNotification(`✅ Berhasil top up Rp ${num.toLocaleString('id-ID')} ke "${res.wallet.name}"! Saldo sekarang: Rp ${res.wallet.balance.toLocaleString('id-ID')}`);
    } catch (err: any) {
      alert(err.message || 'Gagal melakukan top up.');
    }
  };

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const handleSetDefault = (id: string, walletName: string) => {
    demoStore.setDefaultWallet(id);
    setWallets([...demoStore.getWallets()]);
    showNotification(`⭐ "${walletName}" sekarang aktif sebagai Dompet Utama bot & transaksi!`);
  };

  const handleDeleteWallet = (id: string, walletName: string) => {
    if (wallets.length <= 1) {
      alert('Tidak dapat menghapus dompet satu-satunya.');
      return;
    }
    if (confirm(`Yakin ingin menghapus dompet "${walletName}"?`)) {
      try {
        demoStore.deleteWallet(id);
        setWallets([...demoStore.getWallets()]);
        showNotification(`Dompet "${walletName}" berhasil dihapus.`);
      } catch (err: any) {
        alert(err.message || 'Gagal menghapus dompet.');
      }
    }
  };

  const handleCreateWallet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Nama dompet wajib diisi.');
      return;
    }
    const numBalance = parseNominalInput(balance);

    const created = demoStore.addWallet(name.trim(), type, numBalance, color, isDefaultWallet);
    const latest = demoStore.getWallets();
    setWallets([...latest]);
    if (!topUpWalletId && latest.length > 0) {
      setTopUpWalletId(latest[0].id);
    }
    setName('');
    setBalance('');
    setIsDefaultWallet(false);
    setIsAddWalletOpen(false);
    showNotification(`✅ Dompet "${created.name}" berhasil dibuat dengan saldo awal Rp ${numBalance.toLocaleString('id-ID')}!`);
  };

  const getWalletIcon = (wType: string) => {
    switch (wType) {
      case 'bank':
        return <Landmark className="w-5 h-5 text-slate-300" />;
      case 'ewallet':
        return <Smartphone className="w-5 h-5 text-slate-300" />;
      case 'cash':
        return <Banknote className="w-5 h-5 text-emerald-400" />;
      default:
        return <TrendingUp className="w-5 h-5 text-amber-300" />;
    }
  };

  const totalBalance = wallets.reduce((acc, w) => acc + w.balance, 0);

  const quickTemplates = [
    { name: 'BCA Tabungan', type: 'bank', color: '#005EAA' },
    { name: 'Mandiri Tabungan', type: 'bank', color: '#003D79' },
    { name: 'BRI Tabungan', type: 'bank', color: '#00529C' },
    { name: 'BNI Taplus', type: 'bank', color: '#F15A24' },
    { name: 'GoPay Saldo', type: 'ewallet', color: '#00AED6' },
    { name: 'OVO Cash', type: 'ewallet', color: '#4C3494' },
    { name: 'Dana Dompet', type: 'ewallet', color: '#118EEA' },
    { name: 'Dompet Tunai', type: 'cash', color: '#10B981' },
    { name: 'Bibit Reksadana', type: 'investment', color: '#6366F1' },
  ];

  return (
    <div className="flex min-h-screen bg-[#0D0F12]">
      <Sidebar />

      <main className="flex-1 md:ml-64 ml-0 min-w-0">
        <Header
          title="Manajemen Multi-Dompet"
          subtitle="Atur rekening bank, e-wallet, dompet tunai, dan pos investasi"
          onOpenTopUpModal={() => handleOpenTopUp()}
          onOpenTransferModal={() => setIsTransferOpen(true)}
        />

        <div className="p-4 sm:p-8 space-y-6">
          {/* Notification Toast Banner */}
          {notification && (
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-400/40 text-slate-100 px-4 py-3 rounded-xl shadow-lg flex items-center gap-2.5 animate-fadeIn">
              <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
              <span className="text-xs font-semibold">{notification}</span>
            </div>
          )}

          {/* Top Banner */}
          <div className="bg-gradient-to-r from-[#181C24] via-[#1A202C] to-[#14171D] p-4 sm:p-6 rounded-2xl border border-slate-700/60 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <WalletIcon className="w-5 h-5 text-slate-300" />
                <h3 className="text-base font-bold text-white tracking-tight">Total Saldo di Semua Dompet</h3>
              </div>
              <p className="text-xl sm:text-2xl font-extrabold font-mono text-white mt-1.5 sm:mt-2 break-words">
                Rp {totalBalance.toLocaleString('id-ID')}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {wallets.length} dompet aktif terdaftar
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <Button
                variant="primary"
                size="md"
                onClick={() => handleOpenTopUp()}
                icon={<Plus className="w-4 h-4 text-white" />}
                className="bg-emerald-600 hover:bg-emerald-500 text-white border-none shadow-md shadow-emerald-600/30 text-xs sm:text-sm py-2 px-3 sm:px-4"
              >
                <span className="hidden sm:inline">Top Up / Tambah Saldo</span>
                <span className="sm:hidden">Top Up</span>
              </Button>
              <Button
                variant="secondary"
                size="md"
                onClick={() => setIsTransferOpen(true)}
                icon={<ArrowRightLeft className="w-4 h-4 text-slate-300" />}
                className="text-xs sm:text-sm py-2 px-3 sm:px-4"
              >
                <span className="hidden sm:inline">Transfer Antar Dompet</span>
                <span className="sm:hidden">Transfer</span>
              </Button>
              <Button
                variant="secondary"
                size="md"
                onClick={() => setIsAddWalletOpen(true)}
                icon={<Plus className="w-4 h-4" />}
                className="text-xs sm:text-sm py-2 px-3 sm:px-4"
              >
                <span className="hidden sm:inline">Tambah Dompet Baru</span>
                <span className="sm:hidden">Tambah Dompet</span>
              </Button>
            </div>
          </div>

          {/* Wallets Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {wallets.map((w) => (
              <Card
                key={w.id}
                className={`p-6 relative overflow-hidden transition-all flex flex-col justify-between ${
                  w.is_default
                    ? 'border-slate-400/70 ring-1 ring-slate-400/40 bg-gradient-to-b from-[#1E2430] to-[#14171D] shadow-lg shadow-slate-900/50'
                    : 'border-[#262C38] hover:border-slate-600/60 bg-[#14171D]'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="p-3 rounded-2xl bg-[#181C24] border border-[#2D3545] shadow-sm">
                      {getWalletIcon(w.type)}
                    </div>
                    
                    <div className="flex items-center gap-1.5">
                      {w.is_default ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-gradient-to-r from-slate-200 to-slate-300 text-slate-900 shadow-sm">
                          <Star className="w-3 h-3 fill-current text-amber-600" /> Utama / Default
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSetDefault(w.id, w.name)}
                          className="px-2.5 py-1 text-xs font-semibold text-slate-200 hover:text-white bg-slate-800/80 hover:bg-slate-700/90 rounded-lg border border-slate-600 hover:border-slate-400 transition-all flex items-center gap-1 shadow-sm"
                          title="Jadikan dompet ini sebagai dompet utama yang aktif"
                        >
                          <Star className="w-3 h-3 text-slate-400" /> Jadikan Utama
                        </button>
                      )}

                      {!w.is_default && wallets.length > 1 && (
                        <button
                          onClick={() => handleDeleteWallet(w.id, w.name)}
                          className="p-1.5 text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                          title={`Hapus dompet ${w.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-4">
                    <h4 className="text-base font-bold text-white">{w.name}</h4>
                    <p className="text-xs text-slate-400 capitalize">{w.type}</p>
                    <p className="text-xl font-bold font-mono text-white mt-3">
                      Rp {w.balance.toLocaleString('id-ID')}
                    </p>
                  </div>

                  {/* Top Up / Tambah Saldo Action Button on each Card */}
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => handleOpenTopUp(w.id)}
                      className="w-full py-2 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 hover:border-emerald-400/50 text-emerald-400 hover:text-emerald-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm"
                      title={`Top Up / Tambah Saldo ke ${w.name}`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Top Up / Tambah Saldo</span>
                    </button>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-[#262C38] flex items-center justify-between text-xs text-gray-400">
                  <span>Status: Aktif</span>
                  {w.is_default && (
                    <span className="text-slate-300 text-[11px] font-semibold flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-full border border-white/20">
                      <CheckCircle className="w-3 h-3 text-emerald-400" /> Auto Bot Telegram
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </main>

      {/* Add Wallet Modal */}
      <Modal
        isOpen={isAddWalletOpen}
        onClose={() => setIsAddWalletOpen(false)}
        title="Tambah Dompet Baru"
        subtitle="Buat dompet rekening atau e-wallet untuk mencatat saldo terpisah"
        maxWidth="md"
      >
        <form onSubmit={handleCreateWallet} className="space-y-4">
          {/* Quick Templates */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Pilihan Cepat Dompet Populer
            </label>
            <div className="flex flex-wrap gap-1.5">
              {quickTemplates.map((tmpl) => (
                <button
                  key={tmpl.name}
                  type="button"
                  onClick={() => {
                    setName(tmpl.name);
                    setType(tmpl.type as any);
                    setColor(tmpl.color);
                  }}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-[#181C24] hover:bg-[#222834] border border-[#2D3545] hover:border-slate-400 text-slate-300 hover:text-white transition-colors"
                >
                  + {tmpl.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Nama Dompet</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="cth: Mandiri Tabungan, GoPay, OVO, Dompet Tunai"
              className="w-full bg-[#181C24] border border-[#262C38] focus:border-slate-300 rounded-xl px-4 py-2.5 text-white text-sm outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Tipe Dompet</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full bg-[#181C24] border border-[#262C38] focus:border-slate-300 rounded-xl px-3 py-2.5 text-white text-xs outline-none"
              >
                <option value="bank">Rekening Bank</option>
                <option value="ewallet">E-Wallet</option>
                <option value="cash">Tunai / Cash</option>
                <option value="investment">Investasi</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Warna Aksen</label>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-full h-10 bg-[#181C24] border border-[#262C38] rounded-xl p-1 cursor-pointer outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              Saldo Awal (Rp) — Bisa input bebas (cth: 10 juta, 10jt, 1.000.000, 500k)
            </label>
            <input
              type="text"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              placeholder="cth: 10 juta, 10jt, 10.000.000, 500k, atau 0"
              className="w-full bg-[#181C24] border border-[#262C38] focus:border-slate-300 rounded-xl px-4 py-2.5 text-white font-mono text-lg font-bold outline-none"
            />
            {balance && (
              <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold mt-1.5 px-3 py-1.5 bg-emerald-950/30 border border-emerald-500/20 rounded-lg">
                <span>Saldo Terdeteksi:</span>
                <span className="font-mono text-sm text-emerald-300">
                  Rp {parseNominalInput(balance).toLocaleString('id-ID')}
                </span>
              </div>
            )}

            {/* Quick Balance Chips */}
            <div className="mt-2">
              <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                Pilihan Cepat Saldo Awal:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {['0', '500rb', '1jt', '5jt', '10jt', '25jt'].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setBalance(chip)}
                    className="text-xs px-2.5 py-1 rounded-lg bg-[#181C24] hover:bg-emerald-500/20 border border-[#2D3545] hover:border-emerald-500/50 text-slate-300 hover:text-emerald-300 transition-colors font-mono"
                  >
                    +{chip}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="setAsDefaultCheckbox"
              checked={isDefaultWallet}
              onChange={(e) => setIsDefaultWallet(e.target.checked)}
              className="rounded bg-[#181C24] border-slate-700 text-slate-300 focus:ring-0 cursor-pointer"
            />
            <label htmlFor="setAsDefaultCheckbox" className="text-xs text-slate-300 cursor-pointer select-none">
              Jadikan dompet ini sebagai Dompet Utama bot langsung
            </label>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setIsAddWalletOpen(false)}>
              Batal
            </Button>
            <Button type="submit">Tambah Dompet</Button>
          </div>
        </form>
      </Modal>

      {/* Top Up / Tambah Saldo Quick Modal */}
      <Modal
        isOpen={isTopUpOpen}
        onClose={() => setIsTopUpOpen(false)}
        title="Top Up / Tambah Saldo"
        subtitle="Tambah saldo ke dompet pilihan Anda secara instan"
        maxWidth="md"
      >
        <form onSubmit={handleTopUpSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Pilih Dompet Tujuan</label>
            <select
              value={topUpWalletId}
              onChange={(e) => setTopUpWalletId(e.target.value)}
              className="w-full bg-[#181C24] border border-[#262C38] focus:border-emerald-500 rounded-xl px-3 py-2.5 text-white text-sm outline-none"
            >
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} — Saldo: Rp {w.balance.toLocaleString('id-ID')} {w.is_default ? '(Utama)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              Nominal Tambah Saldo (Rp) — Bisa input nominal berapapun
            </label>
            <input
              type="text"
              required
              value={topUpAmount}
              onChange={(e) => setTopUpAmount(e.target.value)}
              placeholder="cth: 500rb, 1jt, 500.000, 10 juta"
              className="w-full bg-[#181C24] border border-[#262C38] focus:border-emerald-500 rounded-xl px-4 py-2.5 text-white font-mono text-lg font-bold outline-none"
            />
            {topUpAmount && (
              <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold mt-1.5 px-3 py-1.5 bg-emerald-950/30 border border-emerald-500/20 rounded-lg">
                <span>Nominal Terdeteksi:</span>
                <span className="font-mono text-sm text-emerald-300">
                  Rp {parseNominalInput(topUpAmount).toLocaleString('id-ID')}
                </span>
              </div>
            )}
          </div>

          {/* Quick Amount Chips */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Pilihan Cepat Nominal
            </label>
            <div className="flex flex-wrap gap-1.5">
              {[50000, 100000, 250000, 500000, 1000000, 5000000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setTopUpAmount(val.toLocaleString('id-ID'))}
                  className="text-xs px-2.5 py-1 rounded-lg bg-[#181C24] hover:bg-emerald-500/20 border border-[#2D3545] hover:border-emerald-500/50 text-slate-300 hover:text-emerald-400 transition-colors font-mono"
                >
                  +Rp {val.toLocaleString('id-ID')}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Catatan / Keterangan</label>
            <input
              type="text"
              value={topUpNote}
              onChange={(e) => setTopUpNote(e.target.value)}
              placeholder="cth: Gaji Bulanan, Transfer Masuk, Top Up E-Wallet"
              className="w-full bg-[#181C24] border border-[#262C38] focus:border-emerald-500 rounded-xl px-4 py-2 text-white text-sm outline-none"
            />
          </div>

          {/* Quick Note Presets */}
          <div className="flex flex-wrap gap-1.5">
            {['Top Up Saldo', 'Gaji Bulanan', 'Transfer Masuk', 'Pemasukan Usaha', 'Uang Saku'].map((notePreset) => (
              <button
                key={notePreset}
                type="button"
                onClick={() => setTopUpNote(notePreset)}
                className="text-[11px] px-2 py-0.5 rounded-md bg-[#181C24] text-slate-400 hover:text-white border border-[#2D3545] transition-colors"
              >
                {notePreset}
              </button>
            ))}
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-[#262C38]">
            <Button type="button" variant="ghost" onClick={() => setIsTopUpOpen(false)}>
              Batal
            </Button>
            <Button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-500 text-white border-none shadow-md shadow-emerald-600/30"
            >
              Konfirmasi Tambah Saldo
            </Button>
          </div>
        </form>
      </Modal>

      <TransferModal isOpen={isTransferOpen} onClose={() => setIsTransferOpen(false)} />
    </div>
  );
}
