'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { PieChart, BarChart3, TrendingUp, Calendar } from 'lucide-react';
import { demoStore } from '@/lib/store/demo-store';
import { Transaction } from '@/lib/types';

export const Charts: React.FC = () => {
  const [period, setPeriod] = useState<'harian' | 'mingguan' | 'bulanan' | 'tahunan' | 'custom'>('bulanan');
  const [customStart, setCustomStart] = useState('2026-10-01');
  const [customEnd, setCustomEnd] = useState('2026-10-31');
  const [transactions, setTransactions] = useState<Transaction[]>(demoStore.getTransactions());

  useEffect(() => {
    const unsub = demoStore.subscribe(() => {
      setTransactions(demoStore.getTransactions());
    });
    return () => unsub();
  }, []);

  // Filter transactions based on active period
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const currentMonthStr = now.toISOString().slice(0, 7);
  const currentYearStr = String(now.getFullYear());
  const sevenDaysAgoStr = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

  const filteredTransactions = transactions.filter((t) => {
    const dateStr = t.transaction_date.slice(0, 10);
    if (period === 'harian') {
      return dateStr === todayStr;
    } else if (period === 'mingguan') {
      return dateStr >= sevenDaysAgoStr && dateStr <= todayStr;
    } else if (period === 'bulanan') {
      return dateStr.startsWith(currentMonthStr);
    } else if (period === 'tahunan') {
      return dateStr.startsWith(currentYearStr);
    } else if (period === 'custom') {
      return dateStr >= customStart && dateStr <= customEnd;
    }
    return true;
  });

  // Category breakdown for filtered transactions
  const expenseTxs = filteredTransactions.filter((t) => t.type === 'expense');
  const totalExpense = expenseTxs.reduce((acc, t) => acc + t.amount, 0);

  const catMap: Record<string, { name: string; value: number; color: string }> = {};
  const defaultColors = ['#FF6B00', '#EF4444', '#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#06B6D4'];

  expenseTxs.forEach((tx) => {
    const catName = tx.category?.name || 'Lainnya';
    const catColor = tx.category?.color || defaultColors[Object.keys(catMap).length % defaultColors.length];
    if (!catMap[catName]) {
      catMap[catName] = { name: catName, value: 0, color: catColor };
    }
    catMap[catName].value += tx.amount;
  });

  let categoryData = Object.values(catMap)
    .sort((a, b) => b.value - a.value)
    .map((c) => ({
      ...c,
      percent: totalExpense > 0 ? Math.round((c.value / totalExpense) * 100) : 0,
    }));

  if (categoryData.length === 0) {
    categoryData = [
      { name: 'Belum Ada Pengeluaran', value: 0, color: '#262C38', percent: 100 },
    ];
  }

  // 6-Month Comparison data calculated dynamically from user transactions
  const monthLabels = ['Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt'];
  const monthKeys = ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'];
  const monthlyData = monthLabels.map((month, idx) => {
    const key = monthKeys[idx];
    const monthTxs = transactions.filter((t) => t.transaction_date.startsWith(key));
    const income = monthTxs.filter((t) => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const expense = monthTxs.filter((t) => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    return { month, income, expense };
  });

  const maxBarVal = Math.max(1000000, ...monthlyData.map((d) => Math.max(d.income, d.expense)));

  // Daily trend points for current month
  const dailySpendingMap: Record<number, number> = {};
  transactions
    .filter((t) => t.type === 'expense' && t.transaction_date.startsWith('2026-10'))
    .forEach((t) => {
      const day = new Date(t.transaction_date).getDate();
      dailySpendingMap[day] = (dailySpendingMap[day] || 0) + t.amount;
    });

  const daysInView = 13;
  const dailyValues: number[] = [];
  for (let d = 1; d <= daysInView; d++) {
    dailyValues.push(dailySpendingMap[d] || 0);
  }
  const maxDaily = Math.max(1, ...dailyValues);

  // Build SVG path for daily trend
  const svgWidth = 1200;
  const svgHeight = 200;
  const points = dailyValues.map((val, idx) => {
    const x = Math.round((idx / (daysInView - 1)) * svgWidth);
    const y = Math.round(svgHeight - (val / maxDaily) * 160 - 20);
    return `${x},${y}`;
  });

  const linePath = points.length > 0 ? `M ${points.join(' L ')}` : 'M 0,200 L 1200,200';
  const areaPath = points.length > 0 ? `${linePath} L ${svgWidth},${svgHeight} L 0,${svgHeight} Z` : '';

  // Calculate circumference and offsets for Donut chart
  const circumference = 2 * Math.PI * 38; // ~238.76
  let accumulatedPercent = 0;

  return (
    <div className="space-y-6">
      {/* Period Filter Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#14171D] p-3 rounded-2xl border border-[#262C38]">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-semibold text-gray-200">Filter Analisis:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 max-w-full">
          <div className="flex items-center gap-1 bg-[#181C24] p-1 rounded-xl border border-[#262C38] overflow-x-auto max-w-full scrollbar-none">
            {(['harian', 'mingguan', 'bulanan', 'tahunan', 'custom'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`text-xs px-3 py-1.5 rounded-lg capitalize font-medium transition-all whitespace-nowrap shrink-0 ${
                  period === p ? 'bg-[#2563EB] text-white shadow-md shadow-blue-500/25' : 'text-gray-400 hover:text-white'
                }`}
              >
                {p === 'custom' ? 'Custom Range' : p}
              </button>
            ))}
          </div>

          {period === 'custom' && (
            <div className="flex items-center gap-2 text-xs">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="bg-[#181C24] border border-[#262C38] rounded-lg px-2.5 py-1 text-white text-xs outline-none focus:border-blue-500"
              />
              <span className="text-gray-400">s/d</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="bg-[#181C24] border border-[#262C38] rounded-lg px-2.5 py-1 text-white text-xs outline-none focus:border-blue-500"
              />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. Category Pie Chart */}
        <Card className="p-4 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <PieChart className="w-4 h-4 text-blue-400" />
                Pengeluaran per Kategori
              </h4>
              <span className="text-xs text-blue-400/80 font-medium capitalize bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">{period}</span>
            </div>

            {/* SVG Donut Chart */}
            <div className="relative flex items-center justify-center my-4">
              <svg viewBox="0 0 100 100" className="w-44 h-44 -rotate-90 transform">
                {/* Background ring */}
                <circle cx="50" cy="50" r="38" fill="none" stroke="#1E232D" strokeWidth="16" />

                {/* Dynamic SVG slices */}
                {totalExpense > 0 &&
                  categoryData.map((cat, idx) => {
                    const strokeDash = (cat.percent / 100) * circumference;
                    const strokeOffset = -(accumulatedPercent / 100) * circumference;
                    accumulatedPercent += cat.percent;

                    return (
                      <circle
                        key={idx}
                        cx="50"
                        cy="50"
                        r="38"
                        fill="none"
                        stroke={cat.color}
                        strokeWidth="16"
                        strokeDasharray={`${strokeDash} ${circumference}`}
                        strokeDashoffset={strokeOffset}
                      />
                    );
                  })}
              </svg>
              <div className="absolute text-center px-4">
                <span className="text-xs text-gray-400">Total Keluar</span>
                <p className="text-sm font-bold font-mono text-white mt-0.5">
                  Rp {totalExpense.toLocaleString('id-ID')}
                </p>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="space-y-2 mt-4 pt-4 border-t border-[#262C38]">
            {categoryData.slice(0, 4).map((cat, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="text-gray-300 truncate max-w-[140px]">{cat.name}</span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-gray-400">Rp {(cat.value / 1000).toLocaleString('id-ID')}k</span>
                  <span className="font-semibold text-white">{cat.percent}%</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* 2. Bar Chart: Pemasukan vs Pengeluaran 6 Bulan Terakhir */}
        <Card className="p-4 sm:p-6 lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-400" />
                Pemasukan vs Pengeluaran (6 Bulan Terakhir)
              </h4>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5 text-gray-300">
                  <span className="w-2.5 h-2.5 rounded bg-emerald-500" /> Pemasukan
                </span>
                <span className="flex items-center gap-1.5 text-gray-300">
                  <span className="w-2.5 h-2.5 rounded bg-[#FF6B00]" /> Pengeluaran
                </span>
              </div>
            </div>

            {/* Custom SVG Bar Chart */}
            <div className="h-56 flex items-end justify-between gap-1.5 sm:gap-3 pt-6 pb-2 px-1 sm:px-2">
              {monthlyData.map((d, i) => {
                const incHeight = Math.max(5, Math.round((d.income / maxBarVal) * 100));
                const expHeight = Math.max(5, Math.round((d.expense / maxBarVal) * 100));

                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                    <div className="w-full flex items-end justify-center gap-1 sm:gap-1.5 h-full">
                      {/* Income Bar */}
                      <div
                        className="w-1/2 max-w-[16px] sm:max-w-[24px] bg-emerald-500 rounded-t-md hover:bg-emerald-400 transition-all cursor-pointer group relative"
                        style={{ height: `${incHeight}%` }}
                      >
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-black/90 text-emerald-400 text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                          Rp {(d.income / 1000000).toFixed(1)}jt
                        </div>
                      </div>

                      {/* Expense Bar */}
                      <div
                        className="w-1/2 max-w-[16px] sm:max-w-[24px] bg-[#FF6B00] rounded-t-md hover:bg-[#FF8533] transition-all cursor-pointer group relative"
                        style={{ height: `${expHeight}%` }}
                      >
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-black/90 text-[#FF8533] text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                          Rp {(d.expense / 1000000).toFixed(1)}jt
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] sm:text-[11px] text-gray-400 font-medium">{d.month}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#262C38] flex items-center justify-between text-xs text-gray-400">
            <span>Rata-rata tabungan per bulan: <strong className="text-emerald-400">62.8%</strong></span>
            <span>Surplus akumulatif: <strong className="text-white">Rp 58.750.000</strong></span>
          </div>
        </Card>
      </div>

      {/* 3. Trend Line: Pengeluaran Harian Bulan Ini */}
      <Card className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#FF8533]" />
            <h4 className="text-sm font-bold text-white">Trend Pengeluaran Harian (Bulan Berjalan)</h4>
          </div>
          <span className="text-xs text-gray-400">Puncak: Rp {maxDaily.toLocaleString('id-ID')}</span>
        </div>

        {/* SVG Sparkline / Line Chart */}
        <div className="w-full h-32 relative">
          <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 1200 200">
            {/* Horizontal Grid lines */}
            <line x1="0" y1="50" x2="1200" y2="50" stroke="#262C38" strokeDasharray="4 4" />
            <line x1="0" y1="100" x2="1200" y2="100" stroke="#262C38" strokeDasharray="4 4" />
            <line x1="0" y1="150" x2="1200" y2="150" stroke="#262C38" strokeDasharray="4 4" />

            {/* Gradient fill */}
            <defs>
              <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FF6B00" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#FF6B00" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Area */}
            {areaPath && <path d={areaPath} fill="url(#trendGradient)" />}

            {/* Stroke Line */}
            {linePath && <path d={linePath} fill="none" stroke="#FF6B00" strokeWidth="3" />}
          </svg>
        </div>

        <div className="flex justify-between mt-3 text-[10px] text-gray-500 font-mono">
          <span>01 Okt</span>
          <span>03 Okt</span>
          <span>05 Okt</span>
          <span>08 Okt</span>
          <span>10 Okt <span className="hidden sm:inline">(Spike Tagihan)</span></span>
          <span>13 Okt</span>
        </div>
      </Card>
    </div>
  );
};
