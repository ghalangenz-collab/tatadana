import { NextRequest, NextResponse } from 'next/server';
import { getMe, setWebhook, getWebhookInfo, setMyCommands } from '@/lib/telegram/api';
import { demoStore } from '@/lib/store/demo-store';

function resolveProductionWebhookUrl(urlParam?: string | null): string {
  if (urlParam && urlParam.startsWith('https://')) {
    return urlParam.endsWith('/api/telegram/webhook') ? urlParam : `${urlParam.replace(/\/$/, '')}/api/telegram/webhook`;
  }
  const envBase = process.env.WEBHOOK_BASE_URL;
  if (envBase && envBase.startsWith('https://') && !envBase.includes('localhost')) {
    return `${envBase.replace(/\/$/, '')}/api/telegram/webhook`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}/api/telegram/webhook`;
  }
  return 'https://tatadana-steel.vercel.app/api/telegram/webhook';
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tokenParam = searchParams.get('token');
    const urlParam = searchParams.get('url') || searchParams.get('webhookUrl');
    const botToken =
      tokenParam ||
      (process.env.TELEGRAM_BOT_TOKEN && !process.env.TELEGRAM_BOT_TOKEN.includes('demo')
        ? process.env.TELEGRAM_BOT_TOKEN
        : '8403698657:AAE-MVaYbEsEex1QPyXF1c88Yp48TifyO2I');

    if (!botToken || typeof botToken !== 'string') {
      return NextResponse.json({
        ok: false,
        error: 'Token bot Telegram tidak ditemukan di env atau query param (?token=...).',
        hint: 'Masukkan token via query parameter /api/telegram/setup?token=<BOT_TOKEN>',
      }, { status: 400 });
    }

    const botInfo = await getMe(botToken);
    const webhookUrl = resolveProductionWebhookUrl(urlParam);
    const webhookResult = await setWebhook(botToken, webhookUrl);

    // Register Telegram commands menu
    await setMyCommands(botToken).catch(() => {});

    // Query webhook info to verify status
    const webhookInfo = await getWebhookInfo(botToken).catch(() => null);

    demoStore.updateProfile({
      telegram_username: botInfo.username,
      is_bot_active: true,
    });

    return NextResponse.json({
      ok: true,
      bot: botInfo,
      webhook: webhookResult,
      webhookUrl,
      webhookInfo: webhookInfo?.result || null,
      message: `⚡ Webhook aktif 24/7 di ${webhookUrl}! Bot @${botInfo.username} siap melayani chat dari perangkat manapun.`,
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const botToken =
      body.botToken ||
      body.token ||
      (process.env.TELEGRAM_BOT_TOKEN && !process.env.TELEGRAM_BOT_TOKEN.includes('demo')
        ? process.env.TELEGRAM_BOT_TOKEN
        : '8403698657:AAE-MVaYbEsEex1QPyXF1c88Yp48TifyO2I');
    const urlParam = body.url || body.webhookUrl;

    if (!botToken || typeof botToken !== 'string') {
      return NextResponse.json({ ok: false, error: 'Token bot Telegram wajib diisi.' }, { status: 400 });
    }

    // 1. Verify token with getMe
    const botInfo = await getMe(botToken);

    // 2. Set webhook to Vercel production HTTPS URL
    const webhookUrl = resolveProductionWebhookUrl(urlParam);
    const webhookResult = await setWebhook(botToken, webhookUrl);

    // 3. Register Telegram commands menu
    await setMyCommands(botToken).catch(() => {});

    // 4. Query webhook info
    const webhookInfo = await getWebhookInfo(botToken).catch(() => null);

    // 5. Save to profile
    demoStore.updateProfile({
      telegram_username: botInfo.username,
      is_bot_active: true,
    });

    return NextResponse.json({
      ok: true,
      bot: botInfo,
      webhook: webhookResult,
      webhookUrl,
      webhookInfo: webhookInfo?.result || null,
      message: `Berhasil menghubungkan bot @${botInfo.username}! Webhook aktif 24/7 di ${webhookUrl}.`,
    });
  } catch (error: any) {
    console.error('[Telegram Setup Error]:', error);
    return NextResponse.json({ ok: false, error: error.message || 'Gagal mengatur bot Telegram.' }, { status: 500 });
  }
}
