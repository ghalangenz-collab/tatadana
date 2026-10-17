import { NextRequest, NextResponse } from 'next/server';
import { getServerUserByIdOrQuery, getServerAdminConfig } from '@/lib/server/user-store';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || searchParams.get('id') || searchParams.get('query');

    if (!userId) {
      return NextResponse.json({ ok: false, error: 'User ID tidak diberikan' }, { status: 400 });
    }

    const user = getServerUserByIdOrQuery(userId);
    const config = getServerAdminConfig();

    if (!user) {
      return NextResponse.json({ ok: false, notFound: true, config }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        status: user.status,
        is_verified: user.is_verified,
        verification_code: user.verification_code,
      },
      config,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
