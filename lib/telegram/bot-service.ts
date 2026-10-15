import { demoStore, TelegramSimAction, TelegramSimActionOption } from '../store/demo-store';
import { parseTransactionWithAI, parseIndonesianAmount } from '../ai/parser';
import { parseReceiptPhoto } from '../ai/vision';
import { processVoiceNote } from '../ai/speech';
import { generateFinancialAdvice } from '../ai/advisor';
import { Wallet } from '../types';

export function getWIBDateString(date: Date = new Date()): { day: string; dateStr: string; timeStr: string } {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

  // Offset UTC+7
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const wib = new Date(utc + 7 * 3600000);

  const day = days[wib.getDay()];
  const dateStr = `${wib.getDate()} ${months[wib.getMonth()]} ${wib.getFullYear()}`;
  const hours = String(wib.getHours()).padStart(2, '0');
  const minutes = String(wib.getMinutes()).padStart(2, '0');
  const timeStr = `${hours}:${minutes} WIB`;

  return { day, dateStr, timeStr };
}

export function renderProgressBar(percent: number): string {
  const filledCount = Math.min(10, Math.max(0, Math.round(percent / 10)));
  const emptyCount = 10 - filledCount;
  return '█'.repeat(filledCount) + '░'.repeat(emptyCount);
}

export interface TelegramBotReplyResult {
  text: string;
  replyMarkup?: any;
  action?: TelegramSimAction;
}

export function getWalletSlug(wallet: Wallet): string {
  if (!wallet || !wallet.name) return 'wallet';
  const STOP_WORDS = new Set([
    'dompet',
    'rekening',
    'tabungan',
    'saldo',
    'prioritas',
    'akun',
    'bank',
    'wallet',
    'user',
  ]);
  const tokens = wallet.name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2 && !STOP_WORDS.has(t));

  if (tokens.length > 0) {
    return tokens[0];
  }
  if (wallet.name.toLowerCase().includes('utama')) return 'utama';
  if (wallet.type === 'cash') return 'tunai';
  const fallback = wallet.name.toLowerCase().replace(/[^a-z0-9]/g, '');
  return fallback.length >= 2 ? fallback : wallet.id.replace(/^wal_/, '');
}

export function matchWalletFromText(
  text: string,
  wallets: Wallet[]
): { wallet: Wallet | null; cleanText: string } {
  if (!text || !wallets || wallets.length === 0) {
    return { wallet: null, cleanText: text || '' };
  }

  const lower = text.toLowerCase();

  // Pass 1: Match specific wallet name, slug, or distinctive name tokens
  for (const w of wallets) {
    const slug = getWalletSlug(w);
    const wName = w.name.toLowerCase();
    const nameTokens = wName
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length >= 2 && !['dompet', 'rekening', 'tabungan', 'saldo', 'prioritas', 'akun'].includes(t));

    const targets: string[] = [wName, slug, ...nameTokens];

    if (w.id) {
      targets.push(w.id.toLowerCase());
      const idSuffix = w.id.toLowerCase().replace(/^wal_/, '');
      if (idSuffix.length >= 2) targets.push(idSuffix);
    }

    const uniqueTargets = Array.from(new Set(targets.filter((t) => t && t.length >= 2))).sort(
      (a, b) => b.length - a.length
    );

    for (const target of uniqueTargets) {
      const regex = new RegExp(`(?:^|[^a-z0-9]|_)${target}(?:[^a-z0-9]|_|$)`, 'i');
      if (regex.test(lower)) {
        const cleaned = text
          .replace(new RegExp(`_${target}\\b`, 'gi'), '')
          .replace(new RegExp(`\\b${target}\\b`, 'gi'), '')
          .replace(/\bpakai\b/gi, '')
          .replace(/\bke\b/gi, '')
          .replace(/\bvia\b/gi, '')
          .replace(/\bdengan\b/gi, '')
          .replace(/\s{2,}/g, ' ')
          .trim();
        return { wallet: w, cleanText: cleaned };
      }
    }
  }

  // Pass 2: Match generic fallback aliases (tunai, cash, dompet)
  for (const w of wallets) {
    const targets: string[] = [];
    if (w.name.toLowerCase().includes('tunai')) {
      targets.push('dompet', 'tunai', 'cash', 'dompet_tunai', 'uang_tunai');
    } else if (w.type === 'cash') {
      targets.push('tunai', 'cash', 'dompet');
    } else if (w.name.toLowerCase().includes('dompet')) {
      targets.push('dompet');
    }

    const uniqueTargets = Array.from(new Set(targets.filter((t) => t && t.length >= 2))).sort(
      (a, b) => b.length - a.length
    );

    for (const target of uniqueTargets) {
      const regex = new RegExp(`(?:^|[^a-z0-9]|_)${target}(?:[^a-z0-9]|_|$)`, 'i');
      if (regex.test(lower)) {
        const cleaned = text
          .replace(new RegExp(`_${target}\\b`, 'gi'), '')
          .replace(new RegExp(`\\b${target}\\b`, 'gi'), '')
          .replace(/\bpakai\b/gi, '')
          .replace(/\bke\b/gi, '')
          .replace(/\bvia\b/gi, '')
          .replace(/\bdengan\b/gi, '')
          .replace(/\s{2,}/g, ' ')
          .trim();
        return { wallet: w, cleanText: cleaned };
      }
    }
  }

  return { wallet: null, cleanText: text };
}

// In-memory response cache and in-flight promise map for idempotency
interface CachedBotReply {
  reply: TelegramBotReplyResult;
  timestamp: number;
}
const botReplyCache = new Map<string, CachedBotReply>();
const inFlightRequests = new Map<string, Promise<TelegramBotReplyResult>>();
const BOT_REPLY_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

export async function handleTelegramMessage(input: {
  text?: string;
  photoUrl?: string;
  voiceUrl?: string;
  chatId?: number;
  userId?: string;
  idempotencyKey?: string;
}): Promise<string> {
  const result = await handleTelegramMessageAdvanced(input);
  return result.text;
}

export async function handleTelegramMessageAdvanced(input: {
  text?: string;
  photoUrl?: string;
  voiceUrl?: string;
  chatId?: number;
  userId?: string;
  idempotencyKey?: string;
}): Promise<TelegramBotReplyResult> {
  // Compute unique key for deduplication and coalescing
  let cacheKey = input.idempotencyKey;
  if (!cacheKey) {
    const raw = (input.text || '').trim().toLowerCase();
    const media = input.photoUrl || input.voiceUrl || '';
    const chatPart = input.chatId ? String(input.chatId) : 'sim';
    // 2.5s anti-bounce window to merge rapid duplicate clicks/sends
    const timeWindow = Math.floor(Date.now() / 2500);
    cacheKey = `${chatPart}_${raw}_${media}_${timeWindow}`;
  }

  // 1. Check response cache
  const cached = botReplyCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < BOT_REPLY_CACHE_TTL_MS) {
    console.log(`[BotService] Returning cached response for key: ${cacheKey}`);
    return cached.reply;
  }

  // 2. Coalesce concurrent in-flight requests (atomic lock)
  if (inFlightRequests.has(cacheKey)) {
    console.log(`[BotService] In-flight request coalesced for key: ${cacheKey}`);
    return inFlightRequests.get(cacheKey)!;
  }

  // 3. Execute with in-flight tracking
  const executionPromise = (async () => {
    try {
      return await internalHandleTelegramMessage(input, cacheKey);
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  inFlightRequests.set(cacheKey, executionPromise);
  const reply = await executionPromise;

  // Cache response
  botReplyCache.set(cacheKey, { reply, timestamp: Date.now() });
  if (botReplyCache.size > 2000) {
    const oldestKey = botReplyCache.keys().next().value;
    if (oldestKey) botReplyCache.delete(oldestKey);
  }

  return reply;
}

async function internalHandleTelegramMessage(
  input: {
    text?: string;
    photoUrl?: string;
    voiceUrl?: string;
    chatId?: number;
    userId?: string;
    idempotencyKey?: string;
  },
  cacheKey: string
): Promise<TelegramBotReplyResult> {
  const asReply = (text: string, action?: TelegramSimAction, replyMarkup?: any): TelegramBotReplyResult => ({
    text,
    action,
    replyMarkup,
  });

  // Auto link Telegram chat ID if provided
  if (input.chatId) {
    const p = demoStore.getProfile();
    if (!p.telegram_chat_id) {
      demoStore.linkTelegramUser(input.chatId);
    }
  }

  const profile = demoStore.getProfile();
  const wallets = demoStore.getWallets();
  const defaultWallet = demoStore.getDefaultWallet();
  const categories = demoStore.getCategories();
  const transactions = demoStore.getTransactions();

  // 1. Check transaction quota for Starter Plan (max 50/month)
  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const currentMonthTxCount = transactions.filter((t) => t.transaction_date.startsWith(currentMonthKey)).length;
  if (profile.plan === 'starter' && currentMonthTxCount >= 50 && (input.text || input.photoUrl || input.voiceUrl)) {
    return asReply(`⚠️ Kuota Transaksi Bulanan Habis!\n\nPaket Starter memiliki batas maksimal 50 transaksi per bulan.\nUpgrade ke TataDana Pro (Rp99.000 Sekali Bayar) untuk transaksi tanpa batas, scan struk foto, & AI Advisor.\n\nKetik /upgrade atau kunjungi web dashboard.`);
  }

  // 2. Commands handler
  const rawText = input.text?.trim() || '';

  if (rawText.startsWith('/')) {
    const cmd = rawText.toLowerCase().replace(/@\w+/, '');

    // Account linking support
    if (cmd.startsWith('/link') || cmd.startsWith('/start link_')) {
      if (input.chatId) {
        demoStore.linkTelegramUser(input.chatId, profile.telegram_username || 'telegram_user');
        return asReply(`✅ *Akun Berhasil Dihubungkan!*\n\nTelegram ID kamu (${input.chatId}) telah tersambung dengan akun TataDana (${profile.full_name}).\nSemua transaksi yang kamu kirim di chat ini otomatis tersinkron ke dompet utama.`);
      }
    }

    if (cmd === '/start' || cmd === '/bantuan' || cmd === '/menu') {
      return asReply(`🤖 *Menu & Panduan Bot TataDana*\n\nCatat keuangan semudah chatting! Ketik pesan langsung atau pilih menu perintah berikut:\n\n*📌 Perintah Menu Utama:*\n• /saldo — Cek sisa saldo semua dompet\n• /bayar — Pilih rekening & bayar pengeluaran (cth: \`/bayar bca 25rb makan\`)\n• /topup — Pilih rekening & isi saldo (cth: \`/topup dana 50rb\`)\n• /pilih_dompet <nama> — Ganti dompet aktif (cth: \`/pilih_dompet gopay\`)\n• /makan <nominal> — Catat biaya makan (cth: \`/makan 25rb\`)\n• /tambah_saldo <nominal> — Tambah saldo/pemasukan (cth: \`/tambah_saldo 500rb\`)\n• /budget — Status sisa alokasi budget bulanan\n• /hari_ini — Rekap transaksi hari ini\n• /bulan_ini — Rekap transaksi & breakdown bulan ini\n• /sheet — Ringkasan & unduh laporan\n• /bantuan — Menampilkan menu ini\n\n*💬 Atau ketik bahasa santai:*\n• \`5 ribu makan\` atau \`beli bakso 15rb\`\n• \`bayar baso 5 ribu pakai BCA\`\n• \`beli kopi 25rb pakai gopay\`\n• \`top up dana 50rb\` atau \`tambah saldo 500rb\`\n• \`bensin 50k tunai\`\n• \`gajian 10jt bca\`\n• 📸 Kirim foto struk belanja (scan otomatis)\n• 🎙️ Kirim voice note suara`);
    }

    // /pilih_dompet or /ganti_dompet command
    if (
      cmd.startsWith('/pilih_dompet') ||
      cmd.startsWith('/pilihdompet') ||
      cmd.startsWith('/ganti_dompet') ||
      cmd.startsWith('/gantidompet') ||
      cmd.startsWith('/dompet')
    ) {
      const param = rawText.replace(/^\/(?:pilih_dompet|pilihdompet|ganti_dompet|gantidompet|dompet)(?:@\w+)?/i, '').trim();
      const currentWallets = demoStore.getWallets();

      if (!param) {
        let reply = `👛 *Pilih Dompet Aktif TataDana*\n\n`;
        reply += `Dompet yang saat ini aktif: *${defaultWallet.name}* (Rp${defaultWallet.balance.toLocaleString('id-ID')})\n\n`;
        reply += `*Daftar Dompet Tersedia:*\n`;
        currentWallets.forEach((w) => {
          const star = w.is_default ? ' ⭐ (Aktif)' : '';
          reply += `• *${w.name}*: Rp${w.balance.toLocaleString('id-ID')}${star}\n`;
        });
        reply += `\n👉 Ketik perintah untuk mengganti:\n`;
        currentWallets.forEach((w) => {
          const slug = getWalletSlug(w);
          reply += `• \`/pilih_dompet ${slug}\`\n`;
        });
        return asReply(reply);
      }

      const matched = demoStore.selectWalletByName(param);
      if (matched) {
        return asReply(`👛 *Dompet Utama Berhasil Diubah!*\n\n✅ Dompet aktif sekarang: *${matched.name}*\n💰 Saldo: *Rp${matched.balance.toLocaleString('id-ID')}*\n\nSemua transaksi baru di bot ini otomatis memotong/menambah saldo dompet *${matched.name}*.`);
      } else {
        let reply = `⚠️ Dompet "${param}" tidak ditemukan.\n\n*Pilihan dompet yang tersedia:*\n`;
        currentWallets.forEach((w) => {
          reply += `• \`/pilih_dompet ${getWalletSlug(w)}\`\n`;
        });
        return asReply(reply);
      }
    }

    // /bayar, /rekening, /makan, /bensin command: choose rekening/wallet before paying or pay with specific rekening
    if (
      cmd.startsWith('/bayar') ||
      cmd.startsWith('/rekening') ||
      cmd.startsWith('/makan') ||
      cmd.startsWith('/bensin')
    ) {
      const currentWallets = demoStore.getWallets();
      const param = rawText.replace(/^\/(?:bayar|rekening|makan|bensin)(?:@\w+)?/i, '').trim();

      const { wallet: matchedWallet, cleanText } = matchWalletFromText(rawText, currentWallets);
      const parsedAmount = parseIndonesianAmount(cleanText) || parseIndonesianAmount(param);

      if (!matchedWallet) {
        // User has NOT selected a wallet yet -> show interactive rekening/wallet picker before paying!
        const isBensin = cmd.startsWith('/bensin');
        const isMakan = cmd.startsWith('/makan');
        const defaultCmdAmount = isBensin ? 50000 : 25000;
        const defaultCmdNote = isBensin ? 'bensin' : (isMakan ? 'makan' : '');

        let cleanNote = (cleanText || param)
          .replace(/^\/(?:bayar|rekening|makan|bensin)(?:@\w+)?/i, '')
          .replace(/(?:rp\.?\s*)?[\d]+(?:[.,]\d+)?\s*(?:jt|juta|rb|ribu|k)\b/gi, '')
          .replace(/(?:rp\.?\s*)?\b\d{1,3}(?:\.\d{3})+\b/gi, '')
          .replace(/(?:rp\.?\s*)?\b\d{4,}\b/gi, '')
          .replace(/\b(?:bayar|beli)\b/gi, '')
          .replace(/\s{2,}/g, ' ')
          .trim() || defaultCmdNote;

        const effectiveAmount = parsedAmount || defaultCmdAmount;
        const amountStr = effectiveAmount >= 1000 ? `${effectiveAmount / 1000}rb` : `${effectiveAmount}`;
        const noteStr = cleanNote ? ` ${cleanNote}` : '';

        const options: TelegramSimActionOption[] = currentWallets.map((w) => {
          const slug = getWalletSlug(w);
          return {
            walletId: w.id,
            name: w.name,
            type: w.type,
            balance: w.balance,
            icon: w.type === 'bank' ? 'landmark' : w.type === 'ewallet' ? 'smartphone' : 'banknote',
            color: w.color,
            command: `/bayar_${slug} ${amountStr}${noteStr}`.trim(),
          };
        });

        const replyMarkup = {
          inline_keyboard: currentWallets.map((w) => {
            const slug = getWalletSlug(w);
            const icon = w.type === 'bank' ? '🏦' : w.type === 'ewallet' ? '📱' : '💵';
            return [
              {
                text: `${icon} ${w.name} (Rp${w.balance.toLocaleString('id-ID')})`,
                callback_data: `/bayar_${slug} ${amountStr}${noteStr}`.trim(),
              },
            ];
          }),
        };

        const action: TelegramSimAction = {
          type: 'select_wallet_pay',
          amount: effectiveAmount,
          description: cleanNote || undefined,
          options,
        };

        let reply = `💳 *Pilih Rekening / Dompet Pembayaran*\n`;
        reply += `├ Nominal   : *Rp${effectiveAmount.toLocaleString('id-ID')}*${cleanNote ? ` (${cleanNote})` : ''}\n`;
        reply += `└ Silakan pilih rekening sumber dana pembayaran:\n\n`;
        currentWallets.forEach((w) => {
          const slug = getWalletSlug(w);
          const isDef = w.is_default ? ' ⭐ (Default)' : '';
          const icon = w.type === 'bank' ? '🏦' : w.type === 'ewallet' ? '📱' : '💵';
          reply += `${icon} *${w.name}*: Rp${w.balance.toLocaleString('id-ID')}${isDef}\n`;
          reply += `👉 Bayar via ini: \`/bayar_${slug} ${amountStr}${noteStr}\`\n\n`;
        });
        reply += `💡 _Klik perintah di atas atau pilih langsung tombol rekening di bawah._`;

        return asReply(reply, action, replyMarkup);
      }

      // Wallet is matched! Execute payment from matchedWallet
      const chosenWallet = matchedWallet;
      const isBensin = cmd.startsWith('/bensin');
      const defaultCmdAmount = isBensin ? 50000 : 25000;
      const amount = parsedAmount || defaultCmdAmount;

      let cleanNote = (cleanText || param)
        .replace(/^\/(?:bayar|rekening|makan|bensin)(?:@\w+)?/i, '')
        .replace(/(?:rp\.?\s*)?[\d]+(?:[.,]\d+)?\s*(?:jt|juta|rb|ribu|k)\b/gi, '')
        .replace(/(?:rp\.?\s*)?\b\d{1,3}(?:\.\d{3})+\b/gi, '')
        .replace(/(?:rp\.?\s*)?\b\d{4,}\b/gi, '')
        .replace(/\b(?:bayar|beli)\b/gi, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
      const desc = cleanNote && cleanNote.length >= 2 ? cleanNote : `Bayar via ${chosenWallet.name}`;

      let expenseCat = categories.find((c) => c.type === 'expense') || categories[0];
      if (cleanNote) {
        if (/makan|bakso|baso|kopi|mie|nasi|ayam|soto/i.test(cleanNote)) {
          const foodCat = categories.find((c) => c.name.toLowerCase().includes('makan'));
          if (foodCat) expenseCat = foodCat;
        } else {
          const matched = categories.find(
            (c) => c.type === 'expense' && (cleanNote.toLowerCase().includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(cleanNote.toLowerCase()))
          );
          if (matched) expenseCat = matched;
        }
      }

      demoStore.addTransaction({
        wallet_id: chosenWallet.id,
        category_id: expenseCat.id,
        type: 'expense',
        amount,
        description: desc,
        source: 'telegram_text',
        idempotencyKey: `${cacheKey}_bayar`,
      });

      const { day, dateStr, timeStr } = getWIBDateString();
      const updatedW = demoStore.getWallets().find((w) => w.id === chosenWallet.id)!;

      let reply = `📅 ${day}, ${dateStr} — ${timeStr}\n`;
      reply += `💸 Pembayaran Tercatat!\n`;
      reply += `├ Nominal   : Rp${amount.toLocaleString('id-ID')}\n`;
      reply += `├ Rekening  : 💳 ${updatedW.name}\n`;
      reply += `├ Kategori  : ${expenseCat.icon || '🍜'} ${expenseCat.name}\n`;
      reply += `├ Catatan   : ${desc}\n`;
      reply += `└ Sisa Saldo: Rp${updatedW.balance.toLocaleString('id-ID')}\n\n`;
      reply += `✅ Rekening tersambung langsung dengan saldo akun TataDana kamu.`;
      return asReply(reply);
    }

    // /topup or /tambah_saldo command: choose rekening/wallet before top up or top up specific rekening
    if (
      cmd.startsWith('/topup') ||
      cmd.startsWith('/top_up') ||
      cmd.startsWith('/tambah_saldo') ||
      cmd.startsWith('/tambahsaldo') ||
      cmd.startsWith('/pemasukan') ||
      cmd.startsWith('/isi_saldo') ||
      cmd.startsWith('/isisaldo')
    ) {
      const currentWallets = demoStore.getWallets();
      const param = rawText.replace(/^\/(?:topup|top_up|tambah_saldo|tambahsaldo|pemasukan|isi_saldo|isisaldo)(?:@\w+)?/i, '').trim();

      const { wallet: matchedWallet, cleanText } = matchWalletFromText(rawText, currentWallets);
      const parsedAmount = parseIndonesianAmount(cleanText) || parseIndonesianAmount(param);

      if (!matchedWallet) {
        // User has NOT chosen a destination wallet -> show interactive wallet picker before top up!
        const amountStr = parsedAmount ? (parsedAmount >= 1000 ? `${parsedAmount / 1000}rb` : `${parsedAmount}`) : '100rb';

        const options: TelegramSimActionOption[] = currentWallets.map((w) => {
          const slug = getWalletSlug(w);
          return {
            walletId: w.id,
            name: w.name,
            type: w.type,
            balance: w.balance,
            icon: w.type === 'bank' ? 'landmark' : w.type === 'ewallet' ? 'smartphone' : 'banknote',
            color: w.color,
            command: `/topup_${slug} ${amountStr}`.trim(),
          };
        });

        const replyMarkup = {
          inline_keyboard: currentWallets.map((w) => {
            const slug = getWalletSlug(w);
            const icon = w.type === 'bank' ? '🏦' : w.type === 'ewallet' ? '📱' : '💵';
            return [
              {
                text: `➕ ${icon} ${w.name} (Rp${w.balance.toLocaleString('id-ID')})`,
                callback_data: `/topup_${slug} ${amountStr}`.trim(),
              },
            ];
          }),
        };

        const action: TelegramSimAction = {
          type: 'select_wallet_topup',
          amount: parsedAmount || undefined,
          options,
        };

        let reply = `💰 *Pilih Rekening / Dompet Tujuan Top Up*\n`;
        if (parsedAmount) {
          reply += `├ Nominal : *Rp${parsedAmount.toLocaleString('id-ID')}*\n`;
        }
        reply += `└ Siap ditambahkan ke saldo dompet pilihanmu\n\n`;
        reply += `Silakan pilih rekening atau dompet yang ingin kamu isi saldonya:\n\n`;
        currentWallets.forEach((w) => {
          const slug = getWalletSlug(w);
          const isDef = w.is_default ? ' ⭐ (Default)' : '';
          const icon = w.type === 'bank' ? '🏦' : w.type === 'ewallet' ? '📱' : '💵';
          reply += `${icon} *${w.name}*: Rp${w.balance.toLocaleString('id-ID')}${isDef}\n`;
          reply += `👉 Top Up via ini: \`/topup_${slug} ${amountStr}\`\n\n`;
        });
        reply += `💡 _Klik perintah di atas atau pilih langsung tombol rekening di bawah._`;

        return asReply(reply, action, replyMarkup);
      }

      // Wallet is matched! Execute top up into matchedWallet
      const targetWallet = matchedWallet;
      const amount = parsedAmount || 100000;

      const incomeCat =
        categories.find((c) => c.name.toLowerCase().includes('pemasukan') || c.type === 'income') || categories[0];

      demoStore.addTransaction({
        wallet_id: targetWallet.id,
        category_id: incomeCat.id,
        type: 'income',
        amount,
        description: `Top Up Saldo ${targetWallet.name}`,
        source: 'telegram_text',
        idempotencyKey: `${cacheKey}_topup`,
      });

      const { day, dateStr, timeStr } = getWIBDateString();
      const updatedW = demoStore.getWallets().find((w) => w.id === targetWallet.id)!;
      const icon = updatedW.type === 'bank' ? '🏦' : updatedW.type === 'ewallet' ? '📱' : '💵';

      let reply = `📅 ${day}, ${dateStr} — ${timeStr}\n`;
      reply += `💰 Top Up Saldo Berhasil!\n`;
      reply += `├ Nominal   : Rp${amount.toLocaleString('id-ID')}\n`;
      reply += `├ Rekening  : ${icon} ${updatedW.name}\n`;
      reply += `├ Kategori  : 💼 Pemasukan\n`;
      reply += `├ Catatan   : Top Up Saldo ${updatedW.name}\n`;
      reply += `└ Saldo Baru: Rp${updatedW.balance.toLocaleString('id-ID')}\n\n`;
      reply += `💪 Semangat terus! Saldo rekening ${updatedW.name} kamu sudah berhasil diperbarui.`;

      return asReply(reply);
    }

    // /makan command: /makan, /makan 25rb, /makan baso 15rb, /makan bca 25rb
    if (cmd.startsWith('/makan')) {
      const currentWallets = demoStore.getWallets();
      const param = rawText.replace(/^\/makan(?:@\w+)?/i, '').trim();
      const { wallet: matchedWallet, cleanText } = matchWalletFromText(rawText, currentWallets);
      const parsedAmount = parseIndonesianAmount(cleanText) || parseIndonesianAmount(param);
      const amount = parsedAmount || 25000;
      const amountStr = amount >= 1000 ? `${amount / 1000}rb` : `${amount}`;

      if (!matchedWallet) {
        // User has NOT chosen a wallet -> show interactive wallet selection before paying!
        let cleanNote = (cleanText || param)
          .replace(/(?:rp\.?\s*)?[\d]+(?:[.,]\d+)?\s*(?:jt|juta|rb|ribu|k)\b/gi, '')
          .replace(/(?:rp\.?\s*)?\b\d{1,3}(?:\.\d{3})+\b/gi, '')
          .replace(/(?:rp\.?\s*)?\b\d{4,}\b/gi, '')
          .replace(/\bmakan\b/gi, '')
          .replace(/\s{2,}/g, ' ')
          .trim();
        const noteDesc = cleanNote ? `makan ${cleanNote}` : 'makan';

        const options: TelegramSimActionOption[] = currentWallets.map((w) => {
          const slug = getWalletSlug(w);
          return {
            walletId: w.id,
            name: w.name,
            type: w.type,
            balance: w.balance,
            icon: w.type === 'bank' ? 'landmark' : w.type === 'ewallet' ? 'smartphone' : 'banknote',
            color: w.color,
            command: `/bayar_${slug} ${amountStr} ${noteDesc}`.trim(),
          };
        });

        const replyMarkup = {
          inline_keyboard: currentWallets.map((w) => {
            const slug = getWalletSlug(w);
            const icon = w.type === 'bank' ? '🏦' : w.type === 'ewallet' ? '📱' : '💵';
            return [
              {
                text: `${icon} ${w.name} (Rp${w.balance.toLocaleString('id-ID')})`,
                callback_data: `/bayar_${slug} ${amountStr} ${noteDesc}`.trim(),
              },
            ];
          }),
        };

        const action: TelegramSimAction = {
          type: 'select_wallet_pay',
          amount,
          description: noteDesc,
          options,
        };

        let reply = `💳 *Pilih Rekening / Dompet Pembayaran Makan*\n`;
        reply += `├ Nominal   : *Rp${amount.toLocaleString('id-ID')}* (${noteDesc})\n`;
        reply += `└ Silakan pilih rekening atau dompet untuk membayar makan:\n\n`;
        currentWallets.forEach((w) => {
          const slug = getWalletSlug(w);
          const isDef = w.is_default ? ' ⭐ (Default)' : '';
          const icon = w.type === 'bank' ? '🏦' : w.type === 'ewallet' ? '📱' : '💵';
          reply += `${icon} *${w.name}*: Rp${w.balance.toLocaleString('id-ID')}${isDef}\n`;
          reply += `👉 Bayar via ${w.name}: \`/bayar_${slug} ${amountStr} ${noteDesc}\`\n\n`;
        });
        reply += `💡 _Klik perintah di atas atau pilih langsung tombol rekening di bawah._`;

        return asReply(reply, action, replyMarkup);
      }

      // Wallet is matched! Execute payment from matchedWallet
      const targetWallet = matchedWallet;
      const cat = categories.find((c) => c.name.toLowerCase().includes('makan')) || categories[0];
      const desc = cleanText && cleanText.length >= 2 ? cleanText : 'Makan';

      demoStore.addTransaction({
        wallet_id: targetWallet.id,
        category_id: cat.id,
        type: 'expense',
        amount,
        description: desc,
        source: 'telegram_text',
        idempotencyKey: `${cacheKey}_makan`,
      });

      const { day, dateStr, timeStr } = getWIBDateString();
      const updatedWallet = demoStore.getWallets().find((w) => w.id === targetWallet.id)!;
      const freshBudgets = demoStore.getBudgets();
      const budget = freshBudgets.find((b) => b.category_id === cat.id);

      let reply = `📅 ${day}, ${dateStr} — ${timeStr}\n`;
      reply += `💸 Pengeluaran Makan Tercatat!\n`;
      reply += `├ Nominal    : Rp${amount.toLocaleString('id-ID')}\n`;
      reply += `├ Rekening   : 💳 ${updatedWallet.name}\n`;
      reply += `├ Kategori   : ${cat.icon || '🍜'} ${cat.name}\n`;
      reply += `├ Catatan    : ${desc}\n`;
      reply += `└ Saldo sisa : Rp${updatedWallet.balance.toLocaleString('id-ID')}`;

      if (budget) {
        const spent = budget.current_spent || 0;
        const percent = Math.round((spent / budget.monthly_limit) * 100);
        const remaining = Math.max(0, budget.monthly_limit - spent);
        reply += `\n\n📊 Budget ${cat.name} bulan ini:\n`;
        reply += `${renderProgressBar(percent)} ${percent}% — sisa Rp${remaining.toLocaleString('id-ID')}`;
      }

      return asReply(reply);
    }

    // /bensin command: /bensin, /bensin 20rb, /bensin pertalite 30rb, /bensin bca 50rb
    if (cmd.startsWith('/bensin')) {
      const currentWallets = demoStore.getWallets();
      const param = rawText.replace(/^\/bensin(?:@\w+)?/i, '').trim();
      const { wallet: matchedWallet, cleanText } = matchWalletFromText(rawText, currentWallets);
      const parsedAmount = parseIndonesianAmount(cleanText) || parseIndonesianAmount(param);
      const amount = parsedAmount || 20000;
      const amountStr = amount >= 1000 ? `${amount / 1000}rb` : `${amount}`;

      if (!matchedWallet) {
        // Show interactive wallet selection for /bensin
        let cleanNote = (cleanText || param)
          .replace(/(?:rp\.?\s*)?[\d]+(?:[.,]\d+)?\s*(?:jt|juta|rb|ribu|k)\b/gi, '')
          .replace(/(?:rp\.?\s*)?\b\d{1,3}(?:\.\d{3})+\b/gi, '')
          .replace(/(?:rp\.?\s*)?\b\d{4,}\b/gi, '')
          .replace(/\bbensin\b/gi, '')
          .replace(/\s{2,}/g, ' ')
          .trim();
        const noteDesc = cleanNote ? `bensin ${cleanNote}` : 'bensin';

        const options: TelegramSimActionOption[] = currentWallets.map((w) => {
          const slug = getWalletSlug(w);
          return {
            walletId: w.id,
            name: w.name,
            type: w.type,
            balance: w.balance,
            icon: w.type === 'bank' ? 'landmark' : w.type === 'ewallet' ? 'smartphone' : 'banknote',
            color: w.color,
            command: `/bayar_${slug} ${amountStr} ${noteDesc}`.trim(),
          };
        });

        const replyMarkup = {
          inline_keyboard: currentWallets.map((w) => {
            const slug = getWalletSlug(w);
            const icon = w.type === 'bank' ? '🏦' : w.type === 'ewallet' ? '📱' : '💵';
            return [
              {
                text: `${icon} ${w.name} (Rp${w.balance.toLocaleString('id-ID')})`,
                callback_data: `/bayar_${slug} ${amountStr} ${noteDesc}`.trim(),
              },
            ];
          }),
        };

        const action: TelegramSimAction = {
          type: 'select_wallet_pay',
          amount,
          description: noteDesc,
          options,
        };

        let reply = `💳 *Pilih Rekening / Dompet Pembayaran Bensin*\n`;
        reply += `├ Nominal   : *Rp${amount.toLocaleString('id-ID')}* (${noteDesc})\n`;
        reply += `└ Silakan pilih rekening atau dompet untuk membayar bensin:\n\n`;
        currentWallets.forEach((w) => {
          const slug = getWalletSlug(w);
          const isDef = w.is_default ? ' ⭐ (Default)' : '';
          const icon = w.type === 'bank' ? '🏦' : w.type === 'ewallet' ? '📱' : '💵';
          reply += `${icon} *${w.name}*: Rp${w.balance.toLocaleString('id-ID')}${isDef}\n`;
          reply += `👉 Bayar via ${w.name}: \`/bayar_${slug} ${amountStr} ${noteDesc}\`\n\n`;
        });
        reply += `💡 _Klik perintah di atas atau pilih langsung tombol rekening di bawah._`;

        return asReply(reply, action, replyMarkup);
      }

      // Wallet is matched! Execute payment from matchedWallet
      const targetWallet = matchedWallet;
      const cat = categories.find((c) => c.name.toLowerCase().includes('transport') || c.name.toLowerCase().includes('bensin')) || categories[0];
      const desc = cleanText && cleanText.length >= 2 ? cleanText : 'Bensin';

      demoStore.addTransaction({
        wallet_id: targetWallet.id,
        category_id: cat.id,
        type: 'expense',
        amount,
        description: desc,
        source: 'telegram_text',
        idempotencyKey: `${cacheKey}_bensin`,
      });

      const { day, dateStr, timeStr } = getWIBDateString();
      const updatedWallet = demoStore.getWallets().find((w) => w.id === targetWallet.id)!;
      const freshBudgets = demoStore.getBudgets();
      const budget = freshBudgets.find((b) => b.category_id === cat.id);

      let reply = `📅 ${day}, ${dateStr} — ${timeStr}\n`;
      reply += `⛽ Pengeluaran Bensin Tercatat!\n`;
      reply += `├ Nominal    : Rp${amount.toLocaleString('id-ID')}\n`;
      reply += `├ Rekening   : 💳 ${updatedWallet.name}\n`;
      reply += `├ Kategori   : ${cat.icon || '🚗'} ${cat.name}\n`;
      reply += `├ Catatan    : ${desc}\n`;
      reply += `└ Saldo sisa : Rp${updatedWallet.balance.toLocaleString('id-ID')}`;

      if (budget) {
        const spent = budget.current_spent || 0;
        const percent = Math.round((spent / budget.monthly_limit) * 100);
        const remaining = Math.max(0, budget.monthly_limit - spent);
        reply += `\n\n📊 Budget ${cat.name} bulan ini:\n`;
        reply += `${renderProgressBar(percent)} ${percent}% — sisa Rp${remaining.toLocaleString('id-ID')}`;
      }

      return asReply(reply);
    }

    if (cmd === '/saldo') {
      const currentWallets = demoStore.getWallets();
      const totalBalance = currentWallets.reduce((acc, w) => acc + w.balance, 0);
      let reply = `👛 *Saldo Dompet TataDana*\n\n`;
      currentWallets.forEach((w) => {
        const star = w.is_default ? ' ⭐ (Default)' : '';
        reply += `├ ${w.name}: Rp${w.balance.toLocaleString('id-ID')}${star}\n`;
      });
      reply += `\n💰 *Total Aset:* Rp${totalBalance.toLocaleString('id-ID')}`;
      return asReply(reply);
    }

    if (cmd === '/hari_ini' || cmd === '/hari ini' || cmd === '/hariini') {
      const today = new Date().toISOString().slice(0, 10);
      const currentTxs = demoStore.getTransactions();
      const todayTxs = currentTxs.filter((t) => t.transaction_date.slice(0, 10) === today);
      const totalExpense = todayTxs.filter((t) => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
      const totalIncome = todayTxs.filter((t) => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);

      let reply = `📅 *Rekap Transaksi Hari Ini*\n\n`;
      if (todayTxs.length === 0) {
        reply += `Belum ada transaksi yang dicatat hari ini. Yuk mulai catat pengeluaranmu!`;
      } else {
        todayTxs.forEach((t) => {
          const sign = t.type === 'expense' ? '💸' : '💰';
          reply += `${sign} ${t.description} — Rp${t.amount.toLocaleString('id-ID')}\n`;
        });
        reply += `\n🔴 Total Keluar: Rp${totalExpense.toLocaleString('id-ID')}`;
        reply += `\n🟢 Total Masuk: Rp${totalIncome.toLocaleString('id-ID')}`;
      }
      return asReply(reply);
    }

    if (cmd === '/minggu_ini' || cmd === '/minggu ini' || cmd === '/mingguini') {
      const now = Date.now();
      const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
      const currentTxs = demoStore.getTransactions();
      const weekTxs = currentTxs.filter((t) => new Date(t.transaction_date).getTime() >= sevenDaysAgo);
      const expenseTxs = weekTxs.filter((t) => t.type === 'expense');
      const totalExpense = expenseTxs.reduce((acc, t) => acc + t.amount, 0);

      const catMap: Record<string, { icon: string; name: string; amount: number }> = {};
      expenseTxs.forEach((t) => {
        const cName = t.category?.name || 'Lainnya';
        const cIcon = t.category?.icon || '📁';
        if (!catMap[cName]) catMap[cName] = { icon: cIcon, name: cName, amount: 0 };
        catMap[cName].amount += t.amount;
      });

      const topCat = Object.values(catMap).sort((a, b) => b.amount - a.amount)[0];

      let reply = `📊 *Rekap 7 Hari Terakhir*\n\n`;
      reply += `💸 Total Pengeluaran: Rp${totalExpense.toLocaleString('id-ID')}\n`;
      if (topCat) {
        reply += `🎯 Transaksi terbanyak di kategori: ${topCat.icon} ${topCat.name} (Rp${topCat.amount.toLocaleString('id-ID')})\n\n`;
      } else {
        reply += `🎯 Belum ada transaksi pengeluaran dalam 7 hari terakhir.\n\n`;
      }
      reply += `Untuk rincian selengkapnya, kunjungi menu Laporan di Dashboard TataDana.`;
      return asReply(reply);
    }

    if (cmd === '/bulan_ini' || cmd === '/bulan ini' || cmd === '/bulanini') {
      const currentTxs = demoStore.getTransactions();
      const monthPrefix = new Date().toISOString().slice(0, 7);
      const monthTxs = currentTxs.filter((t) => t.transaction_date.startsWith(monthPrefix));

      const totalExpense = monthTxs
        .filter((t) => t.type === 'expense')
        .reduce((acc, t) => acc + t.amount, 0);
      const totalIncome = monthTxs
        .filter((t) => t.type === 'income')
        .reduce((acc, t) => acc + t.amount, 0);

      const catMap: Record<string, { icon: string; name: string; amount: number }> = {};
      monthTxs
        .filter((t) => t.type === 'expense')
        .forEach((t) => {
          const cName = t.category?.name || 'Lainnya';
          const cIcon = t.category?.icon || '📁';
          if (!catMap[cName]) catMap[cName] = { icon: cIcon, name: cName, amount: 0 };
          catMap[cName].amount += t.amount;
        });

      const sortedCats = Object.values(catMap).sort((a, b) => b.amount - a.amount);
      const { dateStr } = getWIBDateString();
      const monthYearStr = dateStr.split(' ').slice(1).join(' ');

      let reply = `📊 *Rekap Bulan Ini (${monthYearStr})*\n\n`;
      reply += `🟢 Pemasukan: Rp${totalIncome.toLocaleString('id-ID')}\n`;
      reply += `🔴 Pengeluaran: Rp${totalExpense.toLocaleString('id-ID')}\n`;
      reply += `⚖️ Net Cashflow: Rp${(totalIncome - totalExpense).toLocaleString('id-ID')}\n\n`;
      reply += `*Breakdown Kategori:*\n`;
      if (sortedCats.length === 0) {
        reply += `• Belum ada transaksi pengeluaran bulan ini.\n`;
      } else {
        sortedCats.forEach((c) => {
          reply += `• ${c.icon} ${c.name}: Rp${c.amount.toLocaleString('id-ID')}\n`;
        });
      }
      return asReply(reply);
    }

    if (cmd === '/budget') {
      const freshBudgets = demoStore.getBudgets();
      let reply = `🎯 *Status Budget Bulan Ini*\n\n`;
      freshBudgets.forEach((b) => {
        const spent = b.current_spent || 0;
        const pct = Math.round((spent / b.monthly_limit) * 100);
        const bar = renderProgressBar(pct);
        const rem = Math.max(0, b.monthly_limit - spent);
        reply += `${b.category?.icon || '📁'} *${b.category?.name || 'Kategori'}*\n`;
        reply += `${bar} ${pct}% (Sisa: Rp${rem.toLocaleString('id-ID')})\n\n`;
      });
      return asReply(reply);
    }

    if (cmd === '/sheet') {
      return asReply(`📑 *Tautan Laporan Keuangan TataDana*\n\nDownload laporan lengkap kamu dalam format PDF atau Excel (.xlsx) langsung lewat tautan aman berikut:\n\n🔗 ${process.env.NEXT_PUBLIC_APP_URL || 'https://tatadana.id'}/dashboard/reports\n\nTautan ini diperbarui secara real-time setiap kali kamu mengirim transaksi!`);
    }

    if (cmd === '/upgrade') {
      return asReply(`⭐ *TataDana Pro — Lifetime Access*\n\nNikmati kemudahan tak terbatas:\n✅ Input transaksi tak terbatas\n✅ Scan struk belanja foto otomatis\n✅ AI Financial Advisor & Peringatan Budget\n✅ Export PDF & Excel tanpa batas\n\nHanya Rp99.000 Sekali Bayar!\nBuka ${process.env.NEXT_PUBLIC_APP_URL || 'https://tatadana.id'}/dashboard untuk aktivasi sekarang.`);
    }
  }

  // 3. Photo Receipt Processing
  if (input.photoUrl) {
    try {
      const scanResult = await parseReceiptPhoto(input.photoUrl, profile.plan);
      const cat = categories.find((c) => c.name.toLowerCase().includes('belanja')) || categories[0];

      const { transaction } = demoStore.addTransaction({
        wallet_id: defaultWallet.id,
        category_id: cat.id,
        type: 'expense',
        amount: scanResult.total,
        description: `Struk ${scanResult.merchant}`,
        source: 'telegram_photo',
        has_receipt: true,
        receipt_url: input.photoUrl,
        receipt_items: scanResult.items,
        idempotencyKey: `${cacheKey}_photo`,
      });

      const { day, dateStr, timeStr } = getWIBDateString();
      const updatedWallet = demoStore.getWallets().find((w) => w.id === defaultWallet.id)!;
      const freshBudgets = demoStore.getBudgets();
      const budget = freshBudgets.find((b) => b.category_id === cat.id);

      let reply = `📅 ${day}, ${dateStr} — ${timeStr}\n`;
      reply += `📸 Pengeluaran Struk Tercatat!\n`;
      reply += `├ Merchant : 🏪 ${scanResult.merchant}\n`;
      reply += `├ Total    : Rp${scanResult.total.toLocaleString('id-ID')}\n`;
      reply += `├ Dompet   : 👛 ${updatedWallet.name}\n`;
      reply += `├ Rincian  : ${scanResult.items.length} item tersimpan\n`;
      reply += `└ Saldo    : Rp${updatedWallet.balance.toLocaleString('id-ID')}\n\n`;

      reply += `*Item Terdeteksi:*\n`;
      scanResult.items.forEach((item) => {
        reply += `• ${item.name} (${item.qty}x) — Rp${item.price.toLocaleString('id-ID')}\n`;
      });

      if (budget) {
        const spent = budget.current_spent || 0;
        const percent = Math.round((spent / budget.monthly_limit) * 100);
        const remaining = Math.max(0, budget.monthly_limit - spent);

        reply += `\n\n📊 Budget ${cat.name} bulan ini:\n`;
        reply += `${renderProgressBar(percent)} ${percent}% — sisa Rp${remaining.toLocaleString('id-ID')}\n`;
        if (percent >= 100) {
          reply += `🚨 Perhatian! Kamu sudah melebihi batas budget bulan ini!`;
        } else if (percent >= 80) {
          reply += `⚠️ Hati-hati, budget kategori ini sudah menipis!`;
        }

        // Pro AI Financial Advisor automatic trigger
        if (profile.plan === 'pro' && percent >= 80) {
          reply += `\n\n` + generateFinancialAdvice(profile, budget, percent, transaction);
        }
      }

      return asReply(reply);
    } catch (err: any) {
      return asReply(err.message || 'Gagal memproses foto struk. Pastikan foto jelas dan terbaca.');
    }
  }

  // 4. Voice Note Processing
  if (input.voiceUrl) {
    try {
      const voiceResult = await processVoiceNote(input.voiceUrl);
      const parsed = voiceResult.parsed;
      const matchedCat = categories.find((c) => c.name.toLowerCase() === parsed.categoryName.toLowerCase()) || categories[0];

      const { transaction } = demoStore.addTransaction({
        wallet_id: defaultWallet.id,
        category_id: matchedCat.id,
        type: parsed.type,
        amount: parsed.amount,
        description: parsed.description,
        source: 'telegram_voice',
        idempotencyKey: `${cacheKey}_voice`,
      });

      const { day, dateStr, timeStr } = getWIBDateString();
      const updatedWallet = demoStore.getWallets().find((w) => w.id === defaultWallet.id)!;
      const freshBudgets = demoStore.getBudgets();
      const budget = freshBudgets.find((b) => b.category_id === matchedCat.id);

      let reply = `🎙️ Transkrip: "${voiceResult.transcript}"\n\n`;
      reply += `📅 ${day}, ${dateStr} — ${timeStr}\n`;
      if (parsed.type === 'expense') {
        reply += `💸 Pengeluaran tercatat!\n`;
        reply += `├ Nominal : Rp${parsed.amount.toLocaleString('id-ID')}\n`;
        reply += `├ Kategori : ${matchedCat.icon} ${matchedCat.name}\n`;
        reply += `├ Dompet : 👛 ${updatedWallet.name}\n`;
        reply += `├ Catatan : ${parsed.description}\n`;
        reply += `└ Saldo : Rp${updatedWallet.balance.toLocaleString('id-ID')}`;

        if (budget) {
          const spent = budget.current_spent || 0;
          const percent = Math.round((spent / budget.monthly_limit) * 100);
          const remaining = Math.max(0, budget.monthly_limit - spent);

          reply += `\n\n📊 Budget ${matchedCat.name} bulan ini:\n`;
          reply += `${renderProgressBar(percent)} ${percent}% — sisa Rp${remaining.toLocaleString('id-ID')}\n`;
          if (percent >= 100) {
            reply += `🚨 Peringatan: Budget telah mencapai batas maksimal!`;
          } else if (percent >= 80) {
            reply += `⚠️ Pengeluaran sudah mendekati batas aman budget bulananmu!`;
          }

          // Pro AI Financial Advisor automatic trigger
          if (profile.plan === 'pro' && percent >= 80) {
            reply += `\n\n` + generateFinancialAdvice(profile, budget, percent, transaction);
          }
        }
      } else {
        reply += `💰 Pemasukan tercatat!\n`;
        reply += `├ Nominal : Rp${parsed.amount.toLocaleString('id-ID')}\n`;
        reply += `├ Kategori : 💼 Pemasukan\n`;
        reply += `├ Dompet : 👛 ${updatedWallet.name}\n`;
        reply += `└ Saldo baru : Rp${updatedWallet.balance.toLocaleString('id-ID')}\n\n`;
        reply += `💪 Semangat terus! Jangan lupa sisihkan untuk tabungan ya.`;
      }

      return asReply(reply);
    } catch (err: any) {
      return asReply(err.message || 'Gagal mengenali suara voice note.');
    }
  }

  // 5. Natural Text Processing
  const lowerRaw = rawText.toLowerCase().trim();

  // 5a. Natural language top up: "top up 50rb", "topup dana 100rb", "tambah saldo 500rb", "isi saldo"
  if (
    lowerRaw.startsWith('top up') ||
    lowerRaw.startsWith('topup') ||
    lowerRaw.startsWith('tambah saldo') ||
    lowerRaw.startsWith('isi saldo')
  ) {
    const currentWallets = demoStore.getWallets();
    const { wallet: matchedWallet, cleanText } = matchWalletFromText(rawText, currentWallets);
    const parsedAmount = parseIndonesianAmount(cleanText) || parseIndonesianAmount(rawText);

    if (!matchedWallet) {
      // Show wallet picker before top up
      const amountStr = parsedAmount ? (parsedAmount >= 1000 ? `${parsedAmount / 1000}rb` : `${parsedAmount}`) : '100rb';
      const options: TelegramSimActionOption[] = currentWallets.map((w) => {
        const slug = getWalletSlug(w);
        return {
          walletId: w.id,
          name: w.name,
          type: w.type,
          balance: w.balance,
          icon: w.type === 'bank' ? 'landmark' : w.type === 'ewallet' ? 'smartphone' : 'banknote',
          color: w.color,
          command: `/topup_${slug} ${amountStr}`.trim(),
        };
      });

      const replyMarkup = {
        inline_keyboard: currentWallets.map((w) => {
          const slug = getWalletSlug(w);
          const icon = w.type === 'bank' ? '🏦' : w.type === 'ewallet' ? '📱' : '💵';
          return [
            {
              text: `➕ ${icon} ${w.name} (Rp${w.balance.toLocaleString('id-ID')})`,
              callback_data: `/topup_${slug} ${amountStr}`.trim(),
            },
          ];
        }),
      };

      const action: TelegramSimAction = {
        type: 'select_wallet_topup',
        amount: parsedAmount || undefined,
        options,
      };

      let reply = `💰 *Pilih Rekening / Dompet Tujuan Top Up*\n`;
      if (parsedAmount) {
        reply += `├ Nominal : *Rp${parsedAmount.toLocaleString('id-ID')}*\n`;
      }
      reply += `└ Siap ditambahkan ke saldo dompet pilihanmu\n\n`;
      reply += `Silakan pilih rekening atau dompet yang ingin kamu isi saldonya:\n\n`;
      currentWallets.forEach((w) => {
        const slug = getWalletSlug(w);
        const isDef = w.is_default ? ' ⭐ (Default)' : '';
        const icon = w.type === 'bank' ? '🏦' : w.type === 'ewallet' ? '📱' : '💵';
        reply += `${icon} *${w.name}*: Rp${w.balance.toLocaleString('id-ID')}${isDef}\n`;
        reply += `👉 Top Up via ini: \`/topup_${slug} ${amountStr}\`\n\n`;
      });
      reply += `💡 _Klik perintah di atas atau pilih langsung tombol rekening di bawah._`;

      return asReply(reply, action, replyMarkup);
    }

    // Top up matched wallet
    const targetWallet = matchedWallet;
    const amount = parsedAmount || 100000;
    const incomeCat =
      categories.find((c) => c.name.toLowerCase().includes('pemasukan') || c.type === 'income') || categories[0];

    demoStore.addTransaction({
      wallet_id: targetWallet.id,
      category_id: incomeCat.id,
      type: 'income',
      amount,
      description: `Top Up Saldo ${targetWallet.name}`,
      source: 'telegram_text',
      idempotencyKey: `${cacheKey}_natural_topup`,
    });

    const { day, dateStr, timeStr } = getWIBDateString();
    const updatedW = demoStore.getWallets().find((w) => w.id === targetWallet.id)!;
    const icon = updatedW.type === 'bank' ? '🏦' : updatedW.type === 'ewallet' ? '📱' : '💵';

    let reply = `📅 ${day}, ${dateStr} — ${timeStr}\n`;
    reply += `💰 Top Up Saldo Berhasil!\n`;
    reply += `├ Nominal   : Rp${amount.toLocaleString('id-ID')}\n`;
    reply += `├ Rekening  : ${icon} ${updatedW.name}\n`;
    reply += `├ Kategori  : 💼 Pemasukan\n`;
    reply += `├ Catatan   : Top Up Saldo ${updatedW.name}\n`;
    reply += `└ Saldo Baru: Rp${updatedW.balance.toLocaleString('id-ID')}\n\n`;
    reply += `💪 Semangat terus! Saldo rekening ${updatedW.name} kamu sudah berhasil diperbarui.`;
    return asReply(reply);
  }

  // 5b. Natural language payment & expenses: "bayar kopi 25rb", "beli kopi 25rb", "makan siang 30rb", "bensin 20rb", "isi bensin 50rb"
  if (
    lowerRaw.startsWith('bayar ') ||
    lowerRaw.startsWith('beli ') ||
    lowerRaw.startsWith('makan ') ||
    lowerRaw.startsWith('bensin ') ||
    lowerRaw.startsWith('isi bensin ')
  ) {
    const currentWallets = demoStore.getWallets();
    const { wallet: matchedWallet, cleanText } = matchWalletFromText(rawText, currentWallets);
    const parsedAmount = parseIndonesianAmount(cleanText) || parseIndonesianAmount(rawText);

    if (!matchedWallet) {
      // Show wallet picker before paying
      let cleanNote = (cleanText || rawText)
        .replace(/(?:rp\.?\s*)?[\d]+(?:[.,]\d+)?\s*(?:jt|juta|rb|ribu|k)\b/gi, '')
        .replace(/(?:rp\.?\s*)?\b\d{1,3}(?:\.\d{3})+\b/gi, '')
        .replace(/(?:rp\.?\s*)?\b\d{4,}\b/gi, '')
        .replace(/\b(?:bayar|beli|makan|bensin|isi\s+bensin)\b/gi, '')
        .replace(/\s{2,}/g, ' ')
        .trim();

      const amountStr = parsedAmount ? (parsedAmount >= 1000 ? `${parsedAmount / 1000}rb` : `${parsedAmount}`) : '25rb';
      const noteStr = cleanNote ? ` ${cleanNote}` : '';

      const options: TelegramSimActionOption[] = currentWallets.map((w) => {
        const slug = getWalletSlug(w);
        return {
          walletId: w.id,
          name: w.name,
          type: w.type,
          balance: w.balance,
          icon: w.type === 'bank' ? 'landmark' : w.type === 'ewallet' ? 'smartphone' : 'banknote',
          color: w.color,
          command: `/bayar_${slug} ${amountStr}${noteStr}`.trim(),
        };
      });

      const replyMarkup = {
        inline_keyboard: currentWallets.map((w) => {
          const slug = getWalletSlug(w);
          const icon = w.type === 'bank' ? '🏦' : w.type === 'ewallet' ? '📱' : '💵';
          return [
            {
              text: `${icon} ${w.name} (Rp${w.balance.toLocaleString('id-ID')})`,
              callback_data: `/bayar_${slug} ${amountStr}${noteStr}`.trim(),
            },
          ];
        }),
      };

      const action: TelegramSimAction = {
        type: 'select_wallet_pay',
        amount: parsedAmount || undefined,
        description: cleanNote || undefined,
        options,
      };

      let reply = `💳 *Pilih Rekening / Dompet Pembayaran*\n`;
      if (parsedAmount) {
        reply += `├ Nominal   : *Rp${parsedAmount.toLocaleString('id-ID')}*${cleanNote ? ` (${cleanNote})` : ''}\n`;
      }
      reply += `└ Silakan pilih rekening sumber dana pembayaran:\n\n`;
      currentWallets.forEach((w) => {
        const slug = getWalletSlug(w);
        const isDef = w.is_default ? ' ⭐ (Default)' : '';
        const icon = w.type === 'bank' ? '🏦' : w.type === 'ewallet' ? '📱' : '💵';
        reply += `${icon} *${w.name}*: Rp${w.balance.toLocaleString('id-ID')}${isDef}\n`;
        reply += `👉 Bayar via ini: \`/bayar_${slug} ${amountStr}${noteStr}\`\n\n`;
      });
      reply += `💡 _Klik perintah di atas atau pilih langsung tombol rekening di bawah._`;

      return asReply(reply, action, replyMarkup);
    }
  }

  // 5c. General AI Text / Natural language processing (e.g. "beli kopi 25rb", "gajian 5jt", etc.)
  try {
    const parsed = await parseTransactionWithAI(rawText);
    const matchedCat =
      categories.find((c) => c.name.toLowerCase() === parsed.categoryName.toLowerCase()) ||
      categories.find((c) => c.name.toLowerCase().includes(parsed.categoryName.toLowerCase())) ||
      categories.find((c) => parsed.categoryName.toLowerCase().includes(c.name.toLowerCase())) ||
      (parsed.type === 'income'
        ? categories.find((c) => c.type === 'income')
        : categories.find((c) => c.type === 'expense')) ||
      categories[0];

    // Check if user specified a specific wallet in text
    const currentWallets = demoStore.getWallets();
    let targetWallet = defaultWallet;
    const { wallet: matchedNaturalWallet } = matchWalletFromText(rawText, currentWallets);
    if (matchedNaturalWallet) {
      targetWallet = matchedNaturalWallet;
    } else {
      for (const w of currentWallets) {
        const lowerWName = w.name.toLowerCase();
        const keywords = [
          lowerWName,
          ...lowerWName.split(/\s+/).filter((p) => p.length >= 2 && !['prioritas', 'saldo', 'dompet', 'tabungan'].includes(p)),
        ];
        if (keywords.some((kw) => rawText.toLowerCase().includes(kw))) {
          targetWallet = w;
          break;
        }
      }
    }

    const { transaction } = demoStore.addTransaction({
      wallet_id: targetWallet.id,
      category_id: matchedCat.id,
      type: parsed.type,
      amount: parsed.amount,
      description: parsed.description,
      source: 'telegram_text',
      idempotencyKey: `${cacheKey}_ai_text`,
    });

    const { day, dateStr, timeStr } = getWIBDateString();
    const updatedWallet = demoStore.getWallets().find((w) => w.id === targetWallet.id)!;
    const freshBudgets = demoStore.getBudgets();
    const budget = freshBudgets.find((b) => b.category_id === matchedCat.id);

    if (parsed.type === 'expense') {
      let reply = `📅 ${day}, ${dateStr} — ${timeStr}\n`;
      reply += `💸 Pengeluaran tercatat!\n`;
      reply += `├ Nominal : Rp${parsed.amount.toLocaleString('id-ID')}\n`;
      reply += `├ Kategori : ${matchedCat.icon} ${matchedCat.name}\n`;
      reply += `├ Dompet : 👛 ${updatedWallet.name}\n`;
      reply += `├ Catatan : ${parsed.description}\n`;
      reply += `└ Saldo : Rp${updatedWallet.balance.toLocaleString('id-ID')}`;

      // Check fresh budget
      if (budget) {
        const spent = budget.current_spent || 0;
        const percent = Math.round((spent / budget.monthly_limit) * 100);
        const remaining = Math.max(0, budget.monthly_limit - spent);

        reply += `\n\n📊 Budget ${matchedCat.name} bulan ini:\n`;
        reply += `${renderProgressBar(percent)} ${percent}% — sisa Rp${remaining.toLocaleString('id-ID')}`;

        if (percent >= 100) {
          reply += `\n🚨 Limit terlampaui! Kurangi jajan di kategori ini ya.`;
        } else if (percent >= 80) {
          reply += `\n⚠️ Sudah mencapai 80%! Atur pengeluaranmu sampai akhir bulan.`;
        }
      }

      // Pro AI Financial Advisor automatic trigger
      if (profile.plan === 'pro' && budget) {
        const spent = budget.current_spent || 0;
        const percent = Math.round((spent / budget.monthly_limit) * 100);
        if (percent >= 80) {
          reply += `\n\n` + generateFinancialAdvice(profile, budget, percent, transaction);
        }
      }

      return asReply(reply);
    } else {
      // Income format
      let reply = `📅 ${day}, ${dateStr} — ${timeStr}\n`;
      reply += `💰 Pemasukan tercatat!\n`;
      reply += `├ Nominal : Rp${parsed.amount.toLocaleString('id-ID')}\n`;
      reply += `├ Kategori : 💼 Pemasukan\n`;
      reply += `├ Dompet : 👛 ${updatedWallet.name}\n`;
      reply += `└ Saldo baru : Rp${updatedWallet.balance.toLocaleString('id-ID')}\n\n`;
      reply += `💪 Semangat terus! Jangan lupa sisihkan untuk tabungan ya.`;
      return asReply(reply);
    }
  } catch (err: any) {
    return asReply(err.message || 'Pesan belum dapat diproses. Ketik /bantuan untuk melihat format transaksi.');
  }
}
