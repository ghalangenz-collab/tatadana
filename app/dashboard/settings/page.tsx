'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { demoStore } from '@/lib/store/demo-store';
import {
  User,
  Bot,
  Bell,
  Tags,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Send,
  Plus,
  Play,
  Square,
  RefreshCw,
  Trash2,
  Eye,
  EyeOff,
  Terminal,
  Zap,
  Activity,
  Radio,
  Check,
  Copy,
} from 'lucide-react';

interface PollLogEntry {
  id: string;
  time: string;
  type: 'info' | 'incoming' | 'reply' | 'error' | 'success';
  text: string;
}

export default function SettingsPage() {
  const [profile, setProfile] = useState(demoStore.getProfile());
  const [categories, setCategories] = useState(demoStore.getCategories());

  const [activeTab, setActiveTab] = useState<'profile' | 'bot' | 'reminder' | 'categories'>('bot');

  // Profile state
  const [fullName, setFullName] = useState(profile.full_name);
  const [email, setEmail] = useState(profile.email);
  const [phone, setPhone] = useState(profile.phone || '+6281234567890');
  const [currency, setCurrency] = useState(profile.default_currency);
  const [profileSaved, setProfileSaved] = useState(false);

  // Bot Credentials state (empty string uses TELEGRAM_BOT_TOKEN from .env.local)
  const [botToken, setBotToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string; bot?: any; latencyMs?: number } | null>(null);

  // Long Polling state
  const [isPolling, setIsPolling] = useState(false);
  const [pollOffset, setPollOffset] = useState<number | undefined>(undefined);
  const [pollCount, setPollCount] = useState(0);
  const [lastPollTime, setLastPollTime] = useState<string | null>(null);
  const [isClearingWebhook, setIsClearingWebhook] = useState(false);
  const [copiedExample, setCopiedExample] = useState<string | null>(null);

  // Test Direct Message state
  const [testChatId, setTestChatId] = useState(profile.telegram_chat_id ? String(profile.telegram_chat_id) : '');
  const [testMessage, setTestMessage] = useState('🔔 Halo dari TataDana Localhost! Bot telah terhubung aktif.');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testSendResult, setTestSendResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Logs terminal
  const [pollLogs, setPollLogs] = useState<PollLogEntry[]>([
    {
      id: 'init_1',
      time: new Date().toLocaleTimeString('id-ID'),
      type: 'info',
      text: 'Sistem siap. Long Polling getUpdates memungkinkan koneksi live Telegram ke localhost tanpa perlu tunnel publik (ngrok).',
    },
  ]);

  // Polling loop refs
  const isPollingRef = useRef(false);
  const pollOffsetRef = useRef<number | undefined>(undefined);

  // Subscribe to demo store
  useEffect(() => {
    const unsub = demoStore.subscribe(() => {
      const p = demoStore.getProfile();
      setProfile(p);
      setCategories(demoStore.getCategories());
      if (p.telegram_chat_id && !testChatId) {
        setTestChatId(String(p.telegram_chat_id));
      }
    });
    return () => unsub();
  }, [testChatId]);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      isPollingRef.current = false;
    };
  }, []);

  // Check bot connection on initial mount
  useEffect(() => {
    fetch('/api/telegram/poll')
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && data.bot) {
          setTestResult({
            ok: true,
            bot: data.bot,
            latencyMs: data.latencyMs,
            message: `Bot @${data.bot.username} (${data.bot.first_name}) aktif di localhost (Latensi: ${data.latencyMs}ms). Siap menerima pesan.`,
          });
          addLog('info', `Bot @${data.bot.username} terdeteksi siap (${data.isDemo ? 'Mode Demo' : 'Mode Live'}).`);
        }
      })
      .catch(() => {});
  }, []);

  const addLog = (type: PollLogEntry['type'], text: string) => {
    const newEntry: PollLogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      time: new Date().toLocaleTimeString('id-ID'),
      type,
      text,
    };
    setPollLogs((prev) => [newEntry, ...prev.slice(0, 49)]);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const query = botToken.trim() ? `?token=${encodeURIComponent(botToken.trim())}` : '';
      const res = await fetch(`/api/telegram/poll${query}`, {
        method: 'GET',
      });
      const data = await res.json();
      if (data.ok) {
        setTestResult({
          ok: true,
          bot: data.bot,
          latencyMs: data.latencyMs,
          message: `Koneksi berhasil! Bot @${data.bot.username} (${data.bot.first_name}) aktif dengan latensi ${data.latencyMs}ms.`,
        });
        addLog('success', `Bot @${data.bot.username} berhasil diverifikasi (Latensi: ${data.latencyMs}ms).`);
      } else {
        setTestResult({
          ok: false,
          message: data.error || 'Gagal tes koneksi ke Telegram.',
        });
        addLog('error', `Gagal tes koneksi: ${data.error}`);
      }
    } catch (err: any) {
      setTestResult({ ok: false, message: err.message || 'Gagal tes koneksi.' });
      addLog('error', `Network error: ${err.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  const handleClearWebhook = async () => {
    setIsClearingWebhook(true);
    addLog('info', 'Menghapus webhook aktif dari Telegram...');
    try {
      const res = await fetch('/api/telegram/poll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botToken, action: 'delete_webhook' }),
      });
      const data = await res.json();
      if (data.ok) {
        addLog('success', 'Webhook Telegram berhasil dihapus! Sekarang polling getUpdates dapat langsung menerima pesan di localhost.');
      } else {
        addLog('error', `Gagal reset webhook: ${data.error}`);
      }
    } catch (err: any) {
      addLog('error', `Error reset webhook: ${err.message}`);
    } finally {
      setIsClearingWebhook(false);
    }
  };

  const startPolling = async () => {
    if (isPollingRef.current) return;
    isPollingRef.current = true;
    setIsPolling(true);
    addLog('info', 'Memulai engine Long Polling getUpdates di localhost...');

    // Proactively clear webhook to avoid 409 conflict
    try {
      await fetch('/api/telegram/poll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botToken, action: 'delete_webhook' }),
      });
      addLog('info', 'Webhook diverifikasi bersih. Mendengarkan chat live Telegram...');
    } catch {
      // Continue polling
    }

    runPollingLoop();
  };

  const stopPolling = () => {
    isPollingRef.current = false;
    setIsPolling(false);
    addLog('info', '🛑 Long Polling dihentikan oleh pengguna.');
  };

  const runPollingLoop = async () => {
    while (isPollingRef.current) {
      try {
        setLastPollTime(new Date().toLocaleTimeString('id-ID'));
        const res = await fetch('/api/telegram/poll', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            botToken,
            offset: pollOffsetRef.current,
            timeout: 2,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          if (res.status === 409 || errData.needsWebhookReset) {
            addLog('error', '⚠️ Telegram Webhook terdeteksi aktif. Mereset webhook secara otomatis...');
            await fetch('/api/telegram/poll', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ botToken, action: 'delete_webhook' }),
            });
            await new Promise((r) => setTimeout(r, 1500));
            continue;
          }
          addLog('error', `Polling error (${res.status}): ${errData.error || 'Server error'}`);
          await new Promise((r) => setTimeout(r, 2500));
          continue;
        }

        const data = await res.json();
        if (data.ok) {
          if (data.nextOffset !== undefined) {
            pollOffsetRef.current = data.nextOffset;
            setPollOffset(data.nextOffset);
          }

          if (data.processed && data.processed.length > 0) {
            setPollCount((prev) => prev + data.processed.length);
            for (const item of data.processed) {
              addLog('incoming', `📨 Diterima dari ${item.from} (Chat ID: ${item.chatId}): "${item.text}"`);
              addLog('reply', `🤖 Balasan Bot (${item.sent ? 'Terkirim ke Telegram' : 'Mock/Offline'}): "${item.replyText.replace(/\n/g, ' ').slice(0, 90)}..."`);
            }
          }
        }
      } catch (err: any) {
        if (isPollingRef.current) {
          addLog('error', `Koneksi polling gagal: ${err.message}`);
          await new Promise((r) => setTimeout(r, 3000));
        }
      }

      if (isPollingRef.current) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  };

  const handlePollOnce = async () => {
    addLog('info', 'Mengambil update Telegram secara manual (Poll Once)...');
    try {
      const res = await fetch('/api/telegram/poll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken,
          offset: pollOffsetRef.current,
          timeout: 1,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        if (data.nextOffset !== undefined) {
          pollOffsetRef.current = data.nextOffset;
          setPollOffset(data.nextOffset);
        }
        if (data.processed && data.processed.length > 0) {
          setPollCount((c) => c + data.processed.length);
          for (const item of data.processed) {
            addLog('incoming', `📨 Diterima dari ${item.from} (Chat ID: ${item.chatId}): "${item.text}"`);
            addLog('reply', `🤖 Balasan Bot: "${item.replyText.replace(/\n/g, ' ').slice(0, 90)}..."`);
          }
        } else {
          addLog('info', 'Tidak ada pesan baru di Telegram saat ini.');
        }
      } else {
        addLog('error', `Gagal poll: ${data.error}`);
      }
    } catch (err: any) {
      addLog('error', `Error poll: ${err.message}`);
    }
  };

  const handleSendTestMessage = async () => {
    if (!testChatId.trim()) {
      setTestSendResult({ ok: false, message: 'Harap masukkan Telegram Chat ID tujuan.' });
      return;
    }
    setIsSendingTest(true);
    setTestSendResult(null);
    try {
      const res = await fetch('/api/telegram/poll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken,
          action: 'send_test',
          chatId: testChatId.trim(),
          text: testMessage,
        }),
      });
      const data = await res.json();
      setTestSendResult({
        ok: data.ok,
        message: data.ok ? data.message : data.error,
      });
      if (data.ok) {
        addLog('reply', `🔔 Pesan uji coba berhasil dikirim ke Chat ID: ${testChatId}`);
      } else {
        addLog('error', `Gagal kirim ke ${testChatId}: ${data.error}`);
      }
    } catch (err: any) {
      setTestSendResult({ ok: false, message: err.message || 'Gagal mengirim pesan.' });
      addLog('error', `Gagal kirim test: ${err.message}`);
    } finally {
      setIsSendingTest(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedExample(text);
    setTimeout(() => setCopiedExample(null), 2000);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    demoStore.updateProfile({
      full_name: fullName,
      phone,
      default_currency: currency,
    });
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2500);
  };

  const handleSaveReminder = (e: React.FormEvent) => {
    e.preventDefault();
    demoStore.updateProfile({
      reminder_enabled: reminderEnabled,
      reminder_frequency: reminderFreq,
      reminder_time_1: time1,
      reminder_time_2: time2,
    });
    setReminderSaved(true);
    setTimeout(() => setReminderSaved(false), 2500);
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    demoStore.addCategory(newCatName, 'expense', newCatIcon, newCatColor);
    setCategories(demoStore.getCategories());
    setNewCatName('');
  };

  // Reminder state
  const [reminderEnabled, setReminderEnabled] = useState(profile.reminder_enabled);
  const [reminderFreq, setReminderFreq] = useState<number>(profile.reminder_frequency || 1);
  const [time1, setTime1] = useState(profile.reminder_time_1 || '08:00');
  const [time2, setTime2] = useState(profile.reminder_time_2 || '20:00');
  const [reminderSaved, setReminderSaved] = useState(false);

  // Custom Category form
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('🛍️');
  const [newCatColor, setNewCatColor] = useState('#FF6B00');

  const botUsername = profile.telegram_username || 'tatadana_bot';

  return (
    <div className="flex min-h-screen bg-black text-[#F8FAFC]">
      <Sidebar />

      <main className="flex-1 md:ml-64 ml-0 min-w-0">
        <Header
          title="Pengaturan Akun & Integrasi"
          subtitle="Kelola profil, integrasi Telegram bot live di localhost, jadwal reminder, dan kategori keuangan"
        />

        <div className="p-4 sm:p-8 max-w-5xl space-y-6">
          {/* Tabs Navigation */}
          <div className="flex border-b border-[#262C38] gap-4 sm:gap-8 text-xs sm:text-sm overflow-x-auto pb-px scrollbar-none">
            <button
              onClick={() => setActiveTab('bot')}
              className={`pb-3 font-semibold transition-all relative flex items-center gap-2 shrink-0 whitespace-nowrap ${
                activeTab === 'bot' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Bot className="w-4 h-4" />
              <span>Telegram Bot (Live Localhost)</span>
              {activeTab === 'bot' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              className={`pb-3 font-semibold transition-all relative flex items-center gap-2 shrink-0 whitespace-nowrap ${
                activeTab === 'profile' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Profil Pengguna</span>
              {activeTab === 'profile' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('reminder')}
              className={`pb-3 font-semibold transition-all relative flex items-center gap-2 shrink-0 whitespace-nowrap ${
                activeTab === 'reminder' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Bell className="w-4 h-4" />
              <span>Reminder Harian</span>
              {activeTab === 'reminder' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('categories')}
              className={`pb-3 font-semibold transition-all relative flex items-center gap-2 shrink-0 whitespace-nowrap ${
                activeTab === 'categories' ? 'text-[#FF8533]' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Tags className="w-4 h-4" />
              <span>Kategori Keuangan</span>
              {activeTab === 'categories' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FF6B00]" />
              )}
            </button>
          </div>

          {/* TAB 1: TELEGRAM BOT LIVE LOCALHOST */}
          {activeTab === 'bot' && (
            <div className="space-y-6">
              {/* 1. Bot Connection & Token Setup */}
              <Card className="p-6 space-y-5 bg-[#14171D] border-[#262C38]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Bot className="w-5 h-5 text-[#FF8533]" />
                      Setup Bot Telegram & Token API
                    </h3>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Hubungkan bot Telegram resmi kamu untuk menerima pencatatan transaksi langsung dari smartphone atau desktop
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={isPolling ? 'green' : profile.is_bot_active ? 'blue' : 'gray'} size="md">
                      {isPolling ? '● Polling Aktif (Live)' : profile.is_bot_active ? '● Siap Terhubung' : 'Belum Terhubung'}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-200">
                    HTTP API Token Telegram (@BotFather)
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showToken ? 'text' : 'password'}
                        value={botToken}
                        onChange={(e) => setBotToken(e.target.value)}
                        placeholder="Masukkan token baru, atau biarkan kosong untuk menggunakan token dari .env.local"
                        className="w-full bg-[#181C24] border border-[#262C38] rounded-xl pl-4 pr-10 py-2.5 text-xs text-white font-mono outline-none focus:border-[#FF6B00] placeholder-slate-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowToken(!showToken)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        title={showToken ? 'Sembunyikan Token' : 'Lihat Token'}
                      >
                        {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    <div className="flex gap-2 shrink-0">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleTestConnection}
                        isLoading={isTesting}
                        icon={<Activity className="w-3.5 h-3.5 text-blue-400" />}
                      >
                        Tes Koneksi
                      </Button>

                      <a
                        href={`https://t.me/${botUsername}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-md shadow-blue-500/20"
                      >
                        <span>Buka Bot</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </div>

                {/* Connection Feedback */}
                {testResult && (
                  <div
                    className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 ${
                      testResult.ok
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {testResult.ok ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                      ) : (
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                      )}
                      <span className="font-medium">{testResult.message}</span>
                    </div>
                    {testResult.ok && (
                      <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 shrink-0">
                        @{botUsername}
                      </span>
                    )}
                  </div>
                )}
              </Card>

              {/* 2. Localhost Long Polling Engine */}
              <Card className="p-6 space-y-5 bg-[#14171D] border-[#262C38]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#262C38]">
                  <div>
                    <div className="flex items-center gap-2">
                      <Zap className="w-5 h-5 text-amber-400" />
                      <h4 className="text-sm font-bold text-white">
                        Localhost Long Polling Engine (getUpdates)
                      </h4>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        100% Solusi Localhost
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                      Telegram Webhook membutuhkan domain publik HTTPS dan tidak bisa mengakses <code className="bg-black/40 px-1 py-0.5 rounded text-amber-300 font-mono">http://localhost</code>.
                      Dengan <strong>Long Polling</strong>, server lokal Anda langsung menarik pesan masuk dari Telegram secara instan tanpa tunnel (ngrok).
                    </p>
                  </div>

                  {/* Polling Action Controls */}
                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    {isPolling ? (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={stopPolling}
                        icon={<Square className="w-4 h-4 fill-current" />}
                        className="text-xs"
                      >
                        Hentikan Polling
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={startPolling}
                        icon={<Play className="w-4 h-4 fill-current" />}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20 text-xs"
                      >
                        Mulai Polling
                      </Button>
                    )}

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handlePollOnce}
                      title="Ambil update satu kali"
                      icon={<RefreshCw className="w-3.5 h-3.5 text-blue-400" />}
                      className="text-xs"
                    >
                      Poll Once
                    </Button>

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleClearWebhook}
                      isLoading={isClearingWebhook}
                      title="Hapus webhook Telegram agar polling tidak konflik (Error 409)"
                      icon={<Trash2 className="w-3.5 h-3.5 text-rose-400" />}
                      className="text-xs"
                    >
                      Reset Webhook
                    </Button>
                  </div>
                </div>

                {/* Polling Status Radar */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-[#181C24] rounded-xl border border-[#262C38] flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full shrink-0 ${isPolling ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'}`} />
                    <div>
                      <p className="text-[11px] text-slate-400 font-medium">Status Engine</p>
                      <p className="text-xs font-bold text-white">
                        {isPolling ? 'Mendengarkan Telegram Live...' : 'Siaga (Standby)'}
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-[#181C24] rounded-xl border border-[#262C38]">
                    <p className="text-[11px] text-slate-400 font-medium">Total Pesan Diterima</p>
                    <p className="text-xs font-bold text-white">{pollCount} Pesan Masuk</p>
                  </div>

                  <div className="p-3 bg-[#181C24] rounded-xl border border-[#262C38]">
                    <p className="text-[11px] text-slate-400 font-medium">Terakhir Dicek</p>
                    <p className="text-xs font-bold text-white font-mono">
                      {lastPollTime ? `${lastPollTime} WIB` : 'Belum ada aktivitas'}
                    </p>
                  </div>
                </div>

                {/* Live Polling Terminal */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-[#FF8533]" />
                      Live Terminal & Event Stream
                    </span>
                    <button
                      onClick={() => setPollLogs([])}
                      className="text-[11px] text-slate-400 hover:text-white transition-colors"
                    >
                      Bersihkan Log
                    </button>
                  </div>

                  <div className="bg-[#0A0C0F] border border-[#262C38] rounded-xl p-3.5 font-mono text-xs max-h-52 overflow-y-auto space-y-1.5 scrollbar-thin">
                    {pollLogs.length === 0 ? (
                      <p className="text-slate-500 italic">Log terminal kosong.</p>
                    ) : (
                      pollLogs.map((log) => (
                        <div key={log.id} className="flex items-start gap-2 leading-relaxed">
                          <span className="text-slate-500 shrink-0 text-[10px] mt-0.5">[{log.time}]</span>
                          <span
                            className={
                              log.type === 'incoming'
                                ? 'text-amber-300 font-semibold'
                                : log.type === 'reply'
                                ? 'text-blue-300'
                                : log.type === 'success'
                                ? 'text-emerald-400'
                                : log.type === 'error'
                                ? 'text-rose-400'
                                : 'text-slate-400'
                            }
                          >
                            {log.text}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </Card>

              {/* 3. Direct Test Message to Telegram */}
              <Card className="p-6 space-y-4 bg-[#14171D] border-[#262C38]">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Send className="w-4 h-4 text-[#FF8533]" />
                      Kirim Pesan Uji Coba ke Telegram
                    </h4>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Verifikasi bahwa server TataDana di localhost dapat mengirimkan balasan pesan langsung ke aplikasi Telegram Anda
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-200 mb-1">
                      Telegram Chat ID / User ID
                    </label>
                    <input
                      type="text"
                      value={testChatId}
                      onChange={(e) => setTestChatId(e.target.value)}
                      placeholder="Contoh: 123456789"
                      className="w-full bg-[#181C24] border border-[#262C38] rounded-xl px-3.5 py-2 text-xs text-white font-mono outline-none focus:border-[#FF6B00] placeholder-slate-500"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Buka bot di Telegram, ketik <code className="text-amber-300">/start</code> untuk otomatis menautkan Chat ID.
                    </p>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-200 mb-1">
                      Isi Pesan Uji Coba
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={testMessage}
                        onChange={(e) => setTestMessage(e.target.value)}
                        className="flex-1 bg-[#181C24] border border-[#262C38] rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-[#FF6B00]"
                      />
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleSendTestMessage}
                        isLoading={isSendingTest}
                        icon={<Send className="w-3.5 h-3.5" />}
                        className="shrink-0"
                      >
                        Kirim
                      </Button>
                    </div>
                  </div>
                </div>

                {testSendResult && (
                  <div
                    className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                      testSendResult.ok
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    }`}
                  >
                    {testSendResult.ok ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    )}
                    <span>{testSendResult.message}</span>
                  </div>
                )}
              </Card>

              {/* 4. Complete Step-by-Step Interactive Guide */}
              <Card className="p-6 bg-[#14171D] border-[#262C38] space-y-4">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Panduan Step-by-Step Menghubungkan & Menggunakan Bot di Localhost
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300">
                  <div className="p-4 bg-[#181C24] rounded-xl border border-[#262C38] space-y-2">
                    <div className="flex items-center gap-2 text-white font-bold">
                      <span className="w-6 h-6 rounded-full bg-[#FF6B00]/20 text-[#FF8533] flex items-center justify-center text-xs">
                        1
                      </span>
                      <span>Dapatkan Token Bot</span>
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      Buka Telegram, cari akun <strong className="text-white">@BotFather</strong>, ketik <code className="bg-black/40 px-1 py-0.5 rounded text-amber-300 font-mono">/newbot</code>, ikuti instruksi, lalu salin HTTP API Token ke form di atas.
                    </p>
                  </div>

                  <div className="p-4 bg-[#181C24] rounded-xl border border-[#262C38] space-y-2">
                    <div className="flex items-center gap-2 text-white font-bold">
                      <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs">
                        2
                      </span>
                      <span>Mulai Polling Realtime</span>
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      Klik tombol <strong className="text-emerald-400">Mulai Polling Realtime</strong> di atas atau jalankan perintah terminal <code className="bg-black/40 px-1 py-0.5 rounded text-emerald-300 font-mono">npm run poll</code>.
                    </p>
                  </div>

                  <div className="p-4 bg-[#181C24] rounded-xl border border-[#262C38] space-y-2">
                    <div className="flex items-center gap-2 text-white font-bold">
                      <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs">
                        3
                      </span>
                      <span>Chat Langsung di Telegram</span>
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      Buka bot kamu di Telegram, klik <strong>START</strong>, lalu ketik transaksi keuanganmu! Bot akan merespons instan.
                    </p>
                  </div>
                </div>

                {/* Example Prompts to Try */}
                <div className="p-4 bg-[#181C24] rounded-xl border border-[#262C38] space-y-2.5">
                  <p className="text-xs font-bold text-white">Contoh Pesan Natural yang Bisa Langsung Kamu Kirim:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                    {[
                      'makan siang 25rb',
                      'gajian bulan ini 10jt',
                      'beli bensin 50k pake bca',
                      '/saldo',
                    ].map((example) => (
                      <button
                        key={example}
                        onClick={() => copyToClipboard(example)}
                        className="flex items-center justify-between px-3 py-2 rounded-lg bg-black/40 border border-[#262C38] text-slate-200 hover:text-white hover:border-[#FF6B00]/50 text-xs font-mono transition-all text-left group"
                        title="Klik untuk menyalin"
                      >
                        <span className="truncate">{example}</span>
                        {copiedExample === example ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-1" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 shrink-0 ml-1" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* TAB 2: PROFIL */}
          {activeTab === 'profile' && (
            <Card className="p-6 bg-[#14171D] border-[#262C38]">
              <form onSubmit={handleSaveProfile} className="space-y-4 max-w-xl">
                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-[#181C24] border border-[#262C38] rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-[#FF6B00]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                    Email Terdaftar
                  </label>
                  <input
                    type="email"
                    disabled
                    value={email}
                    className="w-full bg-[#181C24]/50 border border-[#262C38] rounded-xl px-4 py-2.5 text-xs text-slate-500 cursor-not-allowed outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                    Nomor WhatsApp / HP
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-[#181C24] border border-[#262C38] rounded-xl px-4 py-2.5 text-xs text-white font-mono outline-none focus:border-[#FF6B00]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                    Mata Uang Utama
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full bg-[#181C24] border border-[#262C38] rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-[#FF6B00]"
                  >
                    <option value="IDR">IDR - Rupiah Indonesia (Rp)</option>
                    <option value="USD">USD - US Dollar ($)</option>
                    <option value="SGD">SGD - Singapore Dollar (S$)</option>
                  </select>
                </div>

                {profileSaved && (
                  <p className="text-xs text-emerald-400 bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20">
                    Data profil berhasil diperbarui!
                  </p>
                )}

                <Button type="submit">Simpan Perubahan</Button>
              </form>
            </Card>
          )}

          {/* TAB 3: REMINDER */}
          {activeTab === 'reminder' && (
            <Card className="p-6 space-y-6 bg-[#14171D] border-[#262C38]">
              <div className="flex items-center justify-between pb-4 border-b border-[#262C38]">
                <div>
                  <h4 className="text-sm font-bold text-white">Notifikasi Pengingat via Telegram</h4>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Bot akan mengingatkan kamu untuk mencatat pengeluaran setiap hari (maksimal 2x per hari)
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={reminderEnabled}
                    onChange={(e) => setReminderEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[#262C38] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FF6B00]" />
                </label>
              </div>

              {reminderEnabled && (
                <form onSubmit={handleSaveReminder} className="space-y-5 max-w-xl">
                  <div>
                    <label className="block text-xs font-semibold text-slate-200 mb-2">
                      Frekuensi Pengingat
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setReminderFreq(1)}
                        className={`p-3 rounded-xl border text-xs font-semibold text-left transition-all ${
                          reminderFreq === 1
                            ? 'bg-[#FF6B00]/15 border-[#FF6B00] text-white'
                            : 'bg-[#181C24] border-[#262C38] text-slate-400 hover:text-white'
                        }`}
                      >
                        1x Sehari
                        <span className="block text-[11px] font-normal text-slate-400 mt-0.5">
                          Pagi atau Malam
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setReminderFreq(2)}
                        className={`p-3 rounded-xl border text-xs font-semibold text-left transition-all ${
                          reminderFreq === 2
                            ? 'bg-[#FF6B00]/15 border-[#FF6B00] text-white'
                            : 'bg-[#181C24] border-[#262C38] text-slate-400 hover:text-white'
                        }`}
                      >
                        2x Sehari (Rekomendasi)
                        <span className="block text-[11px] font-normal text-slate-400 mt-0.5">
                          Pagi & Malam
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                        Jam Pengingat 1 (WIB)
                      </label>
                      <input
                        type="time"
                        value={time1}
                        onChange={(e) => setTime1(e.target.value)}
                        className="w-full bg-[#181C24] border border-[#262C38] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#FF6B00]"
                      />
                    </div>

                    {reminderFreq === 2 && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                          Jam Pengingat 2 (WIB)
                        </label>
                        <input
                          type="time"
                          value={time2}
                          onChange={(e) => setTime2(e.target.value)}
                          className="w-full bg-[#181C24] border border-[#262C38] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#FF6B00]"
                        />
                      </div>
                    )}
                  </div>

                  {reminderSaved && (
                    <p className="text-xs text-emerald-400 bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20">
                      Pengaturan reminder berhasil disimpan!
                    </p>
                  )}

                  <Button type="submit">Simpan Jadwal</Button>
                </form>
              )}
            </Card>
          )}

          {/* TAB 4: KATEGORI */}
          {activeTab === 'categories' && (
            <div className="space-y-6">
              <Card className="p-6 bg-[#14171D] border-[#262C38]">
                <h4 className="text-sm font-bold text-white mb-4">Tambah Kategori Kustom</h4>
                <form onSubmit={handleAddCategory} className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="Nama Kategori (cth: Langganan Streaming)"
                    className="flex-1 bg-[#181C24] border border-[#262C38] rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-[#FF6B00]"
                  />
                  <input
                    type="text"
                    value={newCatIcon}
                    onChange={(e) => setNewCatIcon(e.target.value)}
                    placeholder="Icon Emoji"
                    className="w-24 bg-[#181C24] border border-[#262C38] rounded-xl px-3 py-2.5 text-xs text-center text-white outline-none focus:border-[#FF6B00]"
                  />
                  <input
                    type="color"
                    value={newCatColor}
                    onChange={(e) => setNewCatColor(e.target.value)}
                    className="w-12 h-10 bg-[#181C24] border border-[#262C38] rounded-xl p-1 cursor-pointer"
                  />
                  <Button type="submit" icon={<Plus className="w-4 h-4" />}>
                    Tambah
                  </Button>
                </form>
              </Card>

              <Card className="p-6 bg-[#14171D] border-[#262C38]">
                <h4 className="text-sm font-bold text-white mb-4">Daftar Kategori Terdaftar</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {categories.map((cat) => (
                    <div
                      key={cat.id}
                      className="p-3 bg-[#181C24] border border-[#262C38] rounded-xl flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">{cat.icon}</span>
                        <div>
                          <p className="text-xs font-semibold text-white">{cat.name}</p>
                          <p className="text-[10px] text-slate-400 capitalize">{cat.type}</p>
                        </div>
                      </div>
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: cat.color }}
                      />
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
