'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { demoStore } from '@/lib/store/demo-store';
import { parseIndonesianAmount, parseNominalInput, heuristicParseIndonesianText } from '@/lib/ai/parser';
import { Sparkles, AlertCircle } from 'lucide-react';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: 'expense' | 'income';
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  isOpen,
  onClose,
  initialType = 'expense',
}) => {
  const [wallets, setWallets] = useState(demoStore.getWallets());
  const [categories, setCategories] = useState(demoStore.getCategories());

  const [quickInput, setQuickInput] = useState('');
  const [type, setType] = useState<'expense' | 'income'>(initialType);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [walletId, setWalletId] = useState(demoStore.getDefaultWallet()?.id || wallets[0]?.id || '');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsub = demoStore.subscribe(() => {
      const freshWallets = demoStore.getWallets();
      setWallets(freshWallets);
      setCategories(demoStore.getCategories());
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (isOpen) {
      demoStore.initFromClientStorage(true);
      const targetType = initialType || 'expense';
      setType(targetType);
      const freshWallets = demoStore.getWallets();
      setWallets(freshWallets);
      const freshCats = demoStore.getCategories();
      setCategories(freshCats);
      const matchingCats = freshCats.filter((c) => c.type === targetType);
      if (matchingCats.length > 0) {
        setCategoryId(matchingCats[0].id);
      }
      const currentDef = demoStore.getDefaultWallet();
      if (currentDef) {
        setWalletId(currentDef.id);
      } else if (freshWallets.length > 0) {
        setWalletId(freshWallets[0].id);
      }
      setError('');
      setQuickInput('');
    }
  }, [isOpen, initialType]);

  const filteredCategories = categories.filter((c) => c.type === type);

  // Quick NLP Parser for natural language e.g. "membeli baso 5 ribu"
  const handleQuickParse = (text: string) => {
    setQuickInput(text);
    if (!text.trim()) return;

    const parsed = heuristicParseIndonesianText(text);
    if (parsed) {
      setType(parsed.type);
      setAmount(parsed.amount.toLocaleString('id-ID'));
      setDescription(parsed.description);

      const matchedCat = categories.find((c) =>
        c.name.toLowerCase().includes(parsed.categoryName.toLowerCase()) ||
        parsed.categoryName.toLowerCase().includes(c.name.toLowerCase())
      );
      if (matchedCat) {
        setCategoryId(matchedCat.id);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Flexible nominal parser: accepts 1jt, 1.5jt, 10 juta, 1.000.000, 10.000.000, 500k, 25rb, etc.
    const numAmount = parseNominalInput(amount);
    if (!numAmount || numAmount <= 0) {
      setError('Nominal transaksi harus lebih dari 0.');
      return;
    }
    if (!description.trim()) {
      setError('Catatan atau keterangan transaksi wajib diisi.');
      return;
    }

    const currentWallets = demoStore.getWallets();
    const targetWalletId = walletId || demoStore.getDefaultWallet()?.id || currentWallets[0]?.id;
    let selectedWallet = currentWallets.find((w) => w.id === targetWalletId);
    
    if (!selectedWallet && currentWallets.length > 0) {
      selectedWallet = currentWallets[0];
    }

    setIsLoading(true);
    setError('');

    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      const txDate = date === todayStr ? new Date().toISOString() : new Date(`${date}T12:00:00.000Z`).toISOString();

      // 1. Immediately record in client demoStore (updates wallet balance & transaction list in real time)
      // NOTE: Expenses with Rp 0 balance are allowed! Saldo will become negative or be tracked smoothly.
      demoStore.addTransaction({
        wallet_id: targetWalletId,
        category_id: categoryId,
        type,
        amount: numAmount,
        description: description.trim(),
        transaction_date: txDate,
        source: 'web_manual',
      });

      // 2. Synchronize to server API gracefully in background
      fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          amount: numAmount,
          description: description.trim(),
          wallet_id: targetWalletId,
          category_id: categoryId,
          transaction_date: txDate,
          source: 'web_manual',
        }),
      }).catch((e) => {
        console.warn('Background sync warning:', e);
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('tatadana_transactions_updated'));
        window.dispatchEvent(new CustomEvent('tatadana_wallets_updated'));
      }

      // Reset form
      setAmount('');
      setDescription('');
      setQuickInput('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan transaksi.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedWallet = wallets.find((w) => w.id === walletId) || wallets[0];
  const willBeNegative = type === 'expense' && selectedWallet && selectedWallet.balance < parseNominalInput(amount);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Catat Transaksi Baru"
      subtitle="Input transaksi manual untuk langsung update saldo & riwayat mutasi"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Quick Natural Language AI Input */}
        <div className="bg-[#14171D] p-3 rounded-xl border border-slate-700/60 space-y-1.5">
          <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Ketik Bahasa Bebas (Auto-Deteksi AI)</span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={quickInput}
              onChange={(e) => handleQuickParse(e.target.value)}
              placeholder="Cth: membeli baso 5 ribu, beli bensin 25rb, gajian 5jt"
              className="flex-1 bg-[#181C24] border border-[#262C38] focus:border-amber-400 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 outline-none"
            />
            {quickInput && (
              <button
                type="button"
                onClick={() => handleQuickParse(quickInput)}
                className="text-[11px] px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg font-semibold"
              >
                Terapkan
              </button>
            )}
          </div>
        </div>

        {/* Type Switcher */}
        <div className="grid grid-cols-2 gap-2 bg-[#181C24] p-1 rounded-xl border border-[#262C38]">
          <button
            type="button"
            onClick={() => {
              setType('expense');
              const expenseCats = categories.filter((c) => c.type === 'expense');
              if (expenseCats.length > 0) setCategoryId(expenseCats[0].id);
            }}
            className={`py-2 rounded-lg text-xs font-bold transition-all ${
              type === 'expense'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            💸 Pengeluaran
          </button>
          <button
            type="button"
            onClick={() => {
              setType('income');
              const incomeCats = categories.filter((c) => c.type === 'income');
              if (incomeCats.length > 0) setCategoryId(incomeCats[0].id);
            }}
            className={`py-2 rounded-lg text-xs font-bold transition-all ${
              type === 'income'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            💰 Pemasukan / Tambah Saldo
          </button>
        </div>

        {/* Nominal */}
        <div>
          <label className="block text-xs font-semibold text-gray-300 mb-1.5">
            Nominal Transaksi (Rp) — Bisa input nominal berapapun (cth: 1jt, 1.5jt, 10 juta, 1.000.000, 500k, 25rb)
          </label>
          <input
            type="text"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="cth: 1jt, 1.5jt, 10 juta, 1.000.000, 500k, 25rb, 50000"
            className="w-full bg-[#181C24] border border-[#262C38] focus:border-slate-300 rounded-xl px-4 py-2.5 text-white font-mono text-lg font-bold outline-none"
          />
          {amount && (
            <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold mt-1.5 px-3 py-1.5 bg-emerald-950/30 border border-emerald-500/20 rounded-lg">
              <span>Nominal Terdeteksi:</span>
              <span className="font-mono text-sm font-bold text-emerald-300">
                Rp {parseNominalInput(amount).toLocaleString('id-ID')}
              </span>
            </div>
          )}

          {/* Quick Nominal Chips */}
          <div className="mt-2">
            <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
              Pilihan Cepat Nominal:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {['25rb', '50rb', '100rb', '500rb', '1jt', '2.5jt', '5jt', '10jt'].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setAmount(chip)}
                  className="text-xs px-2.5 py-1 rounded-lg bg-[#181C24] hover:bg-emerald-500/20 border border-[#2D3545] hover:border-emerald-500/50 text-slate-300 hover:text-emerald-300 transition-colors font-mono"
                >
                  +{chip}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Keterangan */}
        <div>
          <label className="block text-xs font-semibold text-gray-300 mb-1.5">
            Keterangan / Catatan Transaksi
          </label>
          <input
            type="text"
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="cth: membeli baso, makan siang, beli bensin"
            className="w-full bg-[#181C24] border border-[#262C38] focus:border-slate-300 rounded-xl px-4 py-2.5 text-white text-sm outline-none"
          />
        </div>

        {/* Kategori & Dompet */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Kategori</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full bg-[#181C24] border border-[#262C38] focus:border-slate-300 rounded-xl px-3 py-2.5 text-white text-xs outline-none"
            >
              {filteredCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Pilih Dompet</label>
            <select
              value={walletId}
              onChange={(e) => setWalletId(e.target.value)}
              className="w-full bg-[#181C24] border border-[#262C38] focus:border-slate-300 rounded-xl px-3 py-2.5 text-white text-xs outline-none"
            >
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} {w.is_default ? '⭐' : ''} (Rp {w.balance.toLocaleString('id-ID')})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Notice if wallet balance is 0 */}
        {willBeNegative && (
          <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-300 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>
              Saldo awal Anda Rp 0. Transaksi pengeluaran tetap tercatat dan saldo dompet akan disesuaikan.
            </span>
          </div>
        )}

        {/* Tanggal */}
        <div>
          <label className="block text-xs font-semibold text-gray-300 mb-1.5">Tanggal Transaksi</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-[#181C24] border border-[#262C38] focus:border-slate-300 rounded-xl px-4 py-2.5 text-white text-xs outline-none"
          />
        </div>

        {error && <p className="text-xs text-rose-400 bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20">{error}</p>}

        <div className="pt-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" isLoading={isLoading}>
            Simpan Transaksi
          </Button>
        </div>
      </form>
    </Modal>
  );
};
