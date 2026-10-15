'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { demoStore } from '@/lib/store/demo-store';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isChecked, setIsChecked] = useState(false);

  useEffect(() => {
    demoStore.initFromClientStorage();
    const user = demoStore.getCurrentUser();
    const isAdmin = demoStore.isAdminAuthenticated();

    if (user) {
      if (user.status !== 'approved' || !user.is_verified) {
        router.push('/verify');
        return;
      }
    } else if (isAdmin) {
      // Admin session is active, allow previewing the user dashboard
    } else {
      // If user has not logged in, redirect to login
      router.push('/login');
      return;
    }

    setIsChecked(true);

    const unsub = demoStore.subscribe(() => {
      const freshUser = demoStore.getCurrentUser();
      const freshAdmin = demoStore.isAdminAuthenticated();
      if (!freshUser && !freshAdmin) {
        router.push('/login');
      } else if (freshUser && (freshUser.status !== 'approved' || !freshUser.is_verified)) {
        router.push('/verify');
      }
    });

    return () => unsub();
  }, [router]);

  if (!isChecked) {
    return (
      <div className="min-h-screen bg-[#0D0F12] flex items-center justify-center text-gray-400 text-xs font-mono">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
          <span>Memverifikasi izin akses TataDana...</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
