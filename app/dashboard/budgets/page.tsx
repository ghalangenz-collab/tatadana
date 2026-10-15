'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { demoStore } from '@/lib/store/demo-store';
import { Target, AlertTriangle, AlertCircle, Plus, CheckCircle2 } from 'lucide-react';

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState(demoStore.getBudgets());
  const [categories, setCategories] = useState(demoStore.getCategories().filter((c) => c.type === 'expense'));
  const [notification, setNotification] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [monthlyLimit, setMonthlyLimit] = useState('');

  useEffect(() => {
    demoStore.initFromClientStorage();
    const freshBudgets = demoStore.getBudgets();
    const freshCats = demoStore.getCategories().filter((c) => c.type === 'expense');
    setBudgets(freshBudgets);
    setCategories(freshCats);
    if (freshCats.length > 0) {
      setSelectedCategory(freshCats[0].id);
    }

    const unsub = demoStore.subscribe(() => {
      setBudgets(demoStore.getBudgets());
      const updatedCats = demoStore.getCategories().filter((c) => c.type === 'expense');
      setCategories(updatedCats);
    });
    return () => unsub();
  }, []);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const handleSaveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    const limit = parseFloat(monthlyLimit.replace(/\D/g, ''));
    if (!limit || limit <= 0) return;

    const cat = categories.find((c) => c.id === selectedCategory) || categories[0];
    demoStore.setBudget(cat ? cat.id : selectedCategory, limit);
    setMonthlyLimit('');
    setIsModalOpen(false);
    showNotification(`✅ Budget untuk "${cat?.name || 'Kategori'}" berhasil diatur: Rp ${limit.toLocaleString('id-ID')}/bulan`);
  };

  const totalLimit = budgets.reduce((acc, b) => acc + b.monthly_limit, 0);
  const totalSpent = budgets.reduce((acc, b) => acc + (b.current_spent || 0), 0);
  const overallPercent = totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0;

  return (
    <div className="flex min-h-screen bg-[#0D0F12]">
      <Sidebar />

      <main className="flex-1 md:ml-64 ml-0 min-w-0">
        <Header
          title="Budget Bulanan"
          subtitle="Pantau batas pengeluaran kategori dan terima peringatan otomatis via Telegram"
        />

        <div className="p-4 sm:p-8 space-y-6">
          {/* Notification Toast Banner */}
          {notification && (
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-400/40 text-slate-100 px-4 py-3 rounded-xl shadow-lg flex items-center gap-2.5 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-xs font-semibold">{notification}</span>
            </div>
          )}

          {/* Overview Banner */}
          <div className="bg-gradient-to-r from-[#181C24] to-[#14171D] p-6 rounded-2xl border border-[#262C38] flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-[#FF8533]" />
                <h3 className="text-base font-bold text-white">Alokasi Total Budget Bulan Ini</h3>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Terpakai: <strong className="text-white font-mono">Rp {totalSpent.toLocaleString('id-ID')}</strong> dari{' '}
                <strong className="text-gray-300 font-mono">Rp {totalLimit.toLocaleString('id-ID')}</strong> ({overallPercent}%)
              </p>
            </div>

            <Button
              variant="primary"
              size="md"
              onClick={() => setIsModalOpen(true)}
              icon={<Plus className="w-4 h-4" />}
            >
              Atur / Tambah Budget
            </Button>
          </div>

          {/* Empty State if no budgets set */}
          {budgets.length === 0 && (
            <div className="p-10 border border-dashed border-[#262C38] rounded-2xl text-center space-y-3 bg-[#14171D]/40">
              <Target className="w-10 h-10 text-gray-500 mx-auto" />
              <h4 className="text-sm font-bold text-white">Belum Ada Budget Bulanan</h4>
              <p className="text-xs text-gray-400 max-w-md mx-auto">
                Tentukan batas pengeluaran per kategori agar bot Telegram dapat memberikan peringatan dini saat pengeluaran mencapai 80% & 100%.
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsModalOpen(true)}
                icon={<Plus className="w-4 h-4" />}
              >
                Mulai Atur Budget Sekarang
              </Button>
            </div>
          )}

          {/* Budget Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {budgets.map((b) => {
              const spent = b.current_spent || 0;
              const percent = Math.min(150, Math.round((spent / b.monthly_limit) * 100));
              const remaining = Math.max(0, b.monthly_limit - spent);
              const isOver = spent >= b.monthly_limit;
              const isWarning = percent >= 80 && !isOver;

              return (
                <Card
                  key={b.id}
                  className={`p-6 relative overflow-hidden transition-all ${
                    isOver
                      ? 'border-rose-500/40 bg-rose-500/[0.02]'
                      : isWarning
                      ? 'border-[#FF6B00]/40 bg-[#FF6B00]/[0.02]'
                      : ''
                  }`}
                >
                  {/* Category Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-[#181C24] border border-[#262C38] flex items-center justify-center text-2xl">
                        {b.category?.icon || '📁'}
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-sm">{b.category?.name}</h4>
                        <p className="text-xs text-gray-400 mt-0.5">Limit Bulanan</p>
                      </div>
                    </div>

                    {isOver ? (
                      <Badge variant="red" size="sm">
                        <AlertCircle className="w-3 h-3" /> 100% Limit
                      </Badge>
                    ) : isWarning ? (
                      <Badge variant="orange" size="sm">
                        <AlertTriangle className="w-3 h-3" /> 80% Waspada
                      </Badge>
                    ) : (
                      <Badge variant="green" size="sm">
                        <CheckCircle2 className="w-3 h-3" /> Aman
                      </Badge>
                    )}
                  </div>

                  {/* Numbers */}
                  <div className="mt-6 flex items-baseline justify-between">
                    <div>
                      <span className="text-xs text-gray-400">Terpakai:</span>
                      <p className="text-lg font-bold font-mono text-white">
                        Rp {spent.toLocaleString('id-ID')}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-gray-400">Sisa Kuota:</span>
                      <p
                        className={`text-lg font-bold font-mono ${
                          isOver ? 'text-rose-400' : 'text-emerald-400'
                        }`}
                      >
                        Rp {remaining.toLocaleString('id-ID')}
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="flex justify-between text-xs mb-1.5 font-medium">
                      <span className="text-gray-400">Batas: Rp {b.monthly_limit.toLocaleString('id-ID')}</span>
                      <span
                        className={
                          isOver
                            ? 'text-rose-400 font-bold'
                            : isWarning
                            ? 'text-[#FF8533] font-bold'
                            : 'text-emerald-400'
                        }
                      >
                        {percent}%
                      </span>
                    </div>

                    <div className="w-full bg-[#181C24] h-2.5 rounded-full overflow-hidden border border-[#262C38]">
                      <div
                        className={`h-full transition-all duration-500 rounded-full ${
                          isOver
                            ? 'bg-rose-500'
                            : isWarning
                            ? 'bg-[#FF6B00]'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, percent)}%` }}
                      />
                    </div>
                  </div>

                  {/* Telegram Alert Note */}
                  <div className="mt-4 pt-3 border-t border-[#262C38] flex items-center justify-between text-[11px] text-gray-500">
                    <span>Notifikasi Telegram:</span>
                    <span className="text-gray-400">
                      {isOver ? '🚨 Alert 100% Terkirim' : isWarning ? '⚠️ Alert 80% Terkirim' : 'Siap trigger'}
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </main>

      {/* Set Budget Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Tetapkan Budget Kategori"
        subtitle="Atur batas maksimal pengeluaran bulanan per pos"
        maxWidth="md"
      >
        <form onSubmit={handleSaveBudget} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Pilih Kategori</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-[#181C24] border border-[#262C38] focus:border-[#FF6B00] rounded-xl px-4 py-2.5 text-white text-xs outline-none"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              Limit Bulanan (Rp)
            </label>
            <input
              type="text"
              required
              value={monthlyLimit}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, '');
                const formatted = raw ? Number(raw).toLocaleString('id-ID') : '';
                setMonthlyLimit(formatted);
              }}
              placeholder="cth: 2.000.000"
              className="w-full bg-[#181C24] border border-[#262C38] focus:border-[#FF6B00] rounded-xl px-4 py-2.5 text-white font-mono text-lg font-bold outline-none"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit">Simpan Budget</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
