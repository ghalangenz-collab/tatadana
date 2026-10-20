'use client';

import React from 'react';
import { Wallet, ArrowDownRight, ArrowUpRight, Target, TrendingUp, TrendingDown } from 'lucide-react';
import { Card } from '../ui/Card';

interface StatCardsProps {
  totalBalance: number;
  totalIncome: number;
  totalExpense: number;
  remainingBudget: number;
  walletsCount?: number;
  totalBudgetLimit?: number;
  onOpenTopUp?: () => void;
}

export const StatCards: React.FC<StatCardsProps> = ({
  totalBalance,
  totalIncome,
  totalExpense,
  remainingBudget,
  walletsCount = 1,
  totalBudgetLimit = 0,
  onOpenTopUp,
}) => {
  const cards = [
    {
      title: 'Saldo Total Dompet',
      value: `Rp ${totalBalance.toLocaleString('id-ID')}`,
      subtitle: totalBalance === 0 ? 'Saldo awal kosong (Rp 0)' : `${walletsCount} dompet aktif`,
      icon: Wallet,
      iconColor: 'text-blue-400',
      iconBg: 'bg-blue-500/15 border border-blue-500/30 shadow-sm shadow-blue-500/20',
      trend: totalBalance === 0 ? 'Saldo Rp 0' : totalBalance > 0 ? 'Aktif' : 'Minus',
      trendUp: totalBalance >= 0,
    },
    {
      title: 'Pemasukan Bulan Ini',
      value: `Rp ${totalIncome.toLocaleString('id-ID')}`,
      subtitle: totalIncome > 0 ? 'Gaji, freelance & mutasi masuk' : 'Belum ada pemasukan',
      icon: ArrowUpRight,
      iconColor: 'text-sky-400',
      iconBg: 'bg-sky-500/15 border border-sky-500/30 shadow-sm shadow-sky-500/20',
      trend: totalIncome > 0 ? 'Tercatat' : 'Kosong',
      trendUp: true,
    },
    {
      title: 'Pengeluaran Bulan Ini',
      value: `Rp ${totalExpense.toLocaleString('id-ID')}`,
      subtitle: totalExpense > 0 ? 'Bulan Oktober 2026' : 'Belum ada pengeluaran',
      icon: ArrowDownRight,
      iconColor: 'text-indigo-400',
      iconBg: 'bg-indigo-500/15 border border-indigo-500/30 shadow-sm shadow-indigo-500/20',
      trend: totalExpense > 0 ? 'Terkendali' : 'Rp 0',
      trendUp: false,
    },
    {
      title: 'Budget Tersisa',
      value: `Rp ${remainingBudget.toLocaleString('id-ID')}`,
      subtitle: totalBudgetLimit > 0 ? `Dari limit Rp ${totalBudgetLimit.toLocaleString('id-ID')}` : 'Belum diset',
      icon: Target,
      iconColor: 'text-cyan-400',
      iconBg: 'bg-cyan-500/15 border border-cyan-500/30 shadow-sm shadow-cyan-500/20',
      trend: totalBudgetLimit > 0 ? `${Math.round(((totalBudgetLimit - remainingBudget) / totalBudgetLimit) * 100)}% terpakai` : 'Opsional',
      trendUp: false,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {cards.map((c, i) => {
        const Icon = c.icon;
        return (
          <Card key={i} className="p-4 sm:p-5 relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-gray-400 truncate">
                  {c.title}
                </span>
                <div className={`p-2 rounded-xl shrink-0 ${c.iconBg} ${c.iconColor}`}>
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
              </div>

              <div className="mt-2 sm:mt-3">
                <h3 className="text-xl sm:text-2xl font-extrabold font-mono text-white tracking-tight break-words">
                  {c.value}
                </h3>
                <div className="flex items-center justify-between mt-1.5 sm:mt-2 text-xs">
                  <span className="text-gray-400 truncate pr-2">{c.subtitle}</span>
                  <span className={`font-semibold shrink-0 ${c.trendUp ? 'text-emerald-400' : 'text-[#FF8533]'}`}>
                    {c.trend}
                  </span>
                </div>
              </div>
            </div>

            {i === 0 && onOpenTopUp && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={onOpenTopUp}
                  className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 active:scale-[0.98] border border-amber-300 text-black font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-amber-500/25"
                  title="Tambah Saldo Dompet"
                >
                  <span className="text-black font-extrabold">+ Tambah Saldo (Top Up)</span>
                </button>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
};
