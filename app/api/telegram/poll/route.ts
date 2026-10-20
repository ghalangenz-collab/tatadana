import { NextRequest, NextResponse } from 'next/server';
import {
  getMe,
  getUpdates,
  sendTelegramMessage,
  getTelegramFileUrl,
  deleteWebhook,
  setMyCommands,
  answerCallbackQuery,
} from '@/lib/telegram/api';
import { handleTelegramMessage, handleTelegramMessageAdvanced, resolveTelegramUserName } from '@/lib/telegram/bot-service';
import { demoStore } from '@/lib/store/demo-store';

export const dynamic = 'force-dynamic';

// Global server-side polling mutex and deduplication state
let isPollingInProgress = false;
let lastPollStartTime = 0;
let serverLastOffset = 0;
const processedUpdateIds = new Set<number>();
const MAX_PROCESSED_UPDATES = 10000;

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const token = searchParams.get('token') || process.env.TELEGRAM_BOT_TOKEN;

    if (!token) {
      return NextResponse.json({
        ok: false,
        error: 'Token bot belum disetel.',
      }, { status: 400 });
    }

    const start = Date.now();
    const botInfo = await getMe(token);
    const latency = Date.now() - start;

    // Register / menu commands on Telegram Bot API
    await setMyCommands(token).catch(() => {});

    return NextResponse.json({
      ok: true,
      bot: botInfo,
      latencyMs: latency,
      status: 'active',
      isDemo: token.startsWith('demo_') || token.includes('demo'),
    });
  } catch (error: any) {
    return NextResponse.json({
      ok: false,
      error: error.message || 'Gagal memeriksa status bot.',
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawToken = typeof body.botToken === 'string' ? body.botToken.trim() : '';
    const token = rawToken || process.env.TELEGRAM_BOT_TOKEN;

    if (!token) {
      return NextResponse.json({
        ok: false,
        error: 'Token bot Telegram belum disetel. Masukkan token di form atau atur TELEGRAM_BOT_TOKEN di .env.local.',
      }, { status: 400 });
    }

    // Action 1: Delete Webhook (ensures getUpdates long polling is not blocked by 409 conflict)
    if (body.action === 'delete_webhook') {
      const res = await deleteWebhook(token, body.dropPendingUpdates ?? false);
      if (res.ok) {
        return NextResponse.json({
          ok: true,
          message: 'Webhook Telegram berhasil dihapus! Sekarang polling getUpdates dapat langsung menerima pesan di localhost.',
        });
      } else {
        return NextResponse.json({
          ok: false,
          error: res.description || 'Gagal menghapus webhook.',
        }, { status: 400 });
      }
    }

    // Action 2: Send Direct Test Message to a user's Telegram Chat ID
    if (body.action === 'send_test') {
      const chatId = body.chatId || demoStore.getProfile().telegram_chat_id;
      if (!chatId) {
        return NextResponse.json({
          ok: false,
          error: 'Chat ID tujuan belum ditentukan. Buka bot di Telegram Anda lalu ketik /start untuk mendapatkan Chat ID.',
        }, { status: 400 });
      }

      const text = body.text || '👋 *Halo dari TataDana Localhost!*\n\nKoneksi bot Telegram Anda telah aktif dan siap digunakan. Coba ketik:\n• `beli kopi 25rb`\n• `gajian 10jt`\n• `/saldo`\n• atau kirim foto struk belanjaan!';
      const sent = await sendTelegramMessage(token, chatId, text);

      if (sent) {
        return NextResponse.json({
          ok: true,
          message: `Pesan uji coba berhasil dikirim ke Chat ID: ${chatId}!`,
        });
      } else {
        return NextResponse.json({
          ok: false,
          error: 'Gagal mengirim pesan ke Telegram. Pastikan Chat ID valid dan Anda telah menekan START pada bot.',
        }, { status: 500 });
      }
    }

    // Action 3: Poll updates via getUpdates
    const offset = typeof body.offset === 'number' ? body.offset : undefined;
    const timeout = typeof body.timeout === 'number' ? Math.min(body.timeout, 5) : 0;

    // Mutex check: prevent concurrent getUpdates calls
    const now = Date.now();
    // 15 seconds lock expiration safeguard to prevent permanent lock if a request hung
    if (isPollingInProgress && now - lastPollStartTime < 15000) {
      return NextResponse.json({
        ok: true,
        inProgress: true,
        count: 0,
        nextOffset: serverLastOffset > 0 ? serverLastOffset : offset,
        message: 'Polling sedang aktif di thread lain. Panggilan dilewati untuk mencegah duplicate updates.',
      });
    }

    isPollingInProgress = true;
    lastPollStartTime = Date.now();

    try {
      // Optionally delete webhook first if explicitly asked
      if (body.deleteWebhookFirst) {
        await deleteWebhook(token);
      }

      // Calculate effective offset using serverLastOffset
      let effectiveOffset = offset;
      if (effectiveOffset === undefined && serverLastOffset > 0) {
        effectiveOffset = serverLastOffset;
      } else if (effectiveOffset !== undefined && serverLastOffset > effectiveOffset) {
        effectiveOffset = serverLastOffset;
      }

      let updates = [];
      try {
        updates = await getUpdates(token, effectiveOffset, timeout);
      } catch (pollErr: any) {
        // If error indicates 409 conflict (webhook active), auto-clear webhook and retry once if requested
        if (pollErr.message?.includes('Webhook')) {
          return NextResponse.json({
            ok: false,
            error: pollErr.message,
            needsWebhookReset: true,
          }, { status: 409 });
        }
        throw pollErr;
      }

      const processed = [];
      let maxUpdateId = effectiveOffset ? effectiveOffset - 1 : 0;

      for (const update of updates) {
        if (update.update_id > maxUpdateId) {
          maxUpdateId = update.update_id;
        }

        // Idempotency: Skip if already processed!
        if (processedUpdateIds.has(update.update_id)) {
          console.log(`[Telegram Poll] Skipping duplicate update_id: ${update.update_id}`);
          continue;
        }
        processedUpdateIds.add(update.update_id);
        if (processedUpdateIds.size > MAX_PROCESSED_UPDATES) {
          const first = processedUpdateIds.values().next().value;
          if (first !== undefined) processedUpdateIds.delete(first);
        }

        // Support standard message, edited message, AND callback query (button click)
        let msg: any = update.message || update.edited_message;
        let callbackQueryId: string | undefined;

        if (!msg && (update as any).callback_query) {
          const cb = (update as any).callback_query;
          callbackQueryId = cb.id;
          msg = {
            message_id: cb.message?.message_id || Date.now(),
            chat: cb.message?.chat || { id: cb.from?.id, type: 'private' },
            from: cb.from,
            date: Math.floor(Date.now() / 1000),
            text: cb.data || '',
          };
        }

        if (!msg) continue;

        // If callback query (button press), answer callback immediately to dismiss Telegram button loader
        if (callbackQueryId) {
          await answerCallbackQuery(token, callbackQueryId).catch(() => {});
        }

        const chatId = msg.chat?.id;
        const text = msg.text || msg.caption || '';
        const photo = msg.photo;
        const voice = msg.voice;

        // Skip non-actionable events (e.g. pinned message, service events without text/media)
        if (!text && (!photo || photo.length === 0) && !voice) {
          continue;
        }

        let photoUrl: string | undefined;
        if (photo && photo.length > 0) {
          const bestPhoto = photo[photo.length - 1];
          photoUrl = (await getTelegramFileUrl(token, bestPhoto.file_id)) || undefined;
        }

        let voiceUrl: string | undefined;
        if (voice) {
          voiceUrl = (await getTelegramFileUrl(token, voice.file_id)) || undefined;
        }

        // Automatically link telegram chat ID to demoStore profile
        if (chatId) {
          demoStore.linkTelegramUser(chatId, msg.from?.username || msg.chat?.username);
        }

        // Process message through TataDana Bot Service with idempotencyKey
        const botResult = await handleTelegramMessageAdvanced({
          text,
          photoUrl,
          voiceUrl,
          chatId,
          from: msg.from,
          userName: resolveTelegramUserName(msg.from),
          idempotencyKey: `tg_upd_${update.update_id}`,
        });

        // Send reply directly back to Telegram user (with inline keyboard markup if present)
        let sent = false;
        if (chatId) {
          sent = await sendTelegramMessage(token, chatId, botResult.text, botResult.replyMarkup);
        }

        // Record in demo store simulator history for visual feedback
        demoStore.addSimMessage({
          id: `real_tg_${update.update_id}`,
          sender: 'user',
          text: text || (photoUrl ? '📷 [Foto Struk]' : voiceUrl ? '🎙️ [Voice Note]' : '[Pesan Media]'),
          timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          type: photoUrl ? 'photo' : voiceUrl ? 'voice' : 'text',
          mediaUrl: photoUrl || voiceUrl,
        });

        demoStore.addSimMessage({
          id: `real_bot_${update.update_id}`,
          sender: 'bot',
          text: botResult.text,
          timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          action: botResult.action,
        });

        processed.push({
          update_id: update.update_id,
          chatId,
          from: msg.from?.username || msg.from?.first_name || 'User',
          text,
          replyText: botResult.text,
          sent,
          timestamp: new Date().toISOString(),
        });
      }

      if (maxUpdateId > 0) {
        serverLastOffset = Math.max(serverLastOffset, maxUpdateId + 1);
      }
      const nextOffset = serverLastOffset > 0 ? serverLastOffset : offset;

      return NextResponse.json({
        ok: true,
        count: updates.length,
        nextOffset,
        processed,
        timestamp: new Date().toISOString(),
      });
    } finally {
      isPollingInProgress = false;
    }
  } catch (error: any) {
    console.error('[Telegram Poll Route Error]:', error);
    return NextResponse.json({
      ok: false,
      error: error.message || 'Terjadi kesalahan saat polling Telegram.',
    }, { status: 500 });
  }
}
