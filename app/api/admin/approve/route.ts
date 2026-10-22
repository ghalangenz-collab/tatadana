import { NextRequest, NextResponse } from 'next/server';
import { approveServerUserAsync, rejectServerUserAsync } from '@/lib/server/user-store';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const { userId, action = 'approve' } = await req.json();
    if (!userId) {
      return NextResponse.json({ ok: false, error: 'User ID wajib diisi' }, { status: 400 });
    }

    if (action === 'reject') {
      const res = await rejectServerUserAsync(userId);
      return NextResponse.json(
        { ok: res.success, error: res.error },
        { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
      );
    }

    const res = await approveServerUserAsync(userId);
    if (!res.success) {
      return NextResponse.json({ ok: false, error: res.error }, { status: 400 });
    }

    return NextResponse.json(
      {
        ok: true,
        verification_code: res.verification_code,
        user: res.user,
      },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
