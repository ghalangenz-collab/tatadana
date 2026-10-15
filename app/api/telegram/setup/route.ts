import { NextRequest, NextResponse } from 'next/server';
import { getMe, setWebhook } from '@/lib/telegram/api';
import { demoStore } from '@/lib/store/demo-store';

export async function POST(req: NextRequest) {
  try {
    const { botToken } = await req.json();

    if (!botToken || typeof botToken !== 'string') {
      return NextResponse.json({ ok: false, error: 'Token bot Telegram wajib diisi.' }, { status: 400 });
    }

    // 1. Verify token with getMe
    const botInfo = await getMe(botToken);

    // 2. Set webhook
    const baseUrl = process.env.WEBHOOK_BASE_URL || 'https://tatadana.id';
    const webhookUrl = `${baseUrl}/api/telegram/webhook`;
    const webhookResult = await setWebhook(botToken, webhookUrl);

    // 3. Save to profile
    demoStore.updateProfile({
      telegram_username: botInfo.username,
      is_bot_active: true,
    });

    return NextResponse.json({
      ok: true,
      bot: botInfo,
      webhook: webhookResult,
      webhookUrl,
      message: `Berhasil menghubungkan bot @${botInfo.username}! Webhook aktif di ${webhookUrl}.`,
    });
  } catch (error: any) {
    console.error('[Telegram Setup Error]:', error);
    return NextResponse.json({ ok: false, error: error.message || 'Gagal mengatur bot Telegram.' }, { status: 500 });
  }
}
