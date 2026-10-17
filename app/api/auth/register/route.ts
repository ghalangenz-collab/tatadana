import { NextRequest, NextResponse } from 'next/server';
import { registerServerUser } from '@/lib/server/user-store';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.fullName || !body.email || !body.phone) {
      return NextResponse.json(
        { ok: false, error: 'Nama lengkap, email, dan nomor HP/WhatsApp wajib diisi.' },
        { status: 400 }
      );
    }

    const user = registerServerUser({
      fullName: body.fullName.trim(),
      email: body.email.trim(),
      phone: body.phone.trim(),
      password: body.password || 'password123',
      telegram_username: body.telegram_username ? body.telegram_username.replace(/^@/, '').trim() : undefined,
    });

    return NextResponse.json({ ok: true, user });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message || 'Gagal mendaftar' }, { status: 500 });
  }
}
