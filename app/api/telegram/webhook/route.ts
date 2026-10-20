import { NextRequest, NextResponse } from 'next/server';
import { handleTelegramMessage, handleTelegramMessageAdvanced, resolveTelegramUserName } from '@/lib/telegram/bot-service';
import { sendTelegramMessage, getTelegramFileUrl, answerCallbackQuery } from '@/lib/telegram/api';
import { demoStore } from '@/lib/store/demo-store';

// In-memory update_id idempotency cache (or DB backed)
const processedUpdateIds = new Set<number>();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const updateId = body.update_id;

    // Idempotency: skip if already processed
    if (updateId && processedUpdateIds.has(updateId)) {
      console.log(`[Telegram Webhook] Duplicate update_id ${updateId} skipped.`);
      return NextResponse.json({ ok: true, status: 'already_processed' });
    }

    if (updateId) {
      processedUpdateIds.add(updateId);
      // Keep cache bounded
      if (processedUpdateIds.size > 10000) {
        const first = processedUpdateIds.values().next().value;
        if (first !== undefined) processedUpdateIds.delete(first);
      }
    }

    let message = body.message || body.edited_message;
    let callbackQueryId: string | undefined;

    if (!message && body.callback_query) {
      const cb = body.callback_query;
      callbackQueryId = cb.id;
      message = {
        message_id: cb.message?.message_id || Date.now(),
        chat: cb.message?.chat || { id: cb.from?.id, type: 'private' },
        from: cb.from,
        date: Math.floor(Date.now() / 1000),
        text: cb.data || '',
      };
    }

    if (!message) {
      return NextResponse.json({ ok: true });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN || 'demo-token';

    if (callbackQueryId) {
      await answerCallbackQuery(botToken, callbackQueryId).catch(() => {});
    }

    const chatId = message.chat?.id;
    const text = message.text;
    const photo = message.photo;
    const voice = message.voice;
    const from = message.from;
    const userName = resolveTelegramUserName(from);

    let photoUrl: string | undefined;
    if (photo && photo.length > 0) {
      // Get highest resolution photo
      const bestPhoto = photo[photo.length - 1];
      const resolved = await getTelegramFileUrl(botToken, bestPhoto.file_id);
      photoUrl = resolved || undefined;
    }

    let voiceUrl: string | undefined;
    if (voice) {
      const resolved = await getTelegramFileUrl(botToken, voice.file_id);
      voiceUrl = resolved || undefined;
    }

    // Process message
    const botResult = await handleTelegramMessageAdvanced({
      text,
      photoUrl,
      voiceUrl,
      chatId,
      from,
      userName,
      idempotencyKey: updateId ? `tg_wh_${updateId}` : undefined,
    });

    // Send reply back to Telegram (with inline keyboard markup if present)
    if (chatId) {
      await sendTelegramMessage(botToken, chatId, botResult.text, botResult.replyMarkup);
    }

    // Record in demo store simulator history for real-time visual sync
    demoStore.addSimMessage({
      id: `real_tg_${updateId || Date.now()}`,
      sender: 'user',
      text: text || (photoUrl ? '📷 [Foto Struk]' : voiceUrl ? '🎙️ [Voice Note]' : '[Pesan Media]'),
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      type: photoUrl ? 'photo' : voiceUrl ? 'voice' : 'text',
      mediaUrl: photoUrl || voiceUrl,
    });

    demoStore.addSimMessage({
      id: `real_bot_${updateId || Date.now()}`,
      sender: 'bot',
      text: botResult.text,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      action: botResult.action,
    });

    return NextResponse.json({ ok: true, replied: true });
  } catch (error: any) {
    console.error('[Telegram Webhook Error]:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
