'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { StatCards } from '@/components/dashboard/StatCards';
import { Charts } from '@/components/dashboard/Charts';
import { RecentTransactions } from '@/components/dashboard/RecentTransactions';
import { AddTransactionModal } from '@/components/dashboard/AddTransactionModal';
import { TransferModal } from '@/components/dashboard/TransferModal';
import { TelegramSimulator } from '@/components/simulator/TelegramSimulator';
import { demoStore } from '@/lib/store/demo-store';
import { Bot, Sparkles, ExternalLink } from 'lucide-react';

export default function DashboardOverviewPage() {
  const [profile, setProfile] = useState(demoStore.getProfile());
  const [wallets, setWallets] = useState(demoStore.getWallets());
  const [transactions, setTransactions] = useState(demoStore.getTransactions());
  const [budgets, setBudgets] = useState(demoStore.getBudgets());

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addModalType, setAddModalType] = useState<'expense' | 'income'>('expense');
  const [isTransferOpen, setIsTransferOpen] = useState(false);

  useEffect(() => {
    // Hydrate store on mount
    demoStore.initFromClientStorage(true);

    const refreshData = () => {
      setProfile(demoStore.getProfile());
      setWallets([...demoStore.getWallets()]);
      const raw = demoStore.getTransactions();
      const map = new Map<string, any>();
      raw.forEach((t) => {
        if (t && t.id && !map.has(t.id)) map.set(t.id, t);
      });
      setTransactions(Array.from(map.values()));
      setBudgets([...demoStore.getBudgets()]);
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

    window.addEventListener('tatadana_wallets_updated', handleCustomEvents);
    window.addEventListener('tatadana_transactions_updated', handleCustomEvents);
    window.addEventListener('tatadana_store_updated', handleCustomEvents);
    window.addEventListener('storage', handleStorage);

    return () => {
      unsub();
      window.removeEventListener('tatadana_wallets_updated', handleCustomEvents);
      window.removeEventListener('tatadana_transactions_updated', handleCustomEvents);
      window.removeEventListener('tatadana_store_updated', handleCustomEvents);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const totalBalance = wallets.reduce((acc, w) => acc + w.balance, 0);
  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);
  const totalBudgetLimit = budgets.reduce((acc, b) => acc + b.monthly_limit, 0);
  const totalBudgetSpent = budgets.reduce((acc, b) => acc + (b.current_spent || 0), 0);
  const remainingBudget = Math.max(0, totalBudgetLimit - totalBudgetSpent);

  return (
    <div className="flex min-h-screen bg-[#0D0F12]">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 md:ml-64 ml-0 min-w-0">
        <Header
          title="Dashboard Overview"
          subtitle="Pantau seluruh arus kas, saldo, dan budget kamu secara real-time"
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

        <div className="p-4 sm:p-8 space-y-6 sm:space-y-8">


          {/* 4 Stats Cards */}
          <StatCards
            totalBalance={totalBalance}
            totalIncome={totalIncome}
            totalExpense={totalExpense}
            remainingBudget={remainingBudget}
            walletsCount={wallets.length}
            totalBudgetLimit={totalBudgetLimit}
            onOpenTopUp={() => {
              setAddModalType('income');
              setIsAddOpen(true);
            }}
          />

          {/* Charts (Category Pie, Monthly Bar, Daily Trend) */}
          <Charts />

          {/* Bottom Grid: Recent Transactions + Live Telegram Simulator */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7">
              <RecentTransactions transactions={transactions} />
            </div>

            <div className="lg:col-span-5 flex flex-col">
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-[#3B82F6]" />
                  <h4 className="text-sm font-bold text-white">Live Telegram Simulator</h4>
                </div>
                <Link
                  href="/dashboard/simulator"
                  className="text-xs text-[#60A5FA] hover:text-white font-semibold flex items-center gap-1 transition-colors bg-blue-500/10 hover:bg-blue-500/20 px-2 py-0.5 rounded-lg border border-blue-500/20"
                >
                  <span>Buka Layar Penuh</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
              <TelegramSimulator compact={true} />
            </div>
          </div>
        </div>
      </main>

      {/* Modals */}
      <AddTransactionModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        initialType={addModalType}
      />
      <TransferModal isOpen={isTransferOpen} onClose={() => setIsTransferOpen(false)} />
    </div>
  );
}
