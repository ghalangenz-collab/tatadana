'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { demoStore } from '@/lib/store/demo-store';
import { AIProvider, Subscription, AILog, UserAccount } from '@/lib/types';
import {
  ShieldAlert,
  Cpu,
  Users,
  CreditCard,
  Activity,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Key,
  KeyRound,
  ExternalLink,
  UserCheck,
  UserX,
  Copy,
  Clock,
  Lock,
  LogOut,
  RefreshCw,
  MessageCircle,
  Phone,
  Save,
  Check,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<'approvals' | 'providers' | 'payments' | 'logs' | 'users'>('approvals');
  const [isAdminAuth, setIsAdminAuth] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('admin');
  const [adminAuthError, setAdminAuthError] = useState('');

  const [adminAuthMode, setAdminAuthMode] = useState<'login' | 'register'>('login');
  const [adminIdentifierInput, setAdminIdentifierInput] = useState('admin');
  const [adminFullNameInput, setAdminFullNameInput] = useState('');
  const [adminEmailInput, setAdminEmailInput] = useState('');
  const [adminPhoneInput, setAdminPhoneInput] = useState('');
  const [adminRegPasswordInput, setAdminRegPasswordInput] = useState('');

  const [users, setUsers] = useState<UserAccount[]>([]);
  const [providers, setProviders] = useState<AIProvider[]>(demoStore.getAIProviders());
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(demoStore.getSubscriptions());
  const [aiLogs, setAiLogs] = useState<AILog[]>(demoStore.getAILogs());
  const [aiMode, setAiMode] = useState(demoStore.getAIExecutionMode());

  const [editingProvider, setEditingProvider] = useState<AIProvider | null>(null);
  const [editApiKey, setEditApiKey] = useState('');

  // Code generation modal after approving
  const [generatedCodeModal, setGeneratedCodeModal] = useState<{
    userName: string;
    code: string;
  } | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const [adminWhatsApp, setAdminWhatsApp] = useState(demoStore.getAdminWhatsApp());
  const [waSavedSuccess, setWaSavedSuccess] = useState(false);

  useEffect(() => {
    demoStore.initFromClientStorage(true);
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autologin') === 'true' || params.get('login') === 'admin') {
        demoStore.loginAdmin('admin', 'admin');
      }
    }
    setIsAdminAuth(demoStore.isAdminAuthenticated());
    setUsers(demoStore.getUsers());
    setProviders(demoStore.getAIProviders());
    setSubscriptions(demoStore.getSubscriptions());
    setAiLogs(demoStore.getAILogs());
    setAiMode(demoStore.getAIExecutionMode());
    setAdminWhatsApp(demoStore.getAdminWhatsApp());

    const unsub = demoStore.subscribe(() => {
      setIsAdminAuth(demoStore.isAdminAuthenticated());
      setUsers(demoStore.getUsers());
      setProviders(demoStore.getAIProviders());
      setSubscriptions(demoStore.getSubscriptions());
      setAiLogs(demoStore.getAILogs());
      setAiMode(demoStore.getAIExecutionMode());
      setAdminWhatsApp(demoStore.getAdminWhatsApp());
    });
    return () => unsub();
  }, []);

  const handleInstantAdminLogin = () => {
    const res = demoStore.loginAdmin('admin', 'admin');
    if (res.success) {
      setIsAdminAuth(true);
      setAdminAuthError('');
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const id = adminIdentifierInput.trim() || 'admin';
    const pass = adminPasswordInput.trim() || 'admin';
    const res = demoStore.loginAdmin(id, pass);
    if (res.success) {
      setIsAdminAuth(true);
      setAdminAuthError('');
    } else {
      setAdminAuthError(res.error || 'Kata sandi admin salah. Masukkan kata sandi admin yang benar.');
    }
  };

  const handleAdminRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminFullNameInput.trim() || !adminEmailInput.trim() || !adminRegPasswordInput.trim()) {
      setAdminAuthError('Semua kolom pendaftaran admin wajib diisi.');
      return;
    }
    demoStore.registerAdmin({
      fullName: adminFullNameInput.trim(),
      email: adminEmailInput.trim(),
      phone: adminPhoneInput.trim() || '+6281234567890',
      password: adminRegPasswordInput.trim(),
    });
    setIsAdminAuth(true);
    setAdminAuthError('');
  };

  const handleAdminLogout = () => {
    demoStore.logoutAdmin();
    setIsAdminAuth(false);
  };

  const handleApproveUser = (userId: string) => {
    const targetUser = users.find((u) => u.id === userId);
    const res = demoStore.approveUser(userId);
    if (res.success) {
      setGeneratedCodeModal({
        userName: targetUser?.full_name || 'Pengguna',
        code: res.verification_code,
      });
      setCopySuccess(false);
    }
  };

  const handleRejectUser = (userId: string) => {
    if (confirm('Yakin ingin menolak pendaftaran akun ini?')) {
      demoStore.rejectUser(userId);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  };

  const handleToggleProviderActive = (id: string, current: boolean) => {
    demoStore.updateAIProvider(id, { is_active: !current });
  };

  const handleSetPrimary = (id: string) => {
    providers.forEach((p) => {
      demoStore.updateAIProvider(p.id, { mode: p.id === id ? 'primary' : 'fallback' });
    });
  };

  const handleSaveApiKey = () => {
    if (!editingProvider) return;
    demoStore.updateAIProvider(editingProvider.id, {
      api_key_encrypted: editApiKey ? `${editApiKey.slice(0, 10)}••••••••${editApiKey.slice(-4)}` : editingProvider.api_key_encrypted,
    });
    setEditingProvider(null);
    setEditApiKey('');
  };

  const handleApprovePayment = (id: string) => {
    demoStore.updateSubscription(id, 'active');
  };

  const handleRejectPayment = (id: string) => {
    demoStore.updateSubscription(id, 'rejected');
  };

  const handleSaveWhatsApp = (e: React.FormEvent) => {
    e.preventDefault();
    demoStore.setAdminWhatsApp(adminWhatsApp);
    setWaSavedSuccess(true);
    setTimeout(() => setWaSavedSuccess(false), 3000);
  };

  const pendingUsers = users.filter((u) => u.status === 'pending_approval');
  const approvedUsers = users.filter((u) => u.status === 'approved');

  // If Admin is not yet authenticated, show Admin Login Gate
  if (!isAdminAuth) {
    return (
      <div className="min-h-screen bg-[#0D0F12] text-white flex flex-col items-center justify-center p-6 relative">
        <div className="absolute top-1/3 -left-20 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-md space-y-6 z-10">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold text-xl shadow-lg shadow-blue-500/20">
              <ShieldAlert className="w-6 h-6 text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">Portal Admin TataDana</h2>
            <p className="text-xs text-gray-400">
              Khusus pemilik & pengelola sistem. Masukkan sandi untuk mengelola approval dan AI.
            </p>
          </div>

          <Card className="p-6 bg-[#14171D] border-[#262C38] space-y-4">
            {/* Toggle Tabs: Masuk Admin vs Daftar Admin */}
            <div className="grid grid-cols-2 p-1 bg-[#181C24] rounded-xl border border-[#262C38]">
              <button
                type="button"
                onClick={() => {
                  setAdminAuthMode('login');
                  setAdminAuthError('');
                }}
                className={`py-2 text-xs font-bold rounded-lg transition-all ${
                  adminAuthMode === 'login'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Masuk Admin
              </button>
              <button
                type="button"
                onClick={() => {
                  setAdminAuthMode('register');
                  setAdminAuthError('');
                }}
                className={`py-2 text-xs font-bold rounded-lg transition-all ${
                  adminAuthMode === 'register'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Daftar Akun Admin
              </button>
            </div>

            {adminAuthError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300">
                {adminAuthError}
              </div>
            )}

            {adminAuthMode === 'login' ? (
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Email / No. WhatsApp / User Admin</label>
                  <input
                    type="text"
                    value={adminIdentifierInput}
                    onChange={(e) => setAdminIdentifierInput(e.target.value)}
                    placeholder="admin atau email admin"
                    className="w-full bg-[#181C24] border border-[#262C38] focus:border-blue-500 rounded-xl px-4 py-2.5 text-white text-xs outline-none"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">Default pemilik: <code>admin</code></p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Kata Sandi Admin</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      value={adminPasswordInput}
                      onChange={(e) => setAdminPasswordInput(e.target.value)}
                      placeholder="Masukkan kata sandi admin (cth: admin)"
                      className="w-full bg-[#181C24] border border-[#262C38] focus:border-blue-500 rounded-xl pl-10 pr-4 py-2.5 text-white text-xs outline-none"
                    />
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">Sandi default pemilik: <code>admin</code></p>
                </div>

                <div className="space-y-2 pt-1">
                  <Button type="submit" variant="primary" className="w-full bg-blue-600 hover:bg-blue-500 border-none font-bold">
                    Masuk Portal Admin
                  </Button>

                  <button
                    type="button"
                    onClick={handleInstantAdminLogin}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs transition-all shadow-md shadow-emerald-600/25 flex items-center justify-center gap-1.5"
                  >
                    ⚡ Masuk Instan Superadmin (1-Klik)
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleAdminRegister} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Nama Lengkap Admin</label>
                  <input
                    type="text"
                    required
                    value={adminFullNameInput}
                    onChange={(e) => setAdminFullNameInput(e.target.value)}
                    placeholder="Nama Anda (cth: Owner TataDana)"
                    className="w-full bg-[#181C24] border border-[#262C38] focus:border-blue-500 rounded-xl px-4 py-2 text-white text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Email Admin</label>
                  <input
                    type="email"
                    required
                    value={adminEmailInput}
                    onChange={(e) => setAdminEmailInput(e.target.value)}
                    placeholder="admin@tatadana.id"
                    className="w-full bg-[#181C24] border border-[#262C38] focus:border-blue-500 rounded-xl px-4 py-2 text-white text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">No. WhatsApp Admin (Untuk Support User)</label>
                  <input
                    type="tel"
                    value={adminPhoneInput}
                    onChange={(e) => setAdminPhoneInput(e.target.value)}
                    placeholder="+6281234567890"
                    className="w-full bg-[#181C24] border border-[#262C38] focus:border-blue-500 rounded-xl px-4 py-2 text-white text-xs outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Kata Sandi Admin</label>
                  <input
                    type="password"
                    required
                    value={adminRegPasswordInput}
                    onChange={(e) => setAdminRegPasswordInput(e.target.value)}
                    placeholder="Buat kata sandi admin yang kuat"
                    className="w-full bg-[#181C24] border border-[#262C38] focus:border-blue-500 rounded-xl px-4 py-2 text-white text-xs outline-none"
                  />
                </div>

                <Button type="submit" variant="primary" className="w-full bg-blue-600 hover:bg-blue-500 border-none pt-2">
                  Daftar Akun Admin Baru & Masuk
                </Button>
              </form>
            )}

            <div className="text-center pt-2">
              <Link href="/login" className="text-xs text-gray-400 hover:text-white transition-colors">
                ← Kembali ke Portal Pengguna
              </Link>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D0F12] text-white">
      {/* Top Navbar */}
      <header className="bg-[#14171D] border-b border-[#262C38] px-4 sm:px-8 py-3.5 sm:py-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 hover:text-white border border-blue-500/40 text-xs font-semibold transition-all shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Buka Dashboard App (Mode Admin)</span>
          </Link>
          <div className="h-4 w-px bg-[#262C38] hidden sm:block" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold">
              <ShieldAlert className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight text-white">Superadmin Portal TataDana</h2>
              <p className="text-[10px] text-gray-400">Approval Pendaftar Baru & Multi-AI Orchestration</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="blue" size="sm">
            Superadmin Aktif
          </Badge>
          <button
            onClick={handleAdminLogout}
            title="Keluar dari Portal Admin"
            className="p-1.5 rounded-lg bg-[#181C24] text-gray-400 hover:text-rose-400 border border-[#262C38] transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Quick Links Navigation Ribbon */}
      <div className="bg-[#11141A] border-b border-[#262C38] px-4 sm:px-8 py-2 text-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-2 shrink-0 text-slate-400 font-semibold text-[11px]">
            <span>⚡ Tautan Cepat Portal:</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/verify"
              className="px-2.5 py-1 rounded-lg bg-[#181C24] hover:bg-blue-600/20 text-blue-300 hover:text-white border border-[#262C38] hover:border-blue-500/40 font-mono transition-colors"
            >
              /verify
            </Link>
            <Link
              href="/dashboard"
              className="px-2.5 py-1 rounded-lg bg-[#181C24] hover:bg-emerald-600/20 text-emerald-300 hover:text-white border border-[#262C38] hover:border-emerald-500/40 font-mono transition-colors"
            >
              /dashboard
            </Link>
            <Link
              href="/dashboard/wallets"
              className="px-2.5 py-1 rounded-lg bg-[#181C24] hover:bg-slate-700/50 text-slate-300 hover:text-white border border-[#262C38] hover:border-slate-500 font-mono transition-colors"
            >
              /wallets
            </Link>
            <Link
              href="/dashboard/transactions"
              className="px-2.5 py-1 rounded-lg bg-[#181C24] hover:bg-purple-600/20 text-purple-300 hover:text-white border border-[#262C38] hover:border-purple-500/40 font-mono transition-colors"
            >
              /transactions
            </Link>
            <Link
              href="/dashboard/simulator"
              className="px-2.5 py-1 rounded-lg bg-[#181C24] hover:bg-blue-600/20 text-blue-400 hover:text-white border border-[#262C38] hover:border-blue-500/40 font-mono transition-colors"
            >
              /simulator
            </Link>
            <a
              href="https://t.me/rumahtatdanabot"
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1 rounded-lg bg-sky-600/20 hover:bg-sky-600/30 text-sky-400 hover:text-white border border-sky-500/40 font-semibold transition-colors flex items-center gap-1"
            >
              <span>✈️ @rumahtatdanabot</span>
            </a>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto p-4 sm:p-8 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex border-b border-[#262C38] gap-6 text-sm overflow-x-auto">
          {/* TAB 1: USER APPROVALS (PRIMARY NEW FEATURE) */}
          <button
            onClick={() => setActiveTab('approvals')}
            className={`pb-3 font-semibold transition-all relative flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'approvals' ? 'text-blue-400' : 'text-gray-400 hover:text-white'
            }`}
          >
            <UserCheck className="w-4 h-4 text-blue-400" />
            <span>Persetujuan Pendaftar Baru</span>
            {pendingUsers.length > 0 && (
              <span className="text-[10px] bg-amber-500 text-slate-900 font-extrabold px-1.5 py-0.5 rounded-full animate-pulse">
                {pendingUsers.length} Menunggu
              </span>
            )}
            {activeTab === 'approvals' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('providers')}
            className={`pb-3 font-semibold transition-all relative flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'providers' ? 'text-blue-400' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Cpu className="w-4 h-4 text-blue-400" />
            <span>AI Multi-Providers</span>
            {activeTab === 'providers' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('payments')}
            className={`pb-3 font-semibold transition-all relative flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'payments' ? 'text-blue-400' : 'text-gray-400 hover:text-white'
            }`}
          >
            <CreditCard className="w-4 h-4 text-blue-400" />
            <span>Approval Pembayaran</span>
            {subscriptions.some((s) => s.status === 'pending') && (
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            )}
            {activeTab === 'payments' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`pb-3 font-semibold transition-all relative flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'logs' ? 'text-blue-400' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Activity className="w-4 h-4 text-blue-400" />
            <span>AI Audit Logs</span>
            {activeTab === 'logs' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`pb-3 font-semibold transition-all relative flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'users' ? 'text-blue-400' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4 text-blue-400" />
            <span>Semua User ({users.length})</span>
            {activeTab === 'users' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
            )}
          </button>
        </div>

        {/* TAB 1: USER APPROVALS & CODE GENERATION */}
        {activeTab === 'approvals' && (
          <div className="space-y-6">
            {/* Top Info Banner */}
            <div className="bg-gradient-to-r from-blue-950/40 via-[#14171D] to-[#181C24] p-5 rounded-2xl border border-blue-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-blue-400" />
                  Persetujuan Akun Pendaftar & Generate Kode Verifikasi Real
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Pendaftar baru tidak bisa masuk ke dashboard sebelum Anda klik <strong>Approve</strong>.
                  Sistem otomatis men-generate 6-digit kode verifikasi real yang wajib dimasukkan user di link <code>/verify</code>.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs bg-[#181C24] px-3 py-1.5 rounded-xl border border-[#262C38] text-gray-300">
                  Total Menunggu: <strong className="text-amber-400">{pendingUsers.length}</strong>
                </span>
                <span className="text-xs bg-[#181C24] px-3 py-1.5 rounded-xl border border-[#262C38] text-gray-300">
                  Total Disetujui: <strong className="text-emerald-400">{approvedUsers.length}</strong>
                </span>
              </div>
            </div>

            {/* WhatsApp Admin Settings Card */}
            <Card className="p-5 border-emerald-500/30 bg-gradient-to-r from-emerald-950/20 via-[#181C24] to-[#14171D]">
              <form onSubmit={handleSaveWhatsApp} className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                      <MessageCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white">Nomor WhatsApp Admin (Bantuan & Keluhan Pengguna)</h4>
                        <Badge variant="green" size="sm">OTP Help Desk</Badge>
                      </div>
                      <p className="text-xs text-gray-400">
                        Nomor ini akan otomatis ditampilkan di halaman input kode OTP user (<code>/verify</code>) agar pendaftar dapat chat jika ada kendala.
                      </p>
                    </div>
                  </div>

                  {waSavedSuccess && (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/20 px-3 py-1.5 rounded-xl border border-emerald-500/30 animate-pulse shrink-0">
                      <Check className="w-3.5 h-3.5" />
                      <span>Tersimpan!</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
                  <div className="relative flex-1 w-full">
                    <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={adminWhatsApp}
                      onChange={(e) => setAdminWhatsApp(e.target.value)}
                      placeholder="Masukkan No WhatsApp Admin (cth: +6281234567890)..."
                      className="w-full bg-[#14171D] border border-[#262C38] focus:border-emerald-500 rounded-xl pl-10 pr-4 py-2 text-white font-mono text-xs outline-none transition-colors"
                    />
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button type="submit" variant="primary" className="bg-emerald-600 hover:bg-emerald-500 border-none w-full sm:w-auto text-xs py-2">
                      <Save className="w-3.5 h-3.5 mr-1" />
                      <span>Simpan Nomor WA</span>
                    </Button>

                    {adminWhatsApp && (
                      <a
                        href={`https://wa.me/${adminWhatsApp.replace(/\D/g, '')}?text=Tes%20koneksi%20WhatsApp%20Admin%20TataDana`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#181C24] hover:bg-[#202530] border border-[#262C38] rounded-xl text-xs text-gray-300 transition-colors shrink-0"
                      >
                        <ExternalLink className="w-3 h-3 text-emerald-400" />
                        <span>Uji Link WA</span>
                      </a>
                    )}
                  </div>
                </div>
              </form>
            </Card>

            {/* Section 1: Pending Approvals */}
            <Card className="overflow-hidden">
              <div className="p-4 border-b border-[#262C38] flex items-center justify-between bg-[#181C24]/50">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    Pendaftar Menunggu Persetujuan ({pendingUsers.length})
                  </h4>
                  <p className="text-xs text-gray-400">User baru yang mendaftar dengan saldo Rp 0</p>
                </div>
              </div>

              {pendingUsers.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-400 space-y-2">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 mx-auto flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <p className="font-semibold text-white">Tidak ada antrean pendaftar saat ini.</p>
                  <p className="text-gray-500">
                    Buka link <Link href="/register" target="_blank" className="text-blue-400 underline">/register</Link> untuk mencoba mendaftarkan akun pribadi baru.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#181C24] text-gray-400 uppercase font-semibold">
                      <tr>
                        <th className="p-4">Tanggal Daftar</th>
                        <th className="p-4">Nama Lengkap</th>
                        <th className="p-4">Email</th>
                        <th className="p-4">Nomor HP / WhatsApp</th>
                        <th className="p-4">Telegram</th>
                        <th className="p-4">Saldo Awal</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-center">Tindakan Admin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#262C38]">
                      {pendingUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-white/[0.02]">
                          <td className="p-4 font-mono text-gray-400 whitespace-nowrap">
                            {new Date(user.created_at).toLocaleTimeString('id-ID', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })} WIB
                          </td>
                          <td className="p-4 font-bold text-white">{user.full_name}</td>
                          <td className="p-4 font-mono text-gray-300">{user.email}</td>
                          <td className="p-4 font-mono text-gray-300">{user.phone}</td>
                          <td className="p-4 text-gray-400">
                            {user.telegram_username ? `@${user.telegram_username}` : '-'}
                          </td>
                          <td className="p-4 font-mono font-bold text-emerald-400">
                            Rp 0 (Full Nol)
                          </td>
                          <td className="p-4">
                            <Badge variant="orange" size="sm">
                              PENDING APPROVAL
                            </Badge>
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                variant="primary"
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-500 border-none font-bold"
                                onClick={() => handleApproveUser(user.id)}
                              >
                                ✓ Setujui & Buat Kode
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => handleRejectUser(user.id)}
                              >
                                Tolak
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            {/* Section 2: Approved Accounts & Generated Codes */}
            <Card className="overflow-hidden">
              <div className="p-4 border-b border-[#262C38] flex items-center justify-between bg-[#181C24]/50">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-emerald-400" />
                    Daftar Akun Disetujui & Kode Verifikasi Real ({approvedUsers.length})
                  </h4>
                  <p className="text-xs text-gray-400">
                    6-digit kode verifikasi yang telah di-generate untuk masing-masing user
                  </p>
                </div>
              </div>

              {approvedUsers.length === 0 ? (
                <div className="p-6 text-center text-xs text-gray-500">
                  Belum ada user yang disetujui.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#181C24] text-gray-400 uppercase font-semibold">
                      <tr>
                        <th className="p-4">Nama Lengkap</th>
                        <th className="p-4">Email</th>
                        <th className="p-4">Kode Verifikasi (PIN)</th>
                        <th className="p-4">Status Dashboard</th>
                        <th className="p-4">Saldo Saat Ini</th>
                        <th className="p-4 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#262C38]">
                      {approvedUsers.map((user) => {
                        const userBal = user.wallets?.reduce((acc, w) => acc + w.balance, 0) || 0;
                        return (
                          <tr key={user.id} className="hover:bg-white/[0.02]">
                            <td className="p-4 font-bold text-white">{user.full_name}</td>
                            <td className="p-4 font-mono text-gray-400">{user.email}</td>
                            <td className="p-4 font-mono">
                              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold text-sm tracking-widest">
                                {user.verification_code || '123456'}
                              </span>
                            </td>
                            <td className="p-4">
                              <Badge variant={user.is_verified ? 'green' : 'orange'} size="sm">
                                {user.is_verified ? 'SUDAH MASUK DASHBOARD' : 'MENUNGGU INPUT KODE USER'}
                              </Badge>
                            </td>
                            <td className="p-4 font-mono font-bold text-white">
                              Rp {userBal.toLocaleString('id-ID')}
                            </td>
                            <td className="p-4 text-center">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleCopyCode(user.verification_code || '123456')}
                                icon={<Copy className="w-3.5 h-3.5" />}
                              >
                                Salin Kode
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* TAB 2: AI MULTI-PROVIDERS */}
        {activeTab === 'providers' && (
          <div className="space-y-6">
            <div className="bg-[#14171D] p-5 rounded-2xl border border-[#262C38] flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-white">Multi-Provider AI Architecture & Failover</h3>
                <p className="text-xs text-gray-400 mt-1">
                  Pilih mode eksekusi: gunakan satu provider saja atau failover paralel otomatis ke provider berikutnya jika terjadi kendala.
                </p>
              </div>

              <div className="flex items-center gap-2 bg-[#181C24] p-1.5 rounded-xl border border-[#262C38]">
                <button
                  type="button"
                  onClick={() => demoStore.setAIExecutionMode('single')}
                  className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${
                    aiMode === 'single'
                      ? 'bg-[#FF6B00] text-white shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Salah Satu Saja
                </button>
                <button
                  type="button"
                  onClick={() => demoStore.setAIExecutionMode('parallel')}
                  className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${
                    aiMode === 'parallel'
                      ? 'bg-[#FF6B00] text-white shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Paralel Failover (Rekomendasi)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {providers.map((prv) => (
                <Card
                  key={prv.id}
                  className={`p-6 relative flex flex-col justify-between ${
                    prv.mode === 'primary' ? 'border-[#FF6B00]/50 ring-1 ring-[#FF6B00]/30' : ''
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Cpu className="w-5 h-5 text-[#FF8533]" />
                        <h4 className="font-bold text-base uppercase tracking-wider">{prv.provider}</h4>
                      </div>
                      <Badge variant={prv.mode === 'primary' ? 'orange' : 'gray'} size="sm">
                        {prv.mode === 'primary' ? 'PRIMARY' : 'FALLBACK'}
                      </Badge>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div>
                        <span className="text-gray-400 block">Model Aktif:</span>
                        <span className="font-mono text-white font-semibold">{prv.model_name}</span>
                      </div>

                      <div>
                        <span className="text-gray-400 block">API Key Terenkripsi:</span>
                        <div className="flex items-center justify-between bg-[#181C24] p-2 rounded-lg font-mono text-[11px] text-gray-300 mt-1">
                          <span>{prv.api_key_encrypted}</span>
                          <button
                            onClick={() => {
                              setEditingProvider(prv);
                              setEditApiKey('');
                            }}
                            className="text-[#FF8533] hover:underline"
                          >
                            Ubah
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <span className="text-gray-400">Status Provider:</span>
                        <button
                          onClick={() => handleToggleProviderActive(prv.id, prv.is_active)}
                          className="flex items-center gap-1 text-xs"
                        >
                          {prv.is_active ? (
                            <span className="text-emerald-400 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Aktif
                            </span>
                          ) : (
                            <span className="text-gray-500 flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5" /> Nonaktif
                            </span>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-[#262C38]">
                    {prv.mode !== 'primary' ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full"
                        onClick={() => handleSetPrimary(prv.id)}
                      >
                        Jadikan Primary
                      </Button>
                    ) : (
                      <span className="block text-center text-[11px] text-emerald-400 font-semibold py-1">
                        ✓ Provider Utama Terpilih
                      </span>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: PAYMENTS APPROVAL */}
        {activeTab === 'payments' && (
          <Card className="overflow-hidden">
            <div className="p-4 border-b border-[#262C38] flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white">Permintaan Upgrade & Langganan</h4>
                <p className="text-xs text-gray-400">Midtrans Gateway & Bukti Transfer Manual</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#181C24] text-gray-400 uppercase font-semibold">
                  <tr>
                    <th className="p-4">Tanggal</th>
                    <th className="p-4">User ID</th>
                    <th className="p-4">Paket</th>
                    <th className="p-4">Metode</th>
                    <th className="p-4">Bukti / Order ID</th>
                    <th className="p-4 text-right">Nominal</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262C38]">
                  {subscriptions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-white/[0.02]">
                      <td className="p-4 font-mono text-gray-400">
                        {new Date(sub.created_at).toLocaleDateString('id-ID')}
                      </td>
                      <td className="p-4 font-mono text-white">{sub.user_id}</td>
                      <td className="p-4 uppercase font-bold text-[#FF8533]">{sub.plan}</td>
                      <td className="p-4 capitalize text-gray-300">{sub.payment_method}</td>
                      <td className="p-4 font-mono text-[11px] text-gray-400">
                        {sub.midtrans_order_id ? (
                          sub.midtrans_order_id
                        ) : sub.payment_proof_url ? (
                          <a
                            href={sub.payment_proof_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#FF8533] hover:underline flex items-center gap-1"
                          >
                            <span>Lihat Bukti TF</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="p-4 text-right font-mono font-bold text-white">
                        Rp {sub.amount.toLocaleString('id-ID')}
                      </td>
                      <td className="p-4">
                        <Badge
                          variant={
                            sub.status === 'active'
                              ? 'green'
                              : sub.status === 'pending'
                              ? 'orange'
                              : 'red'
                          }
                          size="sm"
                        >
                          {sub.status.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="p-4 text-center">
                        {sub.status === 'pending' ? (
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleApprovePayment(sub.id)}
                            >
                              Approve
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleRejectPayment(sub.id)}
                            >
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-gray-500 text-[11px]">Selesai</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* TAB 4: AI AUDIT LOGS */}
        {activeTab === 'logs' && (
          <Card className="overflow-hidden">
            <div className="p-4 border-b border-[#262C38] flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white">Audit Log Performa AI</h4>
                <p className="text-xs text-gray-400">Log input parsing, response JSON, dan latensi model</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#181C24] text-gray-400 uppercase font-semibold">
                  <tr>
                    <th className="p-4">Waktu</th>
                    <th className="p-4">Tipe</th>
                    <th className="p-4">Provider</th>
                    <th className="p-4">Input Prompt</th>
                    <th className="p-4">Response JSON</th>
                    <th className="p-4 text-right">Latensi</th>
                    <th className="p-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262C38]">
                  {aiLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-white/[0.02]">
                      <td className="p-4 font-mono text-gray-400 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleTimeString('id-ID')}
                      </td>
                      <td className="p-4 capitalize font-semibold text-gray-300">{log.input_type}</td>
                      <td className="p-4 font-mono text-[#FF8533]">{log.provider}</td>
                      <td className="p-4 max-w-xs truncate text-gray-200">{log.prompt}</td>
                      <td className="p-4 font-mono text-[11px] max-w-xs truncate text-gray-400">
                        {log.response}
                      </td>
                      <td className="p-4 text-right font-mono text-white">{log.latency_ms}ms</td>
                      <td className="p-4 text-center">
                        <Badge variant={log.status === 'success' ? 'green' : 'red'} size="sm">
                          {log.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* TAB 5: USER MANAGEMENT */}
        {activeTab === 'users' && (
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white">Semua Akun Pengguna Terdaftar ({users.length})</h4>
                <p className="text-xs text-gray-400">Daftar pengguna dan status verifikasi akun</p>
              </div>
            </div>

            {users.length === 0 ? (
              <p className="text-xs text-gray-500 py-4">Belum ada akun pengguna terdaftar.</p>
            ) : (
              <div className="space-y-3">
                {users.map((u) => {
                  const bal = u.wallets?.reduce((acc, w) => acc + w.balance, 0) || 0;
                  return (
                    <div
                      key={u.id}
                      className="p-4 bg-[#181C24] rounded-xl border border-[#262C38] flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold">
                          {u.full_name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-white">{u.full_name}</p>
                          <p className="text-gray-400">
                            {u.email} • {u.phone} • Telegram: @{u.telegram_username || 'belum_ada'}
                          </p>
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            Saldo: <strong className="text-emerald-400">Rp {bal.toLocaleString('id-ID')}</strong>
                            {u.verification_code && (
                              <span className="ml-2 font-mono text-gray-400">
                                (Kode: {u.verification_code})
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            u.status === 'approved' && u.is_verified
                              ? 'green'
                              : u.status === 'approved'
                              ? 'orange'
                              : 'red'
                          }
                          size="sm"
                        >
                          {u.status === 'approved' && u.is_verified
                            ? 'VERIFIED'
                            : u.status === 'approved'
                            ? 'APPROVED (MENUNGGU INPUT KODE)'
                            : u.status.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Code Generation Success Modal */}
      <Modal
        isOpen={!!generatedCodeModal}
        onClose={() => setGeneratedCodeModal(null)}
        title="✓ Akun Berhasil Di-Approve!"
        subtitle="Berikan kode verifikasi ini kepada pendaftar"
        maxWidth="sm"
      >
        {generatedCodeModal && (
          <div className="space-y-4 text-center">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl space-y-2.5">
              <p className="text-xs text-gray-300">
                Pendaftaran untuk <strong className="text-white">{generatedCodeModal.userName}</strong> telah disetujui.
              </p>
              <div className="py-2">
                <span className="text-3xl font-mono font-extrabold tracking-widest text-emerald-400 bg-[#0D0F12] px-6 py-2.5 rounded-xl border border-emerald-500/40 inline-block shadow-inner">
                  {generatedCodeModal.code}
                </span>
              </div>
              <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-[11px] text-emerald-300 flex items-center justify-center gap-1.5 font-medium">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Otomatis terkirim ke layar user (/verify). Admin tidak perlu menyalin kode!</span>
              </div>
              <p className="text-[11px] text-gray-400">
                Layar verifikasi user otomatis menerima kode ini dan mengalihkan user langsung ke dashboard.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => handleCopyCode(generatedCodeModal.code)}
                icon={<Copy className="w-4 h-4" />}
              >
                {copySuccess ? 'Tersalin ke Clipboard!' : 'Salin Kode (Opsional)'}
              </Button>
              <Button
                variant="primary"
                onClick={() => setGeneratedCodeModal(null)}
              >
                Tutup & Selesai
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit API Key Modal */}
      <Modal
        isOpen={!!editingProvider}
        onClose={() => setEditingProvider(null)}
        title={`Ubah Kunci API ${editingProvider?.provider.toUpperCase()}`}
        subtitle="Kunci akan disimpan terenkripsi di database Postgres Supabase"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              API Key Baru
            </label>
            <input
              type="password"
              value={editApiKey}
              onChange={(e) => setEditApiKey(e.target.value)}
              placeholder="Masukkan API Key..."
              className="w-full bg-[#181C24] border border-[#262C38] focus:border-[#FF6B00] rounded-xl px-4 py-2.5 text-white font-mono text-xs outline-none"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEditingProvider(null)}>
              Batal
            </Button>
            <Button onClick={handleSaveApiKey}>Simpan Kunci API</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
