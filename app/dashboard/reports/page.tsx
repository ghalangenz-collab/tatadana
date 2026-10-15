'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { demoStore } from '@/lib/store/demo-store';
import {
  FileSpreadsheet,
  FileText,
  Download,
  Calendar,
  Filter,
  Search,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Sparkles,
  TrendingDown,
  TrendingUp,
  History,
} from 'lucide-react';
import {
  generateCSVReport,
  downloadFile,
  generateHTMLPrintablePDF,
} from '@/lib/export/export-helper';

export default function ReportsPage() {
  const [transactions, setTransactions] = useState(demoStore.getTransactions());
  const [categories] = useState(demoStore.getCategories());
  const [wallets] = useState(demoStore.getWallets());
  const [exports, setExports] = useState(demoStore.getReportExports());

  const [startDate, setStartDate] = useState('2026-10-01');
  const [endDate, setEndDate] = useState('2026-10-31');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedWallet, setSelectedWallet] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<'date' | 'amount' | 'category' | 'wallet'>('date');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    const unsub = demoStore.subscribe(() => {
      setTransactions(demoStore.getTransactions());
      setExports(demoStore.getReportExports());
    });
    return () => unsub();
  }, []);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [startDate, endDate, selectedCategory, selectedWallet, selectedType, search]);

  const toggleSort = (field: 'date' | 'amount' | 'category' | 'wallet') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Filtered transactions for the report
  const filtered = transactions
    .filter((tx) => {
      const txDate = tx.transaction_date.slice(0, 10);
      if (txDate < startDate || txDate > endDate) return false;
      if (selectedType !== 'all' && tx.type !== selectedType) return false;
      if (selectedCategory !== 'all' && tx.category_id !== selectedCategory) return false;
      if (selectedWallet !== 'all' && tx.wallet_id !== selectedWallet) return false;
      if (search && !tx.description.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortField === 'date') {
        const dateA = new Date(a.transaction_date).getTime();
        const dateB = new Date(b.transaction_date).getTime();
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
      } else if (sortField === 'amount') {
        return sortOrder === 'desc' ? b.amount - a.amount : a.amount - b.amount;
      } else if (sortField === 'category') {
        const catA = a.category?.name || '';
        const catB = b.category?.name || '';
        return sortOrder === 'desc' ? catB.localeCompare(catA) : catA.localeCompare(catB);
      } else if (sortField === 'wallet') {
        const walA = a.wallet?.name || '';
        const walB = b.wallet?.name || '';
        return sortOrder === 'desc' ? walB.localeCompare(walA) : walA.localeCompare(walB);
      }
      return 0;
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginatedTransactions = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Summary Metrics
  const totalIncome = filtered
    .filter((t) => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = filtered
    .filter((t) => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);
  const netCashflow = totalIncome - totalExpense;

  // Top 5 Expense Categories
  const categorySpendingMap: Record<string, { name: string; amount: number; icon: string }> = {};
  filtered
    .filter((t) => t.type === 'expense')
    .forEach((tx) => {
      const catName = tx.category?.name || 'Lainnya';
      const catIcon = tx.category?.icon || '📁';
      if (!categorySpendingMap[catName]) {
        categorySpendingMap[catName] = { name: catName, amount: 0, icon: catIcon };
      }
      categorySpendingMap[catName].amount += tx.amount;
    });

  const top5Categories = Object.values(categorySpendingMap)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  // Handle Excel (.xlsx / CSV) Export
  const handleExportExcel = () => {
    setIsExporting(true);
    try {
      const csv = generateCSVReport(filtered);
      const filename = `TataDana_Laporan_${startDate}_sd_${endDate}.csv`;
      downloadFile(csv, filename, 'text/csv;charset=utf-8;');
      demoStore.addReportExport(
        `Laporan Excel (${startDate} s/d ${endDate})`,
        'xlsx',
        startDate,
        endDate
      );
    } finally {
      setIsExporting(false);
    }
  };

  // Handle PDF Export (Opens formatted printable view)
  const handleExportPDF = () => {
    setIsExporting(true);
    try {
      const html = generateHTMLPrintablePDF(filtered, startDate, endDate, totalIncome, totalExpense);
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
      }
      demoStore.addReportExport(
        `Laporan PDF (${startDate} s/d ${endDate})`,
        'pdf',
        startDate,
        endDate
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#0D0F12]">
      <Sidebar />

      <main className="flex-1 md:ml-64 ml-0 min-w-0">
        <Header
          title="Laporan & Ekspor Keuangan"
          subtitle="Analisis arus kas mendalam, ringkasan kategori, dan cetak PDF / Excel"
        />

        <div className="p-4 sm:p-8 space-y-6">
          {/* Top Actions: Export PDF & Excel */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#14171D] p-5 rounded-2xl border border-[#262C38]">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-[#FF8533]" />
                Download Laporan Keuangan On-Demand
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Generate instan laporan periode terpilih untuk arsip pajak atau evaluasi bulanan
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <Button
                variant="secondary"
                size="md"
                onClick={handleExportExcel}
                isLoading={isExporting}
                icon={<FileSpreadsheet className="w-4 h-4 text-emerald-400" />}
                className="flex-1 sm:flex-initial text-xs sm:text-sm py-2 px-3 sm:px-4"
              >
                Export Excel (.xlsx)
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleExportPDF}
                isLoading={isExporting}
                icon={<FileText className="w-4 h-4" />}
                className="flex-1 sm:flex-initial text-xs sm:text-sm py-2 px-3 sm:px-4"
              >
                <span className="hidden sm:inline">Cetak / Download PDF</span>
                <span className="sm:hidden">Cetak PDF</span>
              </Button>
            </div>
          </div>

          {/* Period & Filter Controls */}
          <Card className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 mb-1">Mulai Tanggal</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-[#181C24] border border-[#262C38] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#FF6B00]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-400 mb-1">Sampai Tanggal</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-[#181C24] border border-[#262C38] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#FF6B00]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-400 mb-1">Jenis Transaksi</label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full bg-[#181C24] border border-[#262C38] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#FF6B00]"
                >
                  <option value="all">Semua Jenis</option>
                  <option value="expense">Pengeluaran</option>
                  <option value="income">Pemasukan</option>
                  <option value="transfer">Transfer</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-400 mb-1">Kategori</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full bg-[#181C24] border border-[#262C38] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#FF6B00]"
                >
                  <option value="all">Semua Kategori</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon} {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-400 mb-1">Dompet</label>
                <select
                  value={selectedWallet}
                  onChange={(e) => setSelectedWallet(e.target.value)}
                  className="w-full bg-[#181C24] border border-[#262C38] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#FF6B00]"
                >
                  <option value="all">Semua Dompet</option>
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-400 mb-1">Cari Catatan</label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Kata kunci..."
                    className="w-full bg-[#181C24] border border-[#262C38] rounded-xl pl-8 pr-3 py-2 text-xs text-white outline-none focus:border-[#FF6B00]"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-5">
              <span className="text-xs text-gray-400 uppercase font-semibold">Total Pemasukan Periode Ini</span>
              <p className="text-2xl font-bold font-mono text-emerald-400 mt-2">
                Rp {totalIncome.toLocaleString('id-ID')}
              </p>
            </Card>

            <Card className="p-5">
              <span className="text-xs text-gray-400 uppercase font-semibold">Total Pengeluaran Periode Ini</span>
              <p className="text-2xl font-bold font-mono text-rose-400 mt-2">
                Rp {totalExpense.toLocaleString('id-ID')}
              </p>
            </Card>

            <Card className="p-5">
              <span className="text-xs text-gray-400 uppercase font-semibold">Net Cashflow</span>
              <p
                className={`text-2xl font-bold font-mono mt-2 ${
                  netCashflow >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {netCashflow >= 0 ? '+' : ''} Rp {netCashflow.toLocaleString('id-ID')}
              </p>
            </Card>
          </div>

          {/* Top 5 Categories & Export History */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top 5 Expenses */}
            <Card className="p-6">
              <h4 className="text-sm font-bold text-white mb-3">Top 5 Kategori Pengeluaran Terbesar</h4>
              <div className="space-y-3">
                {top5Categories.length === 0 ? (
                  <p className="text-xs text-gray-400">Belum ada pengeluaran pada filter ini.</p>
                ) : (
                  top5Categories.map((c, i) => {
                    const pct = totalExpense > 0 ? Math.round((c.amount / totalExpense) * 100) : 0;
                    return (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-300">
                            {c.icon} {c.name}
                          </span>
                          <span className="font-mono text-white">
                            Rp {c.amount.toLocaleString('id-ID')} ({pct}%)
                          </span>
                        </div>
                        <div className="w-full bg-[#181C24] h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-[#FF6B00] h-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>

            {/* Riwayat Export Tersimpan */}
            <Card className="p-6 lg:col-span-2">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-[#FF8533]" />
                  Riwayat Export Tersimpan
                </h4>
                <span className="text-xs text-gray-400">Download ulang tanpa generate baru</span>
              </div>

              <div className="divide-y divide-[#262C38] max-h-48 overflow-y-auto">
                {exports.map((exp) => (
                  <div key={exp.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      {exp.format === 'pdf' ? (
                        <FileText className="w-4 h-4 text-rose-400" />
                      ) : (
                        <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                      )}
                      <div>
                        <p className="font-semibold text-white">{exp.title}</p>
                        <p className="text-[10px] text-gray-400">
                          {new Date(exp.created_at).toLocaleDateString('id-ID')} • {exp.file_size}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => (exp.format === 'pdf' ? handleExportPDF() : handleExportExcel())}
                      icon={<Download className="w-3.5 h-3.5" />}
                    >
                      Download
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Full Transactions Report Table */}
          <Card className="overflow-hidden">
            <div className="p-4 border-b border-[#262C38] flex flex-wrap items-center justify-between gap-3">
              <h4 className="text-sm font-bold text-white">Tabel Rincian Transaksi ({filtered.length} Data)</h4>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => toggleSort('date')}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-colors flex items-center gap-1 ${
                    sortField === 'date' ? 'bg-[#FF6B00]/15 border-[#FF6B00] text-[#FF8533]' : 'bg-[#181C24] border-[#262C38] text-gray-400 hover:text-white'
                  }`}
                >
                  <ArrowUpDown className="w-3 h-3" />
                  <span>Tanggal {sortField === 'date' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}</span>
                </button>
                <button
                  onClick={() => toggleSort('category')}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-colors flex items-center gap-1 ${
                    sortField === 'category' ? 'bg-[#FF6B00]/15 border-[#FF6B00] text-[#FF8533]' : 'bg-[#181C24] border-[#262C38] text-gray-400 hover:text-white'
                  }`}
                >
                  <ArrowUpDown className="w-3 h-3" />
                  <span>Kategori {sortField === 'category' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}</span>
                </button>
                <button
                  onClick={() => toggleSort('wallet')}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-colors flex items-center gap-1 ${
                    sortField === 'wallet' ? 'bg-[#FF6B00]/15 border-[#FF6B00] text-[#FF8533]' : 'bg-[#181C24] border-[#262C38] text-gray-400 hover:text-white'
                  }`}
                >
                  <ArrowUpDown className="w-3 h-3" />
                  <span>Dompet {sortField === 'wallet' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}</span>
                </button>
                <button
                  onClick={() => toggleSort('amount')}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-colors flex items-center gap-1 ${
                    sortField === 'amount' ? 'bg-[#FF6B00]/15 border-[#FF6B00] text-[#FF8533]' : 'bg-[#181C24] border-[#262C38] text-gray-400 hover:text-white'
                  }`}
                >
                  <ArrowUpDown className="w-3 h-3" />
                  <span>Nominal {sortField === 'amount' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-xs">
                <thead className="bg-[#181C24] text-gray-400 uppercase font-semibold">
                  <tr>
                    <th className="p-4 cursor-pointer hover:text-white" onClick={() => toggleSort('date')}>
                      Tanggal {sortField === 'date' ? (sortOrder === 'desc' ? '▼' : '▲') : ''}
                    </th>
                    <th className="p-4">Keterangan</th>
                    <th className="p-4 cursor-pointer hover:text-white" onClick={() => toggleSort('category')}>
                      Kategori {sortField === 'category' ? (sortOrder === 'desc' ? '▼' : '▲') : ''}
                    </th>
                    <th className="p-4 cursor-pointer hover:text-white" onClick={() => toggleSort('wallet')}>
                      Dompet {sortField === 'wallet' ? (sortOrder === 'desc' ? '▼' : '▲') : ''}
                    </th>
                    <th className="p-4 text-right cursor-pointer hover:text-white" onClick={() => toggleSort('amount')}>
                      Nominal {sortField === 'amount' ? (sortOrder === 'desc' ? '▼' : '▲') : ''}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262C38]">
                  {paginatedTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-400">
                        Tidak ada transaksi ditemukan pada rentang filter ini.
                      </td>
                    </tr>
                  ) : (
                    paginatedTransactions.map((tx) => {
                      const isExpanded = expandedId === tx.id;
                      const hasItems = tx.receipt_items && tx.receipt_items.length > 0;

                      return (
                        <React.Fragment key={tx.id}>
                          <tr className="hover:bg-white/[0.02]">
                            <td className="p-4 font-mono text-gray-400 whitespace-nowrap">
                              {new Date(tx.transaction_date).toLocaleDateString('id-ID')}
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-white">{tx.description}</span>
                                {hasItems && (
                                  <button
                                    onClick={() => setExpandedId(isExpanded ? null : tx.id)}
                                    className="text-[10px] bg-[#FF6B00]/15 text-[#FF8533] px-2 py-0.5 rounded-full font-medium flex items-center gap-1"
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
                            </td>
                            <td className="p-4">
                              {tx.category ? `${tx.category.icon} ${tx.category.name}` : '-'}
                            </td>
                            <td className="p-4">{tx.wallet?.name || '-'}</td>
                            <td
                              className={`p-4 text-right font-mono font-bold whitespace-nowrap ${
                                tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {tx.type === 'income' ? '+' : '-'} Rp {tx.amount.toLocaleString('id-ID')}
                            </td>
                          </tr>

                          {/* Expandable item details */}
                          {isExpanded && hasItems && (
                            <tr className="bg-[#11141A]">
                              <td colSpan={5} className="p-4 border-l-2 border-[#FF6B00]">
                                <div className="space-y-1">
                                  <p className="text-xs font-semibold text-[#FF8533] mb-1.5">
                                    Rincian Struk Pembelian:
                                  </p>
                                  {tx.receipt_items.map((it, idx) => (
                                    <div
                                      key={idx}
                                      className="flex justify-between text-xs text-gray-300 max-w-md"
                                    >
                                      <span>• {it.name} ({it.qty}x)</span>
                                      <span className="font-mono text-white">
                                        Rp {(it.price * it.qty).toLocaleString('id-ID')}
                                      </span>
                                    </div>
                                  ))}
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

            {/* Pagination Controls */}
            {filtered.length > 0 && (
              <div className="p-4 border-t border-[#262C38] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400">
                <div>
                  Menampilkan{' '}
                  <strong className="text-white font-mono">
                    {Math.min(filtered.length, (currentPage - 1) * pageSize + 1)} -{' '}
                    {Math.min(filtered.length, currentPage * pageSize)}
                  </strong>{' '}
                  dari <strong className="text-white font-mono">{filtered.length}</strong> transaksi
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  >
                    Sebelumnya
                  </Button>
                  <span className="px-2 font-mono text-white">
                    Halaman {currentPage} dari {totalPages}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Selanjutnya
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}
