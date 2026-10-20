'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { demoStore } from '@/lib/store/demo-store';
import { parseNominalInput } from '@/lib/ai/parser';
import { Target, AlertTriangle, AlertCircle, Plus, CheckCircle2, Trash2, Edit3, Sparkles } from 'lucide-react';

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [notification, setNotification] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [monthlyLimit, setMonthlyLimit] = useState('');
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);

  const refreshBudgets = () => {
    const freshBudgets = demoStore.getBudgets();
    const freshCats = demoStore.getCategories().filter((c) => c.type === 'expense');
    setBudgets([...freshBudgets]);
    setCategories([...freshCats]);
  };

  useEffect(() => {
    demoStore.initFromClientStorage(true);
    refreshBudgets();

    const freshCats = demoStore.getCategories().filter((c) => c.type === 'expense');
    if (freshCats.length > 0) {
      setSelectedCategory(freshCats[0].id);
    }

    const unsub = demoStore.subscribe(() => {
      refreshBudgets();
    });

    const handleCustomStoreUpdate = () => {
      refreshBudgets();
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key && e.key.startsWith('tatadana_')) {
        demoStore.initFromClientStorage(true);
        refreshBudgets();
      }
    };

    window.addEventListener('tatadana_store_updated', handleCustomStoreUpdate);
    window.addEventListener('storage', handleStorage);

    return () => {
      unsub();
      window.removeEventListener('tatadana_store_updated', handleCustomStoreUpdate);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const handleOpenAddModal = (categoryId?: string) => {
    setEditingBudgetId(null);
    const expenseCats = categories.length > 0 ? categories : demoStore.getCategories().filter((c) => c.type === 'expense');
    const existingCategoryIds = new Set(budgets.map((b) => b.category_id));
    
    // Pick the requested category, or the first category that hasn't been budgeted, or default to first
    let defaultCatId = categoryId;
    if (!defaultCatId) {
      const unbudgeted = expenseCats.find((c) => !existingCategoryIds.has(c.id));
      defaultCatId = unbudgeted ? unbudgeted.id : expenseCats[0]?.id || 'cat_food';
    }
    
    setSelectedCategory(defaultCatId || 'cat_food');
    setMonthlyLimit('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (b: any) => {
    setEditingBudgetId(b.id);
    setSelectedCategory(b.category_id);
    setMonthlyLimit(b.monthly_limit.toLocaleString('id-ID'));
    setIsModalOpen(true);
  };

  const handleDeleteBudget = (budgetId: string, catName: string) => {
    if (confirm(`Yakin ingin menghapus budget untuk ${catName}?`)) {
      demoStore.deleteBudget(budgetId);
      refreshBudgets();
      showNotification(`🗑️ Budget "${catName}" berhasil dihapus.`);
    }
  };

  const handleSaveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    const limit = parseNominalInput(monthlyLimit);
    if (!limit || limit <= 0) {
      alert('Harap masukkan batas limit nominal budget yang valid (contoh: 1jt, 500rb, atau 2.000.000).');
      return;
    }

    const cat = categories.find((c) => c.id === selectedCategory) || categories[0];
    const targetCatId = cat ? cat.id : selectedCategory || 'cat_food';

    demoStore.setBudget(targetCatId, limit);
    refreshBudgets();
    setMonthlyLimit('');
    setIsModalOpen(false);
    showNotification(`✅ Budget untuk "${cat?.name || 'Kategori'}" berhasil diatur: Rp ${limit.toLocaleString('id-ID')}/bulan`);
  };

  const quickAmountPills = [
    { label: '500rb', value: 500000 },
    { label: '1 Juta', value: 1000000 },
    { label: '2 Juta', value: 2000000 },
    { label: '3 Juta', value: 3000000 },
    { label: '5 Juta', value: 5000000 },
  ];

  const totalLimit = budgets.reduce((acc, b) => acc + (b.monthly_limit || 0), 0);
  const totalSpent = budgets.reduce((acc, b) => acc + (b.current_spent || 0), 0);
  const overallPercent = totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0;

  return (
    <div className="flex min-h-screen bg-black">
      <Sidebar />

      <main className="flex-1 md:ml-64 ml-0 min-w-0">
        <Header
          title="Budget Bulanan"
          subtitle="Pantau batas pengeluaran kategori dan terima peringatan otomatis via Telegram"
        />

        <div className="p-4 sm:p-8 space-y-6">
          {/* Notification Toast Banner */}
          {notification && (
            <div className="bg-[#14120C] border border-amber-500/40 text-amber-200 px-4 py-3 rounded-xl shadow-lg flex items-center gap-2.5 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-xs font-semibold">{notification}</span>
            </div>
          )}

          {/* Overview Banner */}
          <div className="bg-gradient-to-r from-[#12141C] via-[#161820] to-[#0E1015] p-6 rounded-2xl border border-amber-500/30 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Alokasi Total Budget Bulan Ini</h3>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Terpakai: <strong className="text-white font-mono">Rp {totalSpent.toLocaleString('id-ID')}</strong> dari{' '}
                <strong className="text-amber-300 font-mono">Rp {totalLimit.toLocaleString('id-ID')}</strong> ({overallPercent}%)
              </p>
            </div>

            <Button
              variant="gold"
              size="md"
              onClick={() => handleOpenAddModal()}
              icon={<Plus className="w-4 h-4 text-black font-extrabold" />}
              className="text-black font-extrabold"
            >
              + Atur / Tambah Budget
            </Button>
          </div>

          {/* Empty State if no budgets set */}
          {budgets.length === 0 && (
            <div className="p-10 border border-dashed border-[#262C38] rounded-2xl text-center space-y-3 bg-[#0E1015]">
              <Target className="w-10 h-10 text-amber-400/50 mx-auto" />
              <h4 className="text-sm font-bold text-white">Belum Ada Budget Bulanan</h4>
              <p className="text-xs text-slate-300 max-w-md mx-auto">
                Tentukan batas pengeluaran untuk Makanan, Transportasi, Hiburan, atau pos lainnya agar bot Telegram dapat memberikan peringatan dini saat pengeluaran mendekati limit.
              </p>
              <div className="pt-2 flex flex-wrap justify-center gap-2">
                <Button
                  variant="gold"
                  size="sm"
                  onClick={() => handleOpenAddModal('cat_food')}
                  icon={<Plus className="w-3.5 h-3.5 text-black font-extrabold" />}
                  className="text-black font-extrabold text-xs"
                >
                  🍜 Budget Makanan & Minuman
                </Button>
                <Button
                  variant="gold"
                  size="sm"
                  onClick={() => handleOpenAddModal('cat_trans')}
                  icon={<Plus className="w-3.5 h-3.5 text-black font-extrabold" />}
                  className="text-black font-extrabold text-xs"
                >
                  🚗 Budget Transportasi
                </Button>
              </div>
            </div>
          )}

          {/* Budget Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {budgets.map((b) => {
              const spent = b.current_spent || 0;
              const limit = b.monthly_limit || 1;
              const percent = Math.min(150, Math.round((spent / limit) * 100));
              const remaining = Math.max(0, limit - spent);
              const isOver = spent >= limit;
              const isWarning = percent >= 80 && !isOver;

              return (
                <Card
                  key={b.id}
                  className={`p-6 relative overflow-hidden transition-all flex flex-col justify-between ${
                    isOver
                      ? 'border-rose-500/50 bg-[#12080A]'
                      : isWarning
                      ? 'border-amber-500/50 bg-[#140F08]'
                      : 'border-[#1F2430] hover:border-amber-500/40 bg-[#0A0A0A]'
                  }`}
                >
                  <div>
                    {/* Category Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-[#14171E] border border-amber-500/30 flex items-center justify-center text-2xl shadow-sm">
                          {b.category?.icon || '📁'}
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-base">{b.category?.name || 'Kategori'}</h4>
                          <p className="text-xs text-amber-300/80 mt-0.5 font-medium">Limit Bulanan</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
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

                        {/* Action buttons */}
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(b)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-amber-400/10 transition-colors"
                          title="Edit limit budget"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteBudget(b.id, b.category?.name || 'Kategori')}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Hapus budget"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Numbers */}
                    <div className="mt-6 flex items-baseline justify-between">
                      <div>
                        <span className="text-xs text-slate-400">Terpakai:</span>
                        <p className="text-lg font-bold font-mono text-white">
                          Rp {spent.toLocaleString('id-ID')}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-slate-400">Sisa Kuota:</span>
                        <p
                          className={`text-lg font-bold font-mono ${
                            isOver ? 'text-rose-400 font-extrabold' : 'text-emerald-400 font-extrabold'
                          }`}
                        >
                          Rp {remaining.toLocaleString('id-ID')}
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4">
                      <div className="flex justify-between text-xs mb-1.5 font-medium">
                        <span className="text-slate-400">Batas: Rp {limit.toLocaleString('id-ID')}</span>
                        <span
                          className={
                            isOver
                              ? 'text-rose-400 font-bold'
                              : isWarning
                              ? 'text-amber-400 font-bold'
                              : 'text-emerald-400 font-bold'
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
                              ? 'bg-amber-400'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, percent)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Telegram Alert Note */}
                  <div className="mt-6 pt-3 border-t border-[#1F2430] flex items-center justify-between text-[11px] text-slate-400">
                    <span>Notifikasi Telegram:</span>
                    <span className="text-slate-300 font-medium">
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
        title={editingBudgetId ? 'Ubah Limit Budget' : 'Tetapkan Budget Kategori'}
        subtitle="Atur batas maksimal pengeluaran bulanan per pos"
        maxWidth="md"
      >
        <form onSubmit={handleSaveBudget} className="space-y-4">
          {/* Visual Interactive Category Chips */}
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-2">Pilih Pos Pengeluaran:</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {categories.map((c) => {
                const isSelected = selectedCategory === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCategory(c.id)}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all ${
                      isSelected
                        ? 'border-amber-400 bg-amber-400/15 shadow-md shadow-amber-500/20'
                        : 'border-[#262C38] bg-[#14171E] hover:border-amber-500/40 text-slate-300 hover:text-white'
                    }`}
                  >
                    <span className="text-lg">{c.icon}</span>
                    <span className={`text-xs font-bold truncate ${isSelected ? 'text-amber-300' : 'text-slate-200'}`}>
                      {c.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5">
              Limit Bulanan (Rp)
            </label>
            <input
              type="text"
              required
              value={monthlyLimit}
              onChange={(e) => {
                setMonthlyLimit(e.target.value);
              }}
              placeholder="cth: 1jt, 500rb, atau 2.000.000"
              className="w-full bg-[#14171E] border border-amber-500/30 focus:border-amber-400 rounded-xl px-4 py-2.5 text-white font-mono text-base font-bold outline-none"
            />
            {monthlyLimit && (
              <p className="text-[11px] text-amber-300/80 mt-1 font-mono">
                Terdeteksi: Rp {parseNominalInput(monthlyLimit).toLocaleString('id-ID')}
              </p>
            )}

            {/* Quick Amount Chips */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {quickAmountPills.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setMonthlyLimit(p.value.toLocaleString('id-ID'))}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-[#181C24] hover:bg-amber-400/20 text-slate-200 hover:text-amber-300 border border-[#262C38] hover:border-amber-400/50 transition-all active:scale-95"
                >
                  +{p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-[#1F2430]">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              Batal
            </Button>
            <Button
              type="submit"
              variant="gold"
              className="text-black font-extrabold"
            >
              {editingBudgetId ? 'Simpan Perubahan' : 'Tambah Budget'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
