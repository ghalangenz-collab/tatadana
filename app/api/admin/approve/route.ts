import { NextRequest, NextResponse } from 'next/server';
import { approveServerUser, rejectServerUser } from '@/lib/server/user-store';

export async function POST(req: NextRequest) {
  try {
    const { userId, action = 'approve' } = await req.json();
    if (!userId) {
      return NextResponse.json({ ok: false, error: 'User ID wajib diisi' }, { status: 400 });
    }

    if (action === 'reject') {
      const res = rejectServerUser(userId);
      return NextResponse.json({ ok: res.success, error: res.error });
    }

    const res = approveServerUser(userId);
    if (!res.success) {
      return NextResponse.json({ ok: false, error: res.error }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      verification_code: res.verification_code,
      user: res.user,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
