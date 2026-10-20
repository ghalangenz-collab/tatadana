'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Wallet,
  Receipt,
  FileSpreadsheet,
  Target,
  Bot,
  Settings,
  LogOut,
  ShieldCheck,
  X,
} from 'lucide-react';
import { demoStore } from '@/lib/store/demo-store';
import { useMobileSidebar } from '@/lib/store/ui-store';

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { isOpen, close } = useMobileSidebar();
  const [profile, setProfile] = useState(demoStore.getProfile());

  const checkIsAdmin = () => {
    const user = demoStore.getCurrentUser();
    if (user) return user.role === 'admin';
    return demoStore.isAdminAuthenticated();
  };

  const [isAdmin, setIsAdmin] = useState(checkIsAdmin());

  // Automatically close mobile sidebar when path changes
  useEffect(() => {
    close();
  }, [pathname, close]);

  // Lock body scroll and listen for Escape key when mobile sidebar is open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, close]);

  useEffect(() => {
    demoStore.initFromClientStorage();
    setProfile(demoStore.getProfile());
    setIsAdmin(checkIsAdmin());

    const unsub = demoStore.subscribe(() => {
      setProfile(demoStore.getProfile());
      setIsAdmin(checkIsAdmin());
    });
    return () => unsub();
  }, []);

  const navItems = [
    { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Dompet Saya', href: '/dashboard/wallets', icon: Wallet },
    { label: 'Transaksi', href: '/dashboard/transactions', icon: Receipt },
    { label: 'Laporan & Export', href: '/dashboard/reports', icon: FileSpreadsheet, badge: 'PDF/XLSX' },
    { label: 'Budget Bulanan', href: '/dashboard/budgets', icon: Target },
    { label: 'Bot Simulator', href: '/dashboard/simulator', icon: Bot, highlight: true },
    { label: 'Pengaturan', href: '/dashboard/settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
          onClick={close}
          aria-hidden="true"
        />
      )}

      {/* Responsive Sidebar Drawer */}
      <aside
        className={`w-64 bg-[#0A0A0A] border-r border-[#1F2430] flex flex-col h-[100dvh] h-screen shrink-0 fixed left-0 top-0 z-50 transition-transform duration-300 ease-in-out md:translate-x-0 ${
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-[#1C2028] flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5" onClick={close}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-400 via-yellow-400 to-amber-500 flex items-center justify-center text-black font-extrabold shadow-lg shadow-amber-500/25">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-extrabold text-white tracking-tight">TataDana</span>
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  {profile.plan}
                </span>
              </div>
              <p className="text-[10px] text-amber-200/60 font-medium">Finance Bot SaaS</p>
            </div>
          </Link>

          {/* Close Button on Mobile Drawer */}
          <button
            type="button"
            onClick={close}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#181C24] md:hidden transition-colors"
            aria-label="Tutup menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Menu Utama
          </div>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={close}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all group ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-black shadow-lg shadow-amber-500/25 font-extrabold'
                    : 'text-slate-200 hover:text-amber-300 hover:bg-amber-400/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-black' : 'text-slate-400 group-hover:text-amber-300'}`} />
                  <span className={isActive ? 'text-black font-extrabold' : ''}>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-extrabold ${
                    isActive ? 'bg-black/20 text-black border border-black/30' : 'bg-[#181C24] text-amber-300 border border-amber-500/20'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}

          {/* Superadmin Menu - Only shown for Admin users */}
          {isAdmin && (
            <div className="pt-4 mt-2 border-t border-[#1E2433]">
              <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-blue-400 flex items-center justify-between">
                <span>Admin Khusus</span>
                <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded font-mono font-bold">SUPERADMIN</span>
              </div>
              <Link
                href="/admin"
                onClick={close}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all group bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/30 text-blue-300 hover:text-white shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm">⚡</span>
                  <span>Portal Superadmin</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-blue-500/30 text-blue-200">
                  ADMIN
                </span>
              </Link>
            </div>
          )}
        </nav>

        {/* Bottom Profile Section */}
        <div className="p-3 border-t border-[#1C2028] bg-[#0B0C0F]">
          <div className="p-2.5 rounded-xl bg-[#12141A] border border-[#1F2430] flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={profile.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                alt={profile.full_name}
                className="w-8 h-8 rounded-full object-cover border border-amber-400/60 shrink-0"
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">{profile.full_name}</p>
                <p className="text-[10px] text-amber-200/50 truncate">@{profile.telegram_username || 'telegram'}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                demoStore.logoutUser();
                window.location.href = '/login';
              }}
              title="Keluar"
              className="p-1.5 rounded-lg text-gray-400 hover:text-amber-400 hover:bg-white/5 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
