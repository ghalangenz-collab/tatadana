import { NextRequest, NextResponse } from 'next/server';
import { getMe, setWebhook } from '@/lib/telegram/api';
import { demoStore } from '@/lib/store/demo-store';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tokenParam = searchParams.get('token');
    const botToken = tokenParam || process.env.TELEGRAM_BOT_TOKEN;

    if (!botToken || typeof botToken !== 'string') {
      return NextResponse.json({
        ok: false,
        error: 'Token bot Telegram tidak ditemukan di env atau query param (?token=...).',
        hint: 'Masukkan token via query parameter /api/telegram/setup?token=<BOT_TOKEN>',
      }, { status: 400 });
    }

    const botInfo = await getMe(botToken);
    const baseUrl = process.env.WEBHOOK_BASE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://tatadana-steel.vercel.app');
    const webhookUrl = `${baseUrl}/api/telegram/webhook`;
    const webhookResult = await setWebhook(botToken, webhookUrl);

    demoStore.updateProfile({
      telegram_username: botInfo.username,
      is_bot_active: true,
    });

    return NextResponse.json({
      ok: true,
      bot: botInfo,
      webhook: webhookResult,
      webhookUrl,
      message: `⚡ Webhook aktif 24/7 di ${webhookUrl}! Bot @${botInfo.username} siap melayani chat dari perangkat manapun.`,
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const botToken = body.botToken || body.token || process.env.TELEGRAM_BOT_TOKEN;

    if (!botToken || typeof botToken !== 'string') {
      return NextResponse.json({ ok: false, error: 'Token bot Telegram wajib diisi.' }, { status: 400 });
    }

    // 1. Verify token with getMe
    const botInfo = await getMe(botToken);

    // 2. Set webhook
    const baseUrl = process.env.WEBHOOK_BASE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://tatadana-steel.vercel.app');
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
      message: `Berhasil menghubungkan bot @${botInfo.username}! Webhook aktif 24/7 di ${webhookUrl}.`,
    });
  } catch (error: any) {
    console.error('[Telegram Setup Error]:', error);
    return NextResponse.json({ ok: false, error: error.message || 'Gagal mengatur bot Telegram.' }, { status: 500 });
  }
}
