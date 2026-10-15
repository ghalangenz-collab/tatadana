'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Image as ImageIcon,
  Mic,
  Bot,
  Sparkles,
  CheckCheck,
  Loader2,
  ExternalLink,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Key,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Landmark,
  Smartphone,
  Banknote,
  ArrowRight,
} from 'lucide-react';
import { demoStore, TelegramSimMessage, TelegramSimAction } from '@/lib/store/demo-store';
import { heuristicParseIndonesianText, parseIndonesianAmount } from '@/lib/ai/parser';
import { matchWalletFromText, getWalletSlug } from '@/lib/telegram/bot-service';

interface TelegramSimulatorProps {
  compact?: boolean;
}

export const TelegramSimulator: React.FC<TelegramSimulatorProps> = ({ compact = false }) => {
  const [messages, setMessages] = useState<TelegramSimMessage[]>(demoStore.getSimMessages());
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [wallets, setWallets] = useState(demoStore.getWallets());
  const [defaultWallet, setDefaultWallet] = useState(demoStore.getDefaultWallet());
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [balanceDelta, setBalanceDelta] = useState<{ type: 'income' | 'expense'; amount: number } | null>(null);
  const [isBotConnected, setIsBotConnected] = useState(false);
  const [botUsername, setBotUsername] = useState('rumahtatdanabot');
  const [showTokenCard, setShowTokenCard] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [isSavingToken, setIsSavingToken] = useState(false);
  const [tokenStatusMsg, setTokenStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Safe internal scrolling refs (NEVER scroll the browser window/page)
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const shouldScrollOnSend = useRef(false);
  const isSendingRef = useRef(false);

  // Detect if user has scrolled up to read past messages
  const handleChatScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    // Considered near bottom if distance to bottom is within 80px
    isNearBottomRef.current = scrollHeight - scrollTop - clientHeight < 80;
  };

  useEffect(() => {
    // Check initial bot token status
    fetch('/api/telegram/poll')
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && !data.isDemo) {
          setIsBotConnected(true);
          if (data.bot?.username) setBotUsername(data.bot.username);
        } else {
          setIsBotConnected(false);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    // Hydrate from localStorage if in browser
    demoStore.initFromClientStorage();

    const unsubscribe = demoStore.subscribe(() => {
      setMessages(demoStore.getSimMessages());
      setWallets(demoStore.getWallets());
      setDefaultWallet(demoStore.getDefaultWallet());
    });

    // Active bi-directional live sync with Telegram Bot & server store
    let pollOffset: number | undefined = undefined;
    let isPolling = false;
    let isMounted = true;

    const syncInterval = setInterval(async () => {
      if (isPolling || !isMounted) {
        return;
      }
      isPolling = true;

      try {
        // 1. Poll incoming messages from actual Telegram
        const pollRes = await fetch('/api/telegram/poll', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ offset: pollOffset, timeout: 0 }),
        });
        if (pollRes.ok) {
          const pollData = await pollRes.json();
          if (pollData.nextOffset) {
            pollOffset = pollData.nextOffset;
          }
        }

        // 2. Sync server messages to browser (do not overwrite custom user wallets from server mock)
        if (!isSendingRef.current && isMounted) {
          const res = await fetch('/api/telegram/simulate');
          if (res.ok) {
            const data = await res.json();
            if (data && data.ok && Array.isArray(data.messages)) {
              demoStore.syncServerState({
                simMessages: data.messages,
              });
            }
          }
        }
      } catch (e) {
        // ignore background sync error
      } finally {
        isPolling = false;
      }
    }, 2000);

    return () => {
      isMounted = false;
      unsubscribe();
      clearInterval(syncInterval);
    };
  }, []);

  // ONLY scroll the internal chat container element, NEVER the page or window!
  useEffect(() => {
    if (!chatContainerRef.current) return;
    if (isNearBottomRef.current || shouldScrollOnSend.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
      shouldScrollOnSend.current = false;
    }
  }, [messages.length, isLoading]);

  const totalBalance = wallets.reduce((acc, w) => acc + w.balance, 0);

  const handleResetChat = async () => {
    demoStore.resetSimMessages();
    shouldScrollOnSend.current = true;
    setLastAction('Percakapan bot di-reset ke kondisi awal');
    setTimeout(() => setLastAction(null), 3000);
  };

  const handleWalletChange = (newWalletId: string) => {
    demoStore.setDefaultWallet(newWalletId);
    const chosen = demoStore.getWallets().find((w) => w.id === newWalletId);
    if (chosen) {
      setDefaultWallet(chosen);
      setLastAction(`Dompet aktif: ${chosen.name}`);
      setTimeout(() => setLastAction(null), 3000);
    }
  };

  const handleSaveToken = async () => {
    if (!tokenInput.trim()) return;
    setIsSavingToken(true);
    setTokenStatusMsg(null);
    try {
      const res = await fetch('/api/telegram/save-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenInput.trim() }),
      });
      const data = await res.json();
      if (data.ok) {
        setIsBotConnected(true);
        if (data.bot?.username) setBotUsername(data.bot.username);
        setTokenStatusMsg({
          type: 'success',
          text: `✅ Sukses! Bot @${data.bot?.username || 'rumahtatdanabot'} berhasil dihubungkan & siap merespons live!`,
        });
        setTimeout(() => setShowTokenCard(false), 3000);
      } else {
        setTokenStatusMsg({
          type: 'error',
          text: `❌ ${data.error || 'Gagal menyimpan token'}`,
        });
      }
    } catch (err: any) {
      setTokenStatusMsg({
        type: 'error',
        text: `❌ Gagal menghubungi server: ${err.message}`,
      });
    } finally {
      setIsSavingToken(false);
    }
  };

  const handleSend = async (customText?: string, photoUrl?: string, voiceUrl?: string) => {
    if (isSendingRef.current || isLoading) return;

    const textToSend = customText !== undefined ? customText : inputText;
    if (!textToSend.trim() && !photoUrl && !voiceUrl) return;

    isSendingRef.current = true;
    setInputText('');
    setIsLoading(true);
    shouldScrollOnSend.current = true;
    isNearBottomRef.current = true;

    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const timeStr = `${hours}:${minutes}`;

    // Optimistically add user message to client store
    const userMsg: TelegramSimMessage = {
      id: `msg_u_${Date.now()}`,
      sender: 'user',
      text: textToSend || (photoUrl ? '📷 [Foto Struk]' : '🎙️ [Pesan Suara]'),
      timestamp: timeStr,
      type: photoUrl ? 'photo' : voiceUrl ? 'voice' : 'text',
      mediaUrl: photoUrl || voiceUrl,
    };
    demoStore.addSimMessage(userMsg);

    try {
      const res = await fetch('/api/telegram/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToSend,
          photoUrl,
          voiceUrl,
          messageId: userMsg.id,
          wallets: demoStore.getWallets(),
          budgets: demoStore.getBudgets(),
          transactions: demoStore.getTransactions(),
          simMessages: demoStore.getSimMessages(),
        }),
      });

      if (!res.ok) {
        throw new Error(`Server status ${res.status}`);
      }

      const data = await res.json();
      if (data && data.ok) {
        // Sync wallets, budgets, transactions, and messages to client demoStore
        demoStore.syncServerState({
          wallets: data.wallets,
          budgets: data.budgets,
          transactions: data.transactions,
          recentTransactions: data.recentTransactions,
          simMessages: data.simMessages,
        });

        // Determine if income or expense for visual animation
        if (textToSend && /gaji|bonus|masuk|terima|pemasukan|tambah_saldo/i.test(textToSend)) {
          setBalanceDelta({ type: 'income', amount: 0 });
          setLastAction('💰 Pemasukan berhasil dicatat & saldo bertambah!');
        } else if (textToSend && /beli|bayar|makan|kopi|bensin|tagihan|keluar/i.test(textToSend)) {
          setBalanceDelta({ type: 'expense', amount: 0 });
          setLastAction('💸 Pengeluaran berhasil dicatat & saldo berkurang!');
        } else {
          setLastAction('Pesan diproses');
        }
        setTimeout(() => {
          setLastAction(null);
          setBalanceDelta(null);
        }, 4000);
      } else {
        throw new Error(data?.error || 'Gagal memproses pesan');
      }
    } catch (err: any) {
      console.warn('API simulate error, running robust client fallback:', err);
      // Fallback: heuristic Indonesian parsing on client
      try {
        const parsed = textToSend ? heuristicParseIndonesianText(textToSend) : null;
        if (parsed) {
          const currentWals = demoStore.getWallets();
          let chosenWal = demoStore.getDefaultWallet();
          for (const w of currentWals) {
            const lowerW = w.name.toLowerCase();
            const tokens = lowerW.split(/\s+/).filter((t) => !['dompet', 'rekening', 'tabungan', 'saldo', 'prioritas', 'akun'].includes(t));
            const wordsToMatch = [lowerW, ...tokens];
            if (wordsToMatch.some((tok) => tok.length >= 2 && textToSend.toLowerCase().includes(tok))) {
              chosenWal = w;
              break;
            }
          }

          const cats = demoStore.getCategories();
          const matchedCat =
            cats.find((c) => c.name.toLowerCase() === parsed.categoryName.toLowerCase()) ||
            cats.find((c) => c.name.toLowerCase().includes(parsed.categoryName.toLowerCase())) ||
            cats.find((c) => parsed.categoryName.toLowerCase().includes(c.name.toLowerCase())) ||
            (parsed.type === 'income' ? cats.find((c) => c.type === 'income') : cats.find((c) => c.type === 'expense')) ||
            cats[0];

          demoStore.addTransaction({
            wallet_id: chosenWal.id,
            category_id: matchedCat.id,
            type: parsed.type,
            amount: parsed.amount,
            description: parsed.description,
            source: 'telegram_text',
            idempotencyKey: `client_fb_${userMsg.id}`,
          });

          const updatedWal = demoStore.getWallets().find((w) => w.id === chosenWal.id) || chosenWal;
          const sign = parsed.type === 'expense' ? '💸' : '💰';
          const typeLabel = parsed.type === 'expense' ? 'Pengeluaran' : 'Pemasukan';
          const replyText = `📅 Hari ini — ${timeStr} WIB\n${sign} ${typeLabel} tercatat!\n├ Nominal : Rp${parsed.amount.toLocaleString('id-ID')}\n├ Kategori : ${matchedCat.icon} ${matchedCat.name}\n├ Dompet : 👛 ${updatedWal.name}\n├ Catatan : ${parsed.description}\n└ Saldo ${parsed.type === 'expense' ? '' : 'baru '}: Rp${updatedWal.balance.toLocaleString('id-ID')}`;

          demoStore.addSimMessage({
            id: `msg_b_${userMsg.id}`,
            sender: 'bot',
            text: replyText,
            timestamp: timeStr,
          });

          setBalanceDelta({ type: parsed.type, amount: parsed.amount });
          setLastAction(`${sign} ${typeLabel} Rp${parsed.amount.toLocaleString('id-ID')} berhasil dicatat!`);
          setTimeout(() => {
            setLastAction(null);
            setBalanceDelta(null);
          }, 4000);
        } else if (
          textToSend &&
          (textToSend.startsWith('/bayar') ||
            textToSend.startsWith('/rekening') ||
            textToSend.startsWith('/makan') ||
            textToSend.startsWith('/bensin') ||
            textToSend.toLowerCase().startsWith('bayar ') ||
            textToSend.toLowerCase().startsWith('beli '))
        ) {
          const currentWals = demoStore.getWallets();
          const { wallet: chosenWallet, cleanText } = matchWalletFromText(textToSend, currentWals);
          const parsed = parseIndonesianAmount(cleanText) || parseIndonesianAmount(textToSend);

          if (!chosenWallet) {
            // Show interactive wallet selection for pay
            const isBensin = textToSend.startsWith('/bensin');
            const isMakan = textToSend.startsWith('/makan');
            const defaultNominal = isBensin ? 50000 : 25000;
            const defaultNote = isBensin ? 'bensin' : (isMakan ? 'makan' : '');

            let cleanNote = (cleanText || textToSend)
              .replace(/^\/(?:bayar|rekening|makan|bensin)/i, '')
              .replace(/(?:rp\.?\s*)?[\d]+(?:[.,]\d+)?\s*(?:jt|juta|rb|ribu|k)\b/gi, '')
              .replace(/(?:rp\.?\s*)?\b\d{1,3}(?:\.\d{3})+\b/gi, '')
              .replace(/(?:rp\.?\s*)?\b\d{4,}\b/gi, '')
              .replace(/\b(?:bayar|beli)\b/gi, '')
              .replace(/\s{2,}/g, ' ')
              .trim() || defaultNote;

            const finalAmount = parsed || defaultNominal;
            const amountStr = finalAmount >= 1000 ? `${finalAmount / 1000}rb` : `${finalAmount}`;
            const noteStr = cleanNote ? ` ${cleanNote}` : '';

            const options = currentWals.map((w) => {
              const slug = getWalletSlug(w);
              return {
                walletId: w.id,
                name: w.name,
                type: w.type,
                balance: w.balance,
                color: w.color,
                command: `/bayar_${slug} ${amountStr}${noteStr}`.trim(),
              };
            });

            let reply = `💳 *Pilih Rekening / Dompet Pembayaran*\n`;
            reply += `├ Nominal   : *Rp${finalAmount.toLocaleString('id-ID')}*${cleanNote ? ` (${cleanNote})` : ''}\n`;
            reply += `└ Silakan pilih rekening sumber dana pembayaran:\n\n`;
            currentWals.forEach((w) => {
              const slug = getWalletSlug(w);
              const isDef = w.is_default ? ' ⭐ (Default)' : '';
              const icon = w.type === 'bank' ? '🏦' : w.type === 'ewallet' ? '📱' : '💵';
              reply += `${icon} *${w.name}*: Rp${w.balance.toLocaleString('id-ID')}${isDef}\n`;
              reply += `👉 Bayar via ini: \`/bayar_${slug} ${amountStr}${noteStr}\`\n\n`;
            });
            reply += `💡 _Klik perintah di atas atau pilih langsung tombol rekening di bawah._`;

            demoStore.addSimMessage({
              id: `msg_b_${Date.now()}`,
              sender: 'bot',
              text: reply,
              timestamp: timeStr,
              action: {
                type: 'select_wallet_pay',
                amount: parsed || undefined,
                description: cleanNote || undefined,
                options,
              },
            });
          } else {
            let cleanNote = (cleanText || textToSend)
              .replace(/(?:rp\.?\s*)?[\d]+(?:[.,]\d+)?\s*(?:jt|juta|rb|ribu|k)\b/gi, '')
              .replace(/(?:rp\.?\s*)?\b\d{1,3}(?:\.\d{3})+\b/gi, '')
              .replace(/(?:rp\.?\s*)?\b\d{4,}\b/gi, '');
            for (const w of currentWals) {
              const tokens = w.name.toLowerCase().split(/\s+/);
              for (const tok of tokens) {
                if (tok.length >= 2) cleanNote = cleanNote.replace(new RegExp(`\\b${tok}\\b`, 'gi'), '');
              }
            }
            cleanNote = cleanNote
              .replace(/\bpakai\b/gi, '')
              .replace(/\bvia\b/gi, '')
              .replace(/\bdengan\b/gi, '')
              .replace(/\s{2,}/g, ' ')
              .trim();
            const desc = cleanNote && cleanNote.length >= 2 ? cleanNote : `Bayar via ${chosenWallet.name}`;

            const cats = demoStore.getCategories();
            let expenseCat = cats.find((c) => c.type === 'expense') || cats[0];
            if (cleanNote) {
              if (/makan|bakso|baso|kopi|mie|nasi|ayam|soto/i.test(cleanNote)) {
                const foodCat = cats.find((c) => c.name.toLowerCase().includes('makan'));
                if (foodCat) expenseCat = foodCat;
              } else {
                const matched = cats.find(
                  (c) => c.type === 'expense' && cleanNote.toLowerCase().includes(c.name.toLowerCase())
                );
                if (matched) expenseCat = matched;
              }
            }

            const payAmount = parsed || 25000;
            demoStore.addTransaction({
              wallet_id: chosenWallet.id,
              category_id: expenseCat.id,
              type: 'expense',
              amount: payAmount,
              description: desc,
              source: 'telegram_text',
              idempotencyKey: `client_fb_${userMsg.id}`,
            });
            const updatedW = demoStore.getWallets().find((w) => w.id === chosenWallet.id)!;
            const reply = `📅 Hari ini — ${timeStr} WIB\n💸 Pembayaran tercatat!\n├ Nominal   : Rp${payAmount.toLocaleString(
              'id-ID'
            )}\n├ Rekening  : 💳 ${updatedW.name}\n├ Kategori  : ${expenseCat.icon || '🍜'} ${
              expenseCat.name
            }\n├ Catatan   : ${desc}\n└ Sisa Saldo: Rp${updatedW.balance.toLocaleString('id-ID')}`;
            demoStore.addSimMessage({
              id: `msg_b_${userMsg.id}`,
              sender: 'bot',
              text: reply,
              timestamp: timeStr,
            });
            setBalanceDelta({ type: 'expense', amount: payAmount });
            setLastAction(
              `💸 Pembayaran Rp${payAmount.toLocaleString('id-ID')} via ${updatedW.name} berhasil dicatat!`
            );
            setTimeout(() => {
              setLastAction(null);
              setBalanceDelta(null);
            }, 4000);
          }
        } else if (
          textToSend &&
          (textToSend.startsWith('/topup') ||
            textToSend.startsWith('/top_up') ||
            textToSend.startsWith('/tambah_saldo') ||
            textToSend.startsWith('/tambahsaldo') ||
            textToSend.startsWith('/pemasukan') ||
            textToSend.startsWith('/isi_saldo') ||
            textToSend.toLowerCase().startsWith('top up') ||
            textToSend.toLowerCase().startsWith('tambah saldo'))
        ) {
          const currentWals = demoStore.getWallets();
          const { wallet: chosenWallet, cleanText } = matchWalletFromText(textToSend, currentWals);
          const parsed = parseIndonesianAmount(cleanText) || parseIndonesianAmount(textToSend);

          if (!chosenWallet) {
            // Show interactive wallet selection for top up
            const amountStr = parsed ? (parsed >= 1000 ? `${parsed / 1000}rb` : `${parsed}`) : '100rb';
            const options = currentWals.map((w) => {
              const slug = getWalletSlug(w);
              return {
                walletId: w.id,
                name: w.name,
                type: w.type,
                balance: w.balance,
                color: w.color,
                command: `/topup_${slug} ${amountStr}`.trim(),
              };
            });

            let reply = `💰 *Pilih Rekening / Dompet Tujuan Top Up*\n`;
            if (parsed) {
              reply += `├ Nominal : *Rp${parsed.toLocaleString('id-ID')}*\n`;
            }
            reply += `└ Siap ditambahkan ke saldo dompet pilihanmu\n\n`;
            reply += `Silakan pilih rekening atau dompet yang ingin kamu isi saldonya:\n\n`;
            currentWals.forEach((w) => {
              const slug = getWalletSlug(w);
              const isDef = w.is_default ? ' ⭐ (Default)' : '';
              const icon = w.type === 'bank' ? '🏦' : w.type === 'ewallet' ? '📱' : '💵';
              reply += `${icon} *${w.name}*: Rp${w.balance.toLocaleString('id-ID')}${isDef}\n`;
              reply += `👉 Top Up via ini: \`/topup_${slug} ${amountStr}\`\n\n`;
            });
            reply += `💡 _Klik perintah di atas atau pilih langsung tombol rekening di bawah._`;

            demoStore.addSimMessage({
              id: `msg_b_${Date.now()}`,
              sender: 'bot',
              text: reply,
              timestamp: timeStr,
              action: {
                type: 'select_wallet_topup',
                amount: parsed || undefined,
                options,
              },
            });
          } else {
            const topUpAmount = parsed || 100000;
            const cats = demoStore.getCategories();
            const incomeCat =
              cats.find((c) => c.name.toLowerCase().includes('pemasukan') || c.type === 'income') || cats[0];

            demoStore.addTransaction({
              wallet_id: chosenWallet.id,
              category_id: incomeCat.id,
              type: 'income',
              amount: topUpAmount,
              description: `Top Up Saldo ${chosenWallet.name}`,
              source: 'telegram_text',
              idempotencyKey: `client_fb_${userMsg.id}`,
            });

            const updatedWal = demoStore.getWallets().find((w) => w.id === chosenWallet.id)!;
            const reply = `📅 Hari ini — ${timeStr} WIB\n💰 Top Up Saldo Berhasil!\n├ Nominal   : Rp${topUpAmount.toLocaleString(
              'id-ID'
            )}\n├ Rekening  : 💳 ${updatedWal.name}\n├ Kategori  : 💼 Pemasukan\n└ Saldo Baru: Rp${updatedWal.balance.toLocaleString(
              'id-ID'
            )}\n\n💪 Semangat terus! Saldo dompet ${updatedWal.name} sudah berhasil diperbarui.`;

            demoStore.addSimMessage({
              id: `msg_b_${userMsg.id}`,
              sender: 'bot',
              text: reply,
              timestamp: timeStr,
            });
            setBalanceDelta({ type: 'income', amount: topUpAmount });
            setLastAction(`💰 Top Up Rp${topUpAmount.toLocaleString('id-ID')} ke ${updatedWal.name} berhasil!`);
            setTimeout(() => {
              setLastAction(null);
              setBalanceDelta(null);
            }, 4000);
          }
        } else if (textToSend && textToSend.startsWith('/saldo')) {
          const currentWals = demoStore.getWallets();
          const tot = currentWals.reduce((a, b) => a + b.balance, 0);
          let reply = `👛 *Saldo Dompet TataDana*\n\n`;
          currentWals.forEach((w) => {
            const star = w.is_default ? ' ⭐ (Default)' : '';
            reply += `├ ${w.name}: Rp${w.balance.toLocaleString('id-ID')}${star}\n`;
          });
          reply += `\n💰 *Total Aset:* Rp${tot.toLocaleString('id-ID')}`;

          demoStore.addSimMessage({
            id: `msg_b_${Date.now()}`,
            sender: 'bot',
            text: reply,
            timestamp: timeStr,
          });
        } else if (
          textToSend &&
          (textToSend.startsWith('/pilih_dompet') ||
            textToSend.startsWith('/pilihdompet') ||
            textToSend.startsWith('/ganti_dompet') ||
            textToSend.startsWith('/dompet'))
        ) {
          const param = textToSend
            .replace(/^\/(?:pilih_dompet|pilihdompet|ganti_dompet|gantidompet|dompet)/i, '')
            .trim();
          const currentWals = demoStore.getWallets();
          if (!param) {
            let reply = `👛 *Pilih Dompet Aktif TataDana*\n\n`;
            reply += `Dompet yang saat ini aktif: *${defaultWallet?.name}*\n\n*Daftar Dompet Tersedia:*\n`;
            currentWals.forEach((w) => {
              const star = w.is_default ? ' ⭐ (Aktif)' : '';
              reply += `• *${w.name}*: Rp${w.balance.toLocaleString('id-ID')}${star}\n`;
            });
            reply += `\n👉 Ketik perintah untuk mengganti:\n`;
            currentWals.forEach((w) => {
              reply += `• \`/pilih_dompet ${getWalletSlug(w)}\`\n`;
            });
            demoStore.addSimMessage({
              id: `msg_b_${Date.now()}`,
              sender: 'bot',
              text: reply,
              timestamp: timeStr,
            });
          } else {
            const matched = demoStore.selectWalletByName(param);
            if (matched) {
              setDefaultWallet(matched);
              demoStore.addSimMessage({
                id: `msg_b_${Date.now()}`,
                sender: 'bot',
                text: `👛 *Dompet Utama Berhasil Diubah!*\n\n✅ Dompet aktif sekarang: *${matched.name}*\n💰 Saldo: *Rp${matched.balance.toLocaleString('id-ID')}*\n\nSemua transaksi baru di bot ini otomatis memotong/menambah saldo dompet *${matched.name}*.`,
                timestamp: timeStr,
              });
              setLastAction(`Dompet aktif: ${matched.name}`);
              setTimeout(() => setLastAction(null), 3000);
            } else {
              demoStore.addSimMessage({
                id: `msg_b_${Date.now()}`,
                sender: 'bot',
                text: `⚠️ Dompet "${param}" tidak ditemukan.\nPilihan yang tersedia:\n${currentWals.map((w) => `• \`/pilih_dompet ${getWalletSlug(w)}\``).join('\n')}`,
                timestamp: timeStr,
              });
            }
          }
        } else {
          demoStore.addSimMessage({
            id: `msg_b_${Date.now()}`,
            sender: 'bot',
            text: `⚠️ Pesan belum dapat diproses secara lokal.\n\nContoh format yang didukung:\n• "/makan"\n• "5 ribu makan"\n• "/tambah_saldo"\n• "beli kopi 25rb"\n• "/saldo"\n\nAtau gunakan bot asli di Telegram:\n🔗 https://t.me/rumahtatdanabot`,
            timestamp: timeStr,
          });
        }
      } catch (fallbackErr) {
        demoStore.addSimMessage({
          id: `msg_b_${Date.now()}`,
          sender: 'bot',
          text: `⚠️ Terjadi kendala teknis pada simulator. Silakan hubungi bot Telegram resmi: https://t.me/rumahtatdanabot`,
          timestamp: timeStr,
        });
      }
    } finally {
      isSendingRef.current = false;
      setIsLoading(false);
    }
  };

  const renderInteractiveWalletWidget = (msg: TelegramSimMessage) => {
    const isPaymentPrompt =
      msg.action?.type === 'select_wallet_pay' ||
      (msg.text && msg.text.includes('Pilih Rekening / Dompet Pembayaran'));
    const isTopUpPrompt =
      msg.action?.type === 'select_wallet_topup' ||
      (msg.text && msg.text.includes('Pilih Rekening / Dompet Tujuan Top Up'));

    if (!isPaymentPrompt && !isTopUpPrompt) return null;

    let nominal = msg.action?.amount;
    let description = msg.action?.description;

    if (!nominal && msg.text) {
      const match = msg.text.match(/Nominal\s*:\s*\*?Rp([\d.,]+)\*?(?:\s*\((.*?)\))?/i);
      if (match) {
        nominal = parseInt(match[1].replace(/[.,]/g, ''), 10);
        if (match[2] && !description) description = match[2].trim();
      }
    }

    const nominalStr = nominal
      ? (nominal >= 1000 ? `${nominal / 1000}rb` : `${nominal}`)
      : (isPaymentPrompt ? '25rb' : '100rb');

    const currentWallets = demoStore.getWallets();
    const options = (msg.action?.options && msg.action.options.length > 0)
      ? msg.action.options.map((opt) => {
          const fresh = currentWallets.find((w) => w.id === opt.walletId);
          return fresh ? { ...opt, balance: fresh.balance } : opt;
        })
      : currentWallets.map((w) => {
          const slug = getWalletSlug(w);
          const descPart = description ? ` ${description}` : '';
          const cmd = isPaymentPrompt
            ? `/bayar_${slug} ${nominalStr}${descPart}`
            : `/topup_${slug} ${nominalStr}`;
          return {
            walletId: w.id,
            name: w.name,
            type: w.type,
            balance: w.balance,
            color: w.color,
            command: cmd.trim(),
          };
        });

    return (
      <div className="mt-3 pt-2.5 border-t border-white/10 space-y-2.5 font-sans">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span
              className={`p-1 rounded-md ${
                isPaymentPrompt ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
              }`}
            >
              {isPaymentPrompt ? <CreditCard className="w-3.5 h-3.5" /> : <Wallet className="w-3.5 h-3.5" />}
            </span>
            <span className="text-[11px] font-bold tracking-wide text-white uppercase">
              {isPaymentPrompt ? 'Pilih Rekening Pembayaran' : 'Pilih Rekening Tujuan Top Up'}
            </span>
          </div>
          {nominal ? (
            <span
              className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                isPaymentPrompt
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              }`}
            >
              Rp {nominal.toLocaleString('id-ID')} {description ? `• ${description}` : ''}
            </span>
          ) : (
            <span className="text-[10px] text-gray-400">Pilih salah satu rekening</span>
          )}
        </div>

        <p className="text-[11px] text-gray-300 leading-relaxed">
          {isPaymentPrompt
            ? 'Klik rekening/dompet yang ingin kamu gunakan untuk membayar:'
            : 'Klik rekening/dompet yang ingin kamu isi saldonya:'}
        </p>

        {/* Quick Amount Pills if no initial amount */}
        {!nominal && (
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            <span className="text-[10px] text-gray-400">Pilihan nominal cepat:</span>
            {[25000, 50000, 100000, 250000, 500000].map((quickAmt) => (
              <button
                key={quickAmt}
                type="button"
                disabled={isLoading}
                onClick={() => {
                  const quickStr = quickAmt >= 1000 ? `${quickAmt / 1000}rb` : `${quickAmt}`;
                  const cmd = isPaymentPrompt ? `/bayar ${quickStr}` : `/topup ${quickStr}`;
                  handleSend(cmd);
                }}
                className="text-[10px] px-2 py-0.5 rounded-md bg-[#252C3A] hover:bg-blue-600/30 text-gray-200 border border-[#374357] transition-colors"
              >
                Rp {(quickAmt / 1000)}rb
              </button>
            ))}
          </div>
        )}

        {/* Wallet Options Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          {options.map((opt) => {
            const isDef = opt.walletId === defaultWallet?.id;
            return (
              <button
                key={opt.walletId}
                type="button"
                disabled={isLoading}
                onClick={() => handleSend(opt.command)}
                className={`group flex items-center justify-between p-2.5 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                  isPaymentPrompt
                    ? 'bg-[#141822] hover:bg-[#1D2230] border-[#2A3446] hover:border-rose-500/60 shadow-sm'
                    : 'bg-[#141822] hover:bg-[#1D2230] border-[#2A3446] hover:border-emerald-500/60 shadow-sm'
                }`}
                title={`Klik untuk ${isPaymentPrompt ? 'membayar dari' : 'top up ke'} ${opt.name}`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs shrink-0 ${
                      opt.type === 'bank'
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        : opt.type === 'ewallet'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {opt.type === 'bank' ? '🏦' : opt.type === 'ewallet' ? '📱' : '💵'}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-semibold text-white truncate group-hover:text-blue-300">
                        {opt.name}
                      </span>
                      {isDef && (
                        <span className="text-[9px] bg-blue-500/20 text-blue-400 px-1 py-0.1 rounded border border-blue-500/30 shrink-0">
                          ⭐
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-gray-400 font-mono">
                      Saldo: <span className="text-gray-200 font-medium">Rp {opt.balance.toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                </div>

                <div
                  className={`shrink-0 ml-2 px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all ${
                    isPaymentPrompt
                      ? 'bg-rose-500/15 text-rose-300 group-hover:bg-rose-500 group-hover:text-white border border-rose-500/20'
                      : 'bg-emerald-500/15 text-emerald-300 group-hover:bg-emerald-500 group-hover:text-white border border-emerald-500/20'
                  }`}
                >
                  <span>{isPaymentPrompt ? 'Bayar' : 'Top Up'}</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            );
          })}
        </div>

        <div className="text-[10px] text-gray-400 italic flex items-center justify-between pt-0.5">
          <span>⚡ Tersinkron langsung ke saldo & mutasi transaksi</span>
          <span className="text-gray-500">1-klik proses</span>
        </div>
      </div>
    );
  };

  const sampleQuickActions = [
    { label: '🍜 /makan (Pilih Rekening)', text: '/makan' },
    { label: '⛽ /bensin (Pilih Rekening)', text: '/bensin' },
    { label: '💳 /bayar (Pilih Rekening)', text: '/bayar' },
    { label: '⚡ /topup (Pilih Rekening)', text: '/topup' },
    { label: '🍲 bayar baso 5 ribu pakai BCA', text: 'bayar baso 5 ribu pakai BCA' },
    { label: '📱 top up dana 50rb', text: '/topup_dana 50rb' },
    { label: '👛 /saldo', text: '/saldo' },
    { label: '📊 /budget', text: '/budget' },
    { label: '📅 /hari_ini', text: '/hari_ini' },
  ];

  return (
    <div
      className={`flex flex-col bg-[#11141A] border border-[#262C38] rounded-2xl shadow-2xl overflow-hidden ${
        compact ? 'h-[520px]' : 'h-[680px]'
      }`}
    >
      {/* Telegram Header */}
      <div className="bg-[#181C24] px-4 py-3 border-b border-[#262C38] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#2563EB] to-[#60A5FA] flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/30">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#181C24]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="font-semibold text-white text-sm">RumahTataDana Bot</h4>
              <span className="bg-blue-500/20 text-blue-400 text-[10px] font-semibold px-1.5 py-0.2 rounded border border-blue-500/30">
                VERIFIED
              </span>
            </div>
            <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              @rumahtatdanabot • real-time sync
            </p>
          </div>
        </div>

        {/* Action Controls & Telegram Fallback Link Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTokenCard(!showTokenCard)}
            title="Konfigurasi Token HTTP API Telegram"
            className={`p-1.5 px-2.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors ${
              isBotConnected
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                : 'border-amber-500/40 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span className="text-[11px] font-semibold">{isBotConnected ? 'Token Aktif' : 'Sambungkan Token Bot'}</span>
          </button>

          <button
            onClick={handleResetChat}
            title="Reset percakapan simulator"
            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-xs flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px]">Reset Chat</span>
          </button>

          <a
            href="https://t.me/rumahtatdanabot"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold shadow-md shadow-blue-500/25 transition-all shrink-0"
            title="Buka bot resmi di Telegram: https://t.me/rumahtatdanabot"
          >
            <Bot className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Buka di Telegram (@rumahtatdanabot)</span>
            <span className="sm:hidden">Telegram</span>
            <ExternalLink className="w-3.5 h-3.5 ml-0.5" />
          </a>
        </div>
      </div>

      {/* Token Setup Banner for @rumahtatdanabot */}
      {(!isBotConnected || showTokenCard) && (
        <div className="bg-[#191F2D] border-b border-[#2B3545] px-4 py-3 transition-all animate-fadeIn">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div className="p-1.5 bg-amber-500/10 rounded-lg border border-amber-500/20 text-amber-400 shrink-0 mt-0.5">
                <Key className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-white text-xs font-bold">
                    {isBotConnected ? '✅ Bot @rumahtatdanabot Terhubung' : '🔑 Sambungkan Bot Telegram @rumahtatdanabot'}
                  </span>
                  <span className="text-[10px] px-2 py-0.2 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 font-medium">
                    dari @BotFather
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 mt-0.5 max-w-xl leading-relaxed">
                  {isBotConnected
                    ? 'Bot sudah tersambung dan siap membalas pesan live di Telegram.'
                    : 'Agar bot di Telegram bisa membalas saat Anda klik /makan atau mengetik pesan, masukkan Token API yang diberikan oleh @BotFather:'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <input
                type="text"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="7xxxxxxxx:AAxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="bg-[#0F1217] border border-[#2B3545] rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 w-full md:w-64 font-mono shadow-inner"
              />
              <button
                onClick={handleSaveToken}
                disabled={isSavingToken || !tokenInput.trim()}
                className="bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white text-xs px-3.5 py-1.5 rounded-lg font-semibold shrink-0 flex items-center gap-1.5 transition-all shadow-md shadow-blue-500/20"
              >
                {isSavingToken ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>{isSavingToken ? 'Menyimpan...' : 'Simpan & Aktifkan'}</span>
              </button>
            </div>
          </div>
          {tokenStatusMsg && (
            <div
              className={`mt-2 text-[11px] font-medium p-2 rounded-lg border ${
                tokenStatusMsg.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              }`}
            >
              {tokenStatusMsg.text}
            </div>
          )}
        </div>
      )}

      {/* Real-time Live Balance Header Strip */}
      <div className="bg-[#14171D] border-b border-[#262C38] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Active Wallet Selector Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-xs flex items-center gap-1.5 font-medium">
              <Wallet className="w-3.5 h-3.5 text-slate-300" />
              Dompet:
            </span>
            <div className="relative">
              <select
                value={defaultWallet?.id}
                onChange={(e) => handleWalletChange(e.target.value)}
                className="bg-[#181C24] hover:bg-[#1E2433] text-white font-medium text-xs py-1 px-2.5 pr-6 rounded-lg border border-slate-700 hover:border-slate-400/60 transition-all appearance-none cursor-pointer outline-none focus:ring-1 focus:ring-slate-300 shadow-sm"
                title="Pilih dompet aktif yang akan didebit atau dicek"
              >
                {wallets.map((w) => (
                  <option key={w.id} value={w.id} className="bg-[#14171D] text-white">
                    {w.name} {w.is_default ? '⭐' : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-gray-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <span
              className={`font-mono font-bold text-xs transition-colors duration-300 ${
                balanceDelta?.type === 'income'
                  ? 'text-emerald-400'
                  : balanceDelta?.type === 'expense'
                  ? 'text-rose-400'
                  : 'text-white'
              }`}
            >
              Rp {defaultWallet ? defaultWallet.balance.toLocaleString('id-ID') : '0'}
            </span>
          </div>

          <span className="text-[#262C38] hidden sm:inline">|</span>

          {/* Total Asset Balance */}
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-xs font-medium">Total Aset:</span>
            <span className="font-mono font-bold text-white text-xs">
              Rp {totalBalance.toLocaleString('id-ID')}
            </span>
          </div>
        </div>

        {/* Dynamic Action Notification */}
        <div className="flex items-center gap-2">
          {lastAction ? (
            <span className="text-[11px] text-emerald-400 font-semibold animate-pulse flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#3B82F6]" /> {lastAction}
            </span>
          ) : (
            <span className="text-[10px] text-emerald-400/90 font-medium flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              Live Saldo Sync Aktif
            </span>
          )}
        </div>
      </div>

      {/* Fallback Notice Banner */}
      <div className="bg-blue-950/30 border-b border-blue-900/30 px-4 py-1.5 flex items-center justify-between text-[11px] text-blue-300">
        <span className="truncate flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          Jaga-jaga jika ada kendala di simulator: akses bot resmi di Telegram.
        </span>
        <a
          href="https://t.me/rumahtatdanabot"
          target="_blank"
          rel="noreferrer"
          className="font-bold underline text-blue-300 hover:text-white shrink-0 ml-2 flex items-center gap-1"
        >
          <span>@rumahtatdanabot</span>
          <ExternalLink className="w-2.5 h-2.5" />
        </a>
      </div>

      {/* Telegram Messages Stream */}
      <div
        ref={chatContainerRef}
        onScroll={handleChatScroll}
        className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0D0F12]/60 bg-grid-pattern"
      >
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-full`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm text-sm whitespace-pre-wrap break-words ${
                  isUser
                    ? 'bg-[#FF6B00] text-white rounded-tr-none'
                    : 'bg-[#181C24] border border-[#262C38] text-gray-200 rounded-tl-none font-mono text-[13px] leading-relaxed'
                }`}
              >
                {/* Media Preview if photo or voice */}
                {msg.mediaUrl && (
                  <div className="mb-2 rounded-lg overflow-hidden border border-white/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={msg.mediaUrl}
                      alt="Struk upload"
                      className="max-h-48 w-full object-cover"
                    />
                  </div>
                )}
                {msg.type === 'voice' && (
                  <div className="flex items-center gap-2 mb-2 p-2 bg-black/20 rounded-lg">
                    <Mic className="w-4 h-4 text-[#FF8533]" />
                    <span className="text-xs italic text-gray-300">Telegram Voice Note (4.2s)</span>
                  </div>
                )}

                {msg.text}

                {/* Interactive Wallet Selection Widget (Payment or Top Up) */}
                {!isUser && renderInteractiveWalletWidget(msg)}

                {/* Clickable telegram link preview if mentioned in bot message */}
                {!isUser && (msg.text.includes('t.me') || msg.text.includes('@rumahtatdanabot') || msg.text.includes('@tatadana_bot')) && (
                  <div className="mt-2.5 pt-2 border-t border-white/10">
                    <a
                      href="https://t.me/rumahtatdanabot"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#60A5FA] hover:text-white bg-blue-500/20 hover:bg-blue-500/30 px-3 py-1.5 rounded-lg transition-all border border-blue-500/30"
                    >
                      <Bot className="w-3.5 h-3.5" />
                      <span>Buka di Telegram Asli (@rumahtatdanabot)</span>
                      <ExternalLink className="w-3 h-3 ml-0.5" />
                    </a>
                  </div>
                )}

                <div
                  className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                    isUser ? 'text-white/70' : 'text-gray-500'
                  }`}
                >
                  <span>{msg.timestamp}</span>
                  {isUser && <CheckCheck className="w-3.5 h-3.5 text-white/90" />}
                </div>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-2 bg-[#181C24] border border-[#262C38] text-gray-400 text-xs px-3 py-2 rounded-xl w-fit rounded-tl-none">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#FF6B00]" />
            <span>TataDana Bot sedang mengetik & memproses data...</span>
          </div>
        )}
      </div>

      {/* Quick Action Chips */}
      <div className="px-3 py-2 bg-[#14171D] border-t border-[#262C38] flex items-center gap-2 overflow-x-auto no-scrollbar">
        <span className="text-[11px] text-gray-400 shrink-0 font-medium flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-[#FF6B00]" /> Coba cepat:
        </span>
        {sampleQuickActions.map((action, i) => (
          <button
            key={i}
            type="button"
            disabled={isLoading}
            onClick={() => handleSend(action.text)}
            className="shrink-0 text-xs px-2.5 py-1 rounded-full bg-[#1F242F] hover:bg-[#FF6B00]/20 hover:text-[#FF8533] border border-[#2D3545] text-gray-300 transition-colors disabled:opacity-40"
          >
            {action.label}
          </button>
        ))}
        {/* Quick Receipt Simulation button */}
        <button
          type="button"
          disabled={isLoading}
          onClick={() =>
            handleSend(
              undefined,
              'https://images.unsplash.com/photo-1554415707-9e4966668834?w=500&auto=format&fit=crop&q=80'
            )
          }
          className="shrink-0 text-xs px-2.5 py-1 rounded-full bg-[#FF6B00]/15 border border-[#FF6B00]/30 text-[#FF8533] hover:bg-[#FF6B00]/25 transition-colors font-medium disabled:opacity-40"
        >
          🧾 Tes Foto Struk (Pro)
        </button>
        {/* Quick Voice Note Simulation button */}
        <button
          type="button"
          disabled={isLoading}
          onClick={() => handleSend(undefined, undefined, 'sample_audio_gocar')}
          className="shrink-0 text-xs px-2.5 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400 hover:bg-blue-500/25 transition-colors font-medium disabled:opacity-40"
        >
          🎙️ Tes Voice Note
        </button>
      </div>

      {/* Telegram Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-3 bg-[#181C24] border-t border-[#262C38] flex items-center gap-2"
      >
        <button
          type="button"
          disabled={isLoading}
          title="Upload Foto Struk Belanja"
          onClick={() =>
            handleSend(
              undefined,
              'https://images.unsplash.com/photo-1554415707-9e4966668834?w=500&auto=format&fit=crop&q=80'
            )
          }
          className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-xl transition-colors disabled:opacity-40"
        >
          <ImageIcon className="w-5 h-5" />
        </button>

        <button
          type="button"
          disabled={isLoading}
          title="Kirim Voice Note Simulasi"
          onClick={() => handleSend(undefined, undefined, 'sample_audio_gocar')}
          className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-xl transition-colors disabled:opacity-40"
        >
          <Mic className="w-5 h-5" />
        </button>

        <input
          type="text"
          value={inputText}
          disabled={isLoading}
          onChange={(e) => setInputText(e.target.value)}
          placeholder='Ketik pesan, cth: "beli kopi 25rb" atau "/saldo"...'
          className="flex-1 bg-[#11141A] border border-[#262C38] text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 transition-colors disabled:opacity-60"
        />

        <button
          type="submit"
          disabled={!inputText.trim() || isLoading}
          className="p-2.5 bg-[#2563EB] text-white rounded-xl hover:bg-[#1D4ED8] disabled:opacity-40 disabled:hover:bg-[#2563EB] transition-all shadow-md shadow-blue-500/25"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
