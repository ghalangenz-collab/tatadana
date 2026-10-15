/**
 * Telegram Bot API client utilities
 */

export interface TelegramBotInfo {
  id: number;
  is_bot: boolean;
  first_name: string;
  username: string;
  can_join_groups?: boolean;
  can_read_all_group_messages?: boolean;
  supports_inline_queries?: boolean;
}

export async function getMe(botToken: string): Promise<TelegramBotInfo> {
  const token = botToken.trim();
  if (token.startsWith('demo_') || token.includes('demo')) {
    return {
      id: 748192837,
      is_bot: true,
      first_name: 'TataDana Finance Bot',
      username: 'tatadana_bot',
      can_join_groups: true,
      can_read_all_group_messages: false,
      supports_inline_queries: false,
    };
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
  const data = await res.json();
  if (!data.ok) {
    throw new Error(data.description || 'Gagal menghubungi Telegram Bot API.');
  }
  return data.result;
}

export async function setWebhook(botToken: string, webhookUrl: string): Promise<{ ok: boolean; description?: string }> {
  const token = botToken.trim();
  if (token.startsWith('demo_') || token.includes('demo')) {
    return { ok: true, description: 'Webhook was set (Demo Mock)' };
  }

  const url = `https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(webhookUrl)}`;
  const res = await fetch(url, { method: 'POST' });
  const data = await res.json();
  return data;
}

export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from?: {
      id: number;
      is_bot: boolean;
      first_name: string;
      last_name?: string;
      username?: string;
    };
    chat: {
      id: number;
      first_name?: string;
      last_name?: string;
      username?: string;
      type: string;
    };
    date: number;
    text?: string;
    caption?: string;
    photo?: Array<{
      file_id: string;
      file_unique_id: string;
      width: number;
      height: number;
      file_size?: number;
    }>;
    voice?: {
      file_id: string;
      file_unique_id: string;
      duration: number;
      mime_type?: string;
      file_size?: number;
    };
  };
  edited_message?: {
    message_id: number;
    from?: {
      id: number;
      is_bot: boolean;
      first_name: string;
      last_name?: string;
      username?: string;
    };
    chat: {
      id: number;
      first_name?: string;
      last_name?: string;
      username?: string;
      type: string;
    };
    date: number;
    text?: string;
    caption?: string;
  };
  callback_query?: {
    id: string;
    from: {
      id: number;
      first_name: string;
      username?: string;
    };
    message?: {
      message_id: number;
      chat: {
        id: number;
        type: string;
      };
      text?: string;
    };
    data?: string;
  };
}

export async function deleteWebhook(botToken: string, dropPendingUpdates = false): Promise<{ ok: boolean; description?: string }> {
  const token = botToken.trim();
  if (token.startsWith('demo_') || token.includes('demo')) {
    return { ok: true, description: 'Webhook deleted (Demo Mock)' };
  }

  try {
    const url = `https://api.telegram.org/bot${token}/deleteWebhook?drop_pending_updates=${dropPendingUpdates}`;
    const res = await fetch(url, { method: 'POST' });
    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error('deleteWebhook error:', err);
    return { ok: false, description: err.message };
  }
}

export async function getUpdates(
  botToken: string,
  offset?: number,
  timeout = 1
): Promise<TelegramUpdate[]> {
  const token = botToken.trim();
  if (token.startsWith('demo_') || token.includes('demo')) {
    return [];
  }

  const url = new URL(`https://api.telegram.org/bot${token}/getUpdates`);
  if (offset !== undefined) url.searchParams.set('offset', String(offset));
  if (timeout > 0) url.searchParams.set('timeout', String(timeout));

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  });
  const data = await res.json();
  if (!data.ok) {
    // If webhook is active, provide actionable message
    if (data.error_code === 409) {
      throw new Error('Telegram bot masih menggunakan Webhook. Harap matikan/hapus webhook terlebih dahulu sebelum menggunakan Polling getUpdates.');
    }
    throw new Error(data.description || 'Gagal mengambil updates Telegram');
  }
  return data.result || [];
}

export async function sendTelegramMessage(
  botToken: string,
  chatId: number | string,
  text: string,
  replyMarkup?: any
): Promise<boolean> {
  const token = botToken.trim();
  if (token.startsWith('demo_') || token.includes('demo')) {
    console.log(`[Telegram Mock Sent to ${chatId}]: ${text}`);
    return true;
  }

  // Truncate if exceeding Telegram 4096 character limit
  const sanitizedText = text && text.length > 4096 ? text.slice(0, 4000) + '\n\n...(pesan dipotong karena melebihi batas Telegram)' : text;

  try {
    const payload: any = {
      chat_id: chatId,
      text: sanitizedText,
      parse_mode: 'Markdown',
    };
    if (replyMarkup) {
      payload.reply_markup = replyMarkup;
    }

    let res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    let data = await res.json();

    // Fallback without parse_mode if Markdown format had unescaped special characters
    if (!data.ok) {
      const fallbackPayload: any = {
        chat_id: chatId,
        text: sanitizedText,
      };
      if (replyMarkup) {
        fallbackPayload.reply_markup = replyMarkup;
      }

      res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fallbackPayload),
      });
      data = await res.json();
    }

    return !!data.ok;
  } catch (err) {
    console.error('sendTelegramMessage error:', err);
    return false;
  }
}

export async function getTelegramFileUrl(botToken: string, fileId: string): Promise<string | null> {
  const token = botToken.trim();
  if (token.startsWith('demo_') || token.includes('demo')) {
    return `https://images.unsplash.com/photo-1554415707-9e4966668834?w=500&auto=format&fit=crop&q=80`;
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`);
    const data = await res.json();
    if (data.ok && data.result?.file_path) {
      return `https://api.telegram.org/file/bot${token}/${data.result.file_path}`;
    }
  } catch (err) {
    console.error('getTelegramFileUrl error:', err);
  }
  return null;
}

export async function setMyCommands(botToken: string): Promise<{ ok: boolean; description?: string }> {
  const token = botToken.trim();
  if (token.startsWith('demo_') || token.includes('demo')) {
    return { ok: true, description: 'Commands set (Demo Mock)' };
  }

  const commands = [
    { command: 'saldo', description: 'Lihat sisa saldo semua dompet' },
    { command: 'bayar', description: 'Pilih rekening & bayar (cth: /bayar 25rb kopi)' },
    { command: 'topup', description: 'Pilih rekening & isi saldo (cth: /topup 50rb)' },
    { command: 'makan', description: 'Pilih rekening & catat makan (cth: /makan 25rb)' },
    { command: 'bensin', description: 'Pilih rekening & catat bensin (cth: /bensin 20rb)' },
    { command: 'tambah_saldo', description: 'Tambah saldo / pemasukan (cth: /tambah_saldo 500rb)' },
    { command: 'budget', description: 'Lihat sisa budget bulanan per kategori' },
    { command: 'hari_ini', description: 'Rekap transaksi hari ini' },
    { command: 'bulan_ini', description: 'Rekap transaksi bulan ini' },
    { command: 'sheet', description: 'Ringkasan & tautan unduh laporan' },
    { command: 'bantuan', description: 'Panduan lengkap bot TataDana' },
  ];

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/setMyCommands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commands }),
    });
    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error('setMyCommands error:', err);
    return { ok: false, description: err.message };
  }
}

export async function answerCallbackQuery(botToken: string, callbackQueryId: string, text?: string): Promise<boolean> {
  const token = botToken.trim();
  if (token.startsWith('demo_') || token.includes('demo')) {
    return true;
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text,
      }),
    });
    const data = await res.json();
    return !!data.ok;
  } catch (err) {
    console.error('answerCallbackQuery error:', err);
    return false;
  }
}



