import { NextRequest, NextResponse } from 'next/server';
import { verifyServerUserCode } from '@/lib/server/user-store';

export async function POST(req: NextRequest) {
  try {
    const { userId, code } = await req.json();
    if (!userId || !code) {
      return NextResponse.json(
        { ok: false, error: 'User ID dan kode verifikasi wajib diisi' },
        { status: 400 }
      );
    }

    const res = verifyServerUserCode(userId, code);
    if (!res.success) {
      return NextResponse.json({ ok: false, error: res.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, user: res.user });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
