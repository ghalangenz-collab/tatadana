'use client';

import React from 'react';
import Link from 'next/link';
import { Plus, ArrowLeftRight, Bot, Menu } from 'lucide-react';
import { Button } from '../ui/Button';
import { demoStore } from '@/lib/store/demo-store';
import { useMobileSidebar } from '@/lib/store/ui-store';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onOpenAddModal?: () => void;
  onOpenTransferModal?: () => void;
  onOpenTopUpModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onOpenAddModal,
  onOpenTransferModal,
  onOpenTopUpModal,
}) => {
  const profile = demoStore.getProfile();
  const { toggle } = useMobileSidebar();

  return (
    <header className="sticky top-0 z-20 bg-[#0D0F12]/90 backdrop-blur-md border-b border-[#262C38] px-4 sm:px-8 py-3 sm:py-4 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
      {/* Title & Hamburger Menu for Mobile */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={toggle}
          className="p-2 -ml-1 rounded-xl text-slate-300 hover:text-white hover:bg-[#181C24] border border-[#262C38] md:hidden transition-all shrink-0 active:scale-95"
          aria-label="Buka Menu Navigasi"
          title="Buka Menu"
        >
          <Menu className="w-5 h-5 text-slate-200" />
        </button>

        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight truncate">{title}</h1>
          {subtitle && (
            <p className="text-xs text-gray-400 mt-0.5 truncate sm:whitespace-normal">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Action Buttons & Simulator Pill */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {/* Telegram Connection Pill / Simulator Shortcut */}
        <Link
          href="/dashboard/simulator"
          title="Buka Bot Simulator Real-Time"
          className="hidden sm:flex items-center gap-2 bg-[#181C24] hover:bg-[#1E2433] border border-slate-700/80 hover:border-slate-400/60 px-3 py-1.5 rounded-xl transition-all cursor-pointer group shadow-sm text-xs"
        >
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <Bot className="w-4 h-4 text-slate-300 group-hover:text-white transition-colors" />
          <span className="text-slate-300 group-hover:text-white font-medium truncate max-w-[120px]">
            @{profile.telegram_username || 'rumahtatdanabot'}
          </span>
          <span className="text-[10px] text-slate-200 bg-white/10 border border-white/20 px-1.5 py-0.2 rounded font-semibold ml-0.5">
            Simulator
          </span>
        </Link>

        {onOpenTopUpModal && (
          <Button
            variant="primary"
            size="sm"
            onClick={onOpenTopUpModal}
            icon={<Plus className="w-3.5 h-3.5 text-white" />}
            className="bg-emerald-600 hover:bg-emerald-500 text-white border-none shadow-md shadow-emerald-600/30 text-xs py-1.5 px-2.5 sm:px-3"
          >
            <span className="hidden sm:inline">Tambah Saldo</span>
            <span className="sm:hidden">Top Up</span>
          </Button>
        )}

        {onOpenTransferModal && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onOpenTransferModal}
            icon={<ArrowLeftRight className="w-3.5 h-3.5 text-slate-300" />}
            className="text-xs py-1.5 px-2.5 sm:px-3"
          >
            Transfer
          </Button>
        )}

        {onOpenAddModal && (
          <Button
            variant="primary"
            size="sm"
            onClick={onOpenAddModal}
            icon={<Plus className="w-3.5 h-3.5" />}
            className="text-xs py-1.5 px-2.5 sm:px-3"
          >
            <span className="hidden sm:inline">Catat Transaksi</span>
            <span className="sm:hidden">Catat</span>
          </Button>
        )}
      </div>
    </header>
  );
};
