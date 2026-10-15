'use client';

import React, { useState } from 'react';
import { Transaction } from '@/lib/types';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import {
  ChevronDown,
  ChevronUp,
  Receipt,
  MessageSquare,
  Mic,
  Camera,
  ArrowRightLeft,
  Calendar,
} from 'lucide-react';

interface RecentTransactionsProps {
  transactions: Transaction[];
  onDelete?: (id: string) => void;
}

export const RecentTransactions: React.FC<RecentTransactionsProps> = ({ transactions }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getSourceIcon = (source: Transaction['source']) => {
    switch (source) {
      case 'telegram_photo':
        return <Camera className="w-3.5 h-3.5 text-[#FF8533]" />;
      case 'telegram_voice':
        return <Mic className="w-3.5 h-3.5 text-blue-400" />;
      case 'telegram_text':
        return <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />;
      case 'transfer':
        return <ArrowRightLeft className="w-3.5 h-3.5 text-purple-400" />;
      default:
        return <Receipt className="w-3.5 h-3.5 text-gray-400" />;
    }
  };

  const getSourceLabel = (source: Transaction['source']) => {
    switch (source) {
      case 'telegram_photo':
        return 'Foto Struk';
      case 'telegram_voice':
        return 'Voice Note';
      case 'telegram_text':
        return 'Chat Telegram';
      case 'transfer':
        return 'Transfer';
      default:
        return 'Manual Web';
    }
  };

  return (
    <Card className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-bold text-white">Transaksi Terbaru</h4>
          <p className="text-xs text-gray-400">Sinkronisasi real-time dari bot Telegram & web</p>
        </div>
        <Badge variant="orange" size="sm">
          {transactions.length} Transaksi
        </Badge>
      </div>

      {transactions.length === 0 ? (
        <div className="py-12 text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[#181C24] border border-[#262C38] flex items-center justify-center mx-auto text-xl">
            🌱
          </div>
          <p className="text-sm font-bold text-white">Belum Ada Transaksi Tercatat</p>
          <p className="text-xs text-gray-400 max-w-sm mx-auto">
            Saldo awal Anda Rp 0 (kosong). Mulai catat pengeluaran atau pemasukan pertama Anda lewat tombol <strong>Catat Transaksi</strong> di atas atau kirim pesan di <strong>Bot Simulator</strong>!
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[#262C38]">
          {transactions.slice(0, 10).map((tx) => {
            const isExpanded = expandedId === tx.id;
            const hasItems = tx.receipt_items && tx.receipt_items.length > 0;

            return (
              <div key={tx.id} className="py-3.5 hover:bg-white/[0.02] transition-colors rounded-xl px-2">
              <div
                className="flex items-center justify-between cursor-pointer gap-2"
                onClick={() => hasItems && toggleExpand(tx.id)}
              >
                {/* Left: Category Icon & Details */}
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#181C24] border border-[#262C38] flex items-center justify-center text-base sm:text-lg shrink-0">
                    {tx.category?.icon || (tx.type === 'transfer' ? '⇄' : tx.type === 'income' ? '💰' : '💸')}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <p className="text-xs sm:text-sm font-semibold text-white truncate">{tx.description}</p>
                      {hasItems && (
                        <span className="text-[9px] sm:text-[10px] bg-[#FF6B00]/15 text-[#FF8533] px-1.5 py-0.5 rounded font-medium shrink-0 flex items-center gap-0.5">
                          {tx.receipt_items.length} item {isExpanded ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-[10px] sm:text-xs text-gray-400">
                      <span className="truncate max-w-[100px]">{tx.wallet?.name || 'Dompet Default'}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        {getSourceIcon(tx.source)}
                        <span>{getSourceLabel(tx.source)}</span>
                      </span>
                      <span>•</span>
                      <span>
                        {new Date(tx.transaction_date).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Nominal */}
                <div className="text-right shrink-0 pl-3">
                  <p
                    className={`text-sm font-bold font-mono ${
                      tx.type === 'income'
                        ? 'text-emerald-400'
                        : tx.type === 'expense'
                        ? 'text-rose-400'
                        : 'text-purple-400'
                    }`}
                  >
                    {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''} Rp{' '}
                    {tx.amount.toLocaleString('id-ID')}
                  </p>
                  <p className="text-[11px] text-gray-500 capitalize">{tx.category?.name || tx.type}</p>
                </div>
              </div>

              {/* Expandable itemized receipt breakdown */}
              {isExpanded && hasItems && (
                <div className="mt-3 p-3 sm:p-4 bg-[#11141A] rounded-xl border border-[#262C38] space-y-2 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-gray-400 border-b border-[#262C38] pb-1.5">
                    <span>Rincian Item Struk Belanja</span>
                    <span>Harga Satuan x Jumlah</span>
                  </div>
                  {tx.receipt_items.map((item, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-0.5 sm:gap-2 text-xs text-gray-300">
                      <span className="truncate">• {item.name}</span>
                      <span className="font-mono text-gray-400 shrink-0 text-right">
                        {item.qty}x @ Rp {item.price.toLocaleString('id-ID')} ={' '}
                        <strong className="text-white">Rp {(item.price * item.qty).toLocaleString('id-ID')}</strong>
                      </span>
                    </div>
                  ))}
                  {tx.receipt_url && (
                    <div className="pt-2 text-right">
                      <a
                        href={tx.receipt_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-[#FF8533] hover:underline"
                      >
                        Lihat Foto Struk Asli ↗
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      )}
    </Card>
  );
};
