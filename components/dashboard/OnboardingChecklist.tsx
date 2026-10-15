'use client';

import React from 'react';
import Link from 'next/link';
import { CheckCircle2, Circle, ArrowRight, Bot, Wallet, Target, Sparkles } from 'lucide-react';
import { Card } from '../ui/Card';

interface OnboardingChecklistProps {
  isTelegramLinked: boolean;
  hasCustomWallet: boolean;
  hasBudgetSet: boolean;
}

export const OnboardingChecklist: React.FC<OnboardingChecklistProps> = ({
  isTelegramLinked,
  hasCustomWallet,
  hasBudgetSet,
}) => {
  const steps = [
    {
      title: 'Hubungkan Bot Telegram',
      desc: 'Masukkan token bot dari @BotFather atau simulasikan di tab Bot Simulator.',
      done: isTelegramLinked,
      href: '/dashboard/settings',
      icon: Bot,
    },
    {
      title: 'Atur Dompet Utama',
      desc: 'Buat dompet rekening BCA, Mandiri, Cash, atau GoPay dan set sebagai default.',
      done: hasCustomWallet,
      href: '/dashboard/wallets',
      icon: Wallet,
    },
    {
      title: 'Tetapkan Budget Bulanan',
      desc: 'Set batas pengeluaran per kategori agar bot bisa memberi peringatan saat 80% & 100%.',
      done: hasBudgetSet,
      href: '/dashboard/budgets',
      icon: Target,
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const allCompleted = completedCount === steps.length;

  if (allCompleted) return null;

  return (
    <Card className="p-5 border-[#FF6B00]/40 bg-gradient-to-r from-[#181C24] to-[#14171D] relative overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#262C38]">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#FF8533]" />
            <h4 className="text-sm font-bold text-white">Langkah Awal Setup Akun TataDana</h4>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            Selesaikan checklist berikut untuk pengalaman otomatisasi keuangan maksimal ({completedCount}/3 selesai).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-24 bg-[#262C38] h-2 rounded-full overflow-hidden">
            <div
              className="bg-[#FF6B00] h-full transition-all duration-500"
              style={{ width: `${(completedCount / 3) * 100}%` }}
            />
          </div>
          <span className="text-xs font-bold text-[#FF8533]">
            {Math.round((completedCount / 3) * 100)}%
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          return (
            <Link
              key={idx}
              href={step.href}
              className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                step.done
                  ? 'bg-emerald-500/5 border-emerald-500/20 text-gray-300'
                  : 'bg-[#181C24] border-[#262C38] hover:border-[#FF6B00]/40'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-lg bg-white/5">
                    <Icon className={`w-4 h-4 ${step.done ? 'text-emerald-400' : 'text-[#FF8533]'}`} />
                  </div>
                  {step.done ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Circle className="w-4 h-4 text-gray-500" />
                  )}
                </div>
                <h5 className="text-xs font-bold text-white">{step.title}</h5>
                <p className="text-[11px] text-gray-400 mt-1 line-clamp-2">{step.desc}</p>
              </div>

              <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-[#FF8533]">
                <span>{step.done ? 'Sudah Selesai' : 'Lakukan Sekarang'}</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </Link>
          );
        })}
      </div>
    </Card>
  );
};
