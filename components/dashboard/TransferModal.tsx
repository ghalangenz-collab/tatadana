'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { demoStore } from '@/lib/store/demo-store';
import { parseIndonesianAmount, parseNominalInput } from '@/lib/ai/parser';
import { ArrowRightLeft } from 'lucide-react';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TransferModal: React.FC<TransferModalProps> = ({ isOpen, onClose }) => {
  const [wallets, setWallets] = useState(demoStore.getWallets());

  const [fromWalletId, setFromWalletId] = useState(wallets[0]?.id || '');
  const [toWalletId, setToWalletId] = useState(wallets[1]?.id || wallets[0]?.id || '');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsub = demoStore.subscribe(() => {
      setWallets(demoStore.getWallets());
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (isOpen) {
      demoStore.initFromClientStorage(true);
      const currentWallets = demoStore.getWallets();
      setWallets(currentWallets);
      if (currentWallets.length >= 2) {
        setFromWalletId(currentWallets[0].id);
        setToWalletId(currentWallets[1].id);
      } else if (currentWallets.length === 1) {
        setFromWalletId(currentWallets[0].id);
        setToWalletId(currentWallets[0].id);
      }
      setError('');
    }
  }, [isOpen]);

  const fromWallet = wallets.find((w) => w.id === fromWalletId);
  const toWallet = wallets.find((w) => w.id === toWalletId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fromWalletId === toWalletId) {
      setError('Dompet asal dan tujuan tidak boleh sama.');
      return;
    }

    const numAmount = parseNominalInput(amount);
    if (!numAmount || numAmount <= 0) {
      setError('Nominal harus lebih dari 0.');
      return;
    }

    if (fromWallet && fromWallet.balance < numAmount) {
      setError(`Saldo ${fromWallet.name} tidak cukup (Saldo: Rp ${fromWallet.balance.toLocaleString('id-ID')}).`);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const transferNote = description.trim() || `Transfer dari ${fromWallet?.name} ke ${toWallet?.name}`;

      // 1. Immediately update client demoStore (both wallet balances and transactions list update instantly)
      demoStore.transferBetweenWallets(fromWalletId, toWalletId, numAmount, transferNote);

      // 2. Synchronize to server API gracefully in background
      fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'transfer',
          wallet_id: fromWalletId,
          to_wallet_id: toWalletId,
          amount: numAmount,
          description: transferNote,
        }),
      }).catch((err) => {
        console.warn('Background sync warning:', err);
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('tatadana_transactions_updated'));
        window.dispatchEvent(new CustomEvent('tatadana_wallets_updated'));
      }

      setAmount('');
      setDescription('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Gagal memproses transfer.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Transfer Antar Dompet"
      subtitle="Pindahkan saldo antar rekening, e-wallet, atau pos investasi secara instan"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Source and Destination Wallets */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Dari Dompet (Asal)</label>
            <select
              value={fromWalletId}
              onChange={(e) => setFromWalletId(e.target.value)}
              className="w-full bg-[#181C24] border border-[#262C38] focus:border-slate-300 rounded-xl px-3 py-2.5 text-white text-xs outline-none"
            >
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} (Rp {w.balance.toLocaleString('id-ID')})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Ke Dompet (Tujuan)</label>
            <select
              value={toWalletId}
              onChange={(e) => setToWalletId(e.target.value)}
              className="w-full bg-[#181C24] border border-[#262C38] focus:border-slate-300 rounded-xl px-3 py-2.5 text-white text-xs outline-none"
            >
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} (Rp {w.balance.toLocaleString('id-ID')})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Visual Transfer Arrow Banner */}
        <div className="bg-[#14171D] border border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs text-slate-300">
          <div className="truncate font-semibold">{fromWallet?.name || 'Asal'}</div>
          <ArrowRightLeft className="w-4 h-4 text-slate-400 shrink-0 mx-2" />
          <div className="truncate font-semibold text-slate-200">{toWallet?.name || 'Tujuan'}</div>
        </div>

        {/* Nominal */}
        <div>
          <label className="block text-xs font-semibold text-gray-300 mb-1.5">
            Nominal Transfer (Rp) — Bisa ketik fleksibel (cth: 200rb, 500k, 1jt, 1.000.000)
          </label>
          <input
            type="text"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="cth: 200rb, 500k, 1jt, 1.000.000, 250000"
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
              {['50rb', '100rb', '250rb', '500rb', '1jt', '2.5jt', '5jt'].map((chip) => (
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

        {/* Catatan */}
        <div>
          <label className="block text-xs font-semibold text-gray-300 mb-1.5">
            Catatan (Opsional)
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="cth: Top-up saldo GoPay mingguan, Bayar cicilan"
            className="w-full bg-[#181C24] border border-[#262C38] focus:border-slate-300 rounded-xl px-4 py-2.5 text-white text-sm outline-none"
          />
        </div>

        {error && <p className="text-xs text-rose-400 bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20">{error}</p>}

        <div className="pt-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" isLoading={isLoading}>
            Kirim Transfer
          </Button>
        </div>
      </form>
    </Modal>
  );
};
