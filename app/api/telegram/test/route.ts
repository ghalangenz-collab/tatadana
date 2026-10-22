import { NextRequest, NextResponse } from 'next/server';
import { getMe } from '@/lib/telegram/api';

export async function POST(req: NextRequest) {
  try {
    const { botToken } = await req.json();

    const token =
      botToken ||
      (process.env.TELEGRAM_BOT_TOKEN && !process.env.TELEGRAM_BOT_TOKEN.includes('demo')
        ? process.env.TELEGRAM_BOT_TOKEN
        : '8403698657:AAE-MVaYbEsEex1QPyXF1c88Yp48TifyO2I');
    if (!token) {
      return NextResponse.json({ ok: false, error: 'Token bot belum disetel.' }, { status: 400 });
    }

    const start = Date.now();
    const botInfo = await getMe(token);
    const latency = Date.now() - start;

    return NextResponse.json({
      ok: true,
      bot: botInfo,
      latencyMs: latency,
      message: `Koneksi berhasil! Bot @${botInfo.username} (${botInfo.first_name}) aktif dengan latensi ${latency}ms.`,
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message || 'Koneksi ke bot Telegram gagal.' }, { status: 500 });
  }
}
