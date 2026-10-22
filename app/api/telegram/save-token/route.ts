import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getMe, setWebhook, setMyCommands } from '@/lib/telegram/api';
import { demoStore } from '@/lib/store/demo-store';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawToken = typeof body.token === 'string' ? body.token.trim() : '';

    if (!rawToken) {
      return NextResponse.json({
        ok: false,
        error: 'Harap masukkan Bot Token Telegram yang valid dari @BotFather.',
      }, { status: 400 });
    }

    // 1. Verify token with Telegram Bot API
    let botInfo;
    try {
      botInfo = await getMe(rawToken);
    } catch (err: any) {
      return NextResponse.json({
        ok: false,
        error: `Token ditolak oleh Telegram API: ${err.message}. Pastikan token persis seperti yang diberikan @BotFather.`,
      }, { status: 400 });
    }

    // 2. Set webhook to live deployment so bot answers 24/7 on Vercel without local polling
    const baseUrl =
      process.env.WEBHOOK_BASE_URL && !process.env.WEBHOOK_BASE_URL.includes('localhost') && process.env.WEBHOOK_BASE_URL.startsWith('https://')
        ? process.env.WEBHOOK_BASE_URL
        : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'https://tatadana-steel.vercel.app';
    const webhookUrl = `${baseUrl.replace(/\/$/, '')}/api/telegram/webhook`;
    await setWebhook(rawToken, webhookUrl).catch((err) => {
      console.warn('Auto set webhook warning:', err);
    });

    // 3. Register menu commands (/makan, /tambah_saldo, /saldo, etc) with Telegram
    await setMyCommands(rawToken).catch((err) => {
      console.warn('Set commands warning:', err);
    });

    // 4. Update process.env
    process.env.TELEGRAM_BOT_TOKEN = rawToken;

    // 5. Persist to .env.local
    try {
      const envPath = path.resolve(process.cwd(), '.env.local');
      if (fs.existsSync(envPath)) {
        let envContent = fs.readFileSync(envPath, 'utf8');
        if (envContent.includes('TELEGRAM_BOT_TOKEN=')) {
          envContent = envContent.replace(
            /TELEGRAM_BOT_TOKEN=.*(\r?\n|$)/,
            `TELEGRAM_BOT_TOKEN=${rawToken}$1`
          );
        } else {
          envContent += `\nTELEGRAM_BOT_TOKEN=${rawToken}\n`;
        }
        fs.writeFileSync(envPath, envContent, 'utf8');
      }
    } catch (saveErr) {
      console.warn('Failed to update .env.local file:', saveErr);
    }

    // 6. Update demo store profile with bot username
    if (botInfo?.username) {
      demoStore.updateProfile({
        telegram_username: botInfo.username,
      });
    }

    return NextResponse.json({
      ok: true,
      bot: botInfo,
      message: `Bot @${botInfo.username} (${botInfo.first_name}) berhasil dihubungkan & siap merespons!`,
    });
  } catch (error: any) {
    console.error('Save token error:', error);
    return NextResponse.json({
      ok: false,
      error: error.message || 'Gagal menyimpan token bot.',
    }, { status: 500 });
  }
}
