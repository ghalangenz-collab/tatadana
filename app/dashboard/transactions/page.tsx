'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { AddTransactionModal } from '@/components/dashboard/AddTransactionModal';
import { TransferModal } from '@/components/dashboard/TransferModal';
import { demoStore } from '@/lib/store/demo-store';
import {
  Search,
  Filter,
  ArrowUpDown,
  Trash2,
  ChevronDown,
  ChevronUp,
  Camera,
  Mic,
  MessageSquare,
  ArrowRightLeft,
  Receipt,
  Plus,
} from 'lucide-react';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState(demoStore.getTransactions());
  const [wallets, setWallets] = useState(demoStore.getWallets());
  const [categories, setCategories] = useState(demoStore.getCategories());

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [walletFilter, setWalletFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addModalType, setAddModalType] = useState<'expense' | 'income'>('expense');
  const [isTransferOpen, setIsTransferOpen] = useState(false);

  useEffect(() => {
    // Hydrate store on mount
    demoStore.initFromClientStorage(true);

    const refreshData = () => {
      const raw = demoStore.getTransactions();
      const map = new Map<string, any>();
      raw.forEach((t) => {
        if (t && t.id && !map.has(t.id)) map.set(t.id, t);
      });
      setTransactions(Array.from(map.values()));
      setWallets([...demoStore.getWallets()]);
      setCategories([...demoStore.getCategories()]);
    };

    refreshData();

    const unsub = demoStore.subscribe(() => {
      refreshData();
    });

    const handleCustomEvents = () => {
      refreshData();
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key && e.key.startsWith('tatadana_')) {
        demoStore.initFromClientStorage(true);
        refreshData();
      }
    };

    window.addEventListener('tatadana_transactions_updated', handleCustomEvents);
    window.addEventListener('tatadana_wallets_updated', handleCustomEvents);
    window.addEventListener('tatadana_store_updated', handleCustomEvents);
    window.addEventListener('storage', handleStorage);

    return () => {
      unsub();
      window.removeEventListener('tatadana_transactions_updated', handleCustomEvents);
      window.removeEventListener('tatadana_wallets_updated', handleCustomEvents);
      window.removeEventListener('tatadana_store_updated', handleCustomEvents);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);

  const filtered = transactions
    .filter((t) => {
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (walletFilter !== 'all' && t.wallet_id !== walletFilter && t.to_wallet_id !== walletFilter) return false;
      if (categoryFilter !== 'all' && t.category_id !== categoryFilter) return false;
      if (search && !t.description.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      const dateA = new Date(a.transaction_date || a.created_at).getTime();
      const dateB = new Date(b.transaction_date || b.created_at).getTime();
      if (dateB !== dateA) {
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
      }
      const createdA = new Date(a.created_at).getTime();
      const createdB = new Date(b.created_at).getTime();
      return sortOrder === 'desc' ? createdB - createdA : createdA - createdB;
    });

  const handleDelete = (id: string) => {
    if (confirm('Yakin ingin menghapus transaksi ini?')) {
      demoStore.deleteTransaction(id);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#0D0F12]">
      <Sidebar />

      <main className="flex-1 md:ml-64 ml-0 min-w-0">
        <Header
          title="Daftar Transaksi"
          subtitle="Semua mutasi pemasukan, pengeluaran, dan transfer antar dompet"
          onOpenTopUpModal={() => {
            setAddModalType('income');
            setIsAddOpen(true);
          }}
          onOpenAddModal={() => {
            setAddModalType('expense');
            setIsAddOpen(true);
          }}
          onOpenTransferModal={() => setIsTransferOpen(true)}
        />

        <div className="p-4 sm:p-8 space-y-6">
          {/* Quick Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-4 bg-[#14171D] border-[#262C38]">
              <p className="text-xs font-semibold text-gray-400">Total Mutasi Tercatat</p>
              <p className="text-xl font-bold font-mono text-white mt-1">
                {transactions.length} <span className="text-xs font-normal text-gray-500">transaksi</span>
              </p>
            </Card>

            <Card className="p-4 bg-[#14171D] border-emerald-500/20">
              <p className="text-xs font-semibold text-emerald-400">Total Pemasukan / Top Up</p>
              <p className="text-xl font-bold font-mono text-emerald-300 mt-1">
                +Rp {totalIncome.toLocaleString('id-ID')}
              </p>
            </Card>

            <Card className="p-4 bg-[#14171D] border-rose-500/20">
              <p className="text-xs font-semibold text-rose-400">Total Pengeluaran</p>
              <p className="text-xl font-bold font-mono text-rose-300 mt-1">
                -Rp {totalExpense.toLocaleString('id-ID')}
              </p>
            </Card>
          </div>

          {/* Filter & Search Bar */}
          <Card className="p-4">
            <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
              {/* Search */}
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari transaksi atau merchant..."
                  className="w-full bg-[#181C24] border border-[#262C38] rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#FF6B00]"
                />
              </div>

              {/* Filters */}
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full md:w-auto">
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="bg-[#181C24] border border-[#262C38] rounded-xl px-3 py-2 text-xs text-white outline-none"
                >
                  <option value="all">Semua Tipe</option>
                  <option value="expense">Pengeluaran</option>
                  <option value="income">Pemasukan</option>
                  <option value="transfer">Transfer</option>
                </select>

                <select
                  value={walletFilter}
                  onChange={(e) => setWalletFilter(e.target.value)}
                  className="bg-[#181C24] border border-[#262C38] rounded-xl px-3 py-2 text-xs text-white outline-none"
                >
                  <option value="all">Semua Dompet</option>
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-[#181C24] border border-[#262C38] rounded-xl px-3 py-2 text-xs text-white outline-none"
                >
                  <option value="all">Semua Kategori</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon} {c.name}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                  className="flex items-center justify-center gap-1 bg-[#181C24] border border-[#262C38] hover:border-[#FF6B00] px-3 py-2 rounded-xl text-xs text-gray-300 transition-colors"
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  <span>{sortOrder === 'desc' ? 'Terbaru' : 'Terlama'}</span>
                </button>
              </div>
            </div>
          </Card>

          {/* Transactions Table */}
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-xs">
                <thead className="bg-[#181C24] text-gray-400 uppercase font-semibold border-b border-[#262C38]">
                  <tr>
                    <th className="p-4">Tanggal</th>
                    <th className="p-4">Keterangan</th>
                    <th className="p-4">Kategori</th>
                    <th className="p-4">Dompet</th>
                    <th className="p-4">Sumber</th>
                    <th className="p-4 text-right">Nominal</th>
                    <th className="p-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262C38]">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-10 text-center text-gray-400 space-y-1">
                        <p className="font-semibold text-white">
                          {transactions.length === 0
                            ? 'Belum Ada Mutasi Transaksi'
                            : 'Tidak Ada Transaksi yang Cocok'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {transactions.length === 0
                            ? 'Saldo awal akun Anda Rp 0 (kosong). Klik tombol Catat Transaksi di atas untuk mencatat mutasi pertama Anda.'
                            : 'Coba ubah kata kunci pencarian atau filter dompet/kategori.'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((tx) => {
                      const isExpanded = expandedId === tx.id;
                      const hasItems = tx.receipt_items && tx.receipt_items.length > 0;

                      return (
                        <React.Fragment key={tx.id}>
                          <tr className="hover:bg-white/[0.02] transition-colors">
                            <td className="p-4 font-mono text-gray-400 whitespace-nowrap">
                              {new Date(tx.transaction_date).toLocaleDateString('id-ID', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </td>

                            <td className="p-4">
                              <div className="flex flex-col gap-1.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-white">{tx.description}</span>
                                  {hasItems && (
                                    <button
                                      onClick={() => setExpandedId(isExpanded ? null : tx.id)}
                                      className="text-[10px] bg-[#FF6B00]/15 text-[#FF8533] px-2 py-0.5 rounded-full font-medium hover:bg-[#FF6B00]/25 transition-colors flex items-center gap-1"
                                    >
                                      <span>{tx.receipt_items.length} item</span>
                                      {isExpanded ? (
                                        <ChevronUp className="w-3 h-3" />
                                      ) : (
                                        <ChevronDown className="w-3 h-3" />
                                      )}
                                    </button>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5">
                                  {tx.type === 'income' && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                      ↓ Pemasukan / Isi Saldo
                                    </span>
                                  )}
                                  {tx.type === 'expense' && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/15 text-rose-400 border border-rose-500/30">
                                      ↑ Pengeluaran
                                    </span>
                                  )}
                                  {tx.type === 'transfer' && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/15 text-purple-400 border border-purple-500/30">
                                      ⇄ Transfer Antar Dompet
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            <td className="p-4 whitespace-nowrap">
                              {tx.category ? (
                                <span className="inline-flex items-center gap-1 text-gray-300">
                                  <span>{tx.category.icon}</span>
                                  <span>{tx.category.name}</span>
                                </span>
                              ) : (
                                <span className="text-gray-500">-</span>
                              )}
                            </td>

                            <td className="p-4 whitespace-nowrap text-gray-300 font-medium">
                              {tx.type === 'transfer' && tx.to_wallet ? (
                                <span className="inline-flex items-center gap-1.5 text-xs">
                                  <span className="text-gray-300">{tx.wallet?.name || 'Dompet'}</span>
                                  <ArrowRightLeft className="w-3 h-3 text-purple-400" />
                                  <span className="text-purple-300 font-semibold">{tx.to_wallet.name}</span>
                                </span>
                              ) : (
                                tx.wallet?.name || 'Dompet'
                              )}
                            </td>

                            <td className="p-4 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1 text-gray-400 bg-white/5 px-2 py-1 rounded text-[11px]">
                                {tx.source === 'telegram_photo' && <Camera className="w-3 h-3 text-[#FF8533]" />}
                                {tx.source === 'telegram_voice' && <Mic className="w-3 h-3 text-blue-400" />}
                                {tx.source === 'telegram_text' && <MessageSquare className="w-3 h-3 text-emerald-400" />}
                                {tx.source === 'transfer' && <ArrowRightLeft className="w-3 h-3 text-purple-400" />}
                                {tx.source === 'web_manual' && <Receipt className="w-3 h-3 text-gray-400" />}
                                <span>{tx.source.replace('telegram_', '')}</span>
                              </span>
                            </td>

                            <td className="p-4 text-right whitespace-nowrap font-mono font-bold">
                              <span
                                className={
                                  tx.type === 'income'
                                    ? 'text-emerald-400'
                                    : tx.type === 'expense'
                                    ? 'text-rose-400'
                                    : 'text-purple-400'
                                }
                              >
                                {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''} Rp{' '}
                                {tx.amount.toLocaleString('id-ID')}
                              </span>
                            </td>

                            <td className="p-4 text-center">
                              <button
                                onClick={() => handleDelete(tx.id)}
                                title="Hapus Transaksi"
                                className="p-1.5 text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>

                          {/* Expandable itemized row */}
                          {isExpanded && hasItems && (
                            <tr className="bg-[#11141A]">
                              <td colSpan={7} className="p-4 border-l-2 border-[#FF6B00]">
                                <div className="space-y-1.5">
                                  <p className="text-xs font-semibold text-[#FF8533] mb-2">
                                    Item Struk Belanja ({tx.receipt_items.length} item):
                                  </p>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                                    {tx.receipt_items.map((it, idx) => (
                                      <div
                                        key={idx}
                                        className="p-2 bg-[#181C24] rounded-lg border border-[#262C38] text-[11px]"
                                      >
                                        <p className="font-semibold text-white truncate">{it.name}</p>
                                        <p className="text-gray-400 mt-0.5">
                                          {it.qty}x @ Rp {it.price.toLocaleString('id-ID')}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </main>

      <AddTransactionModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        initialType={addModalType}
      />
      <TransferModal isOpen={isTransferOpen} onClose={() => setIsTransferOpen(false)} />
    </div>
  );
}
