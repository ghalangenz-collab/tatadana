import { NextRequest, NextResponse } from 'next/server';
import { getServerUserByIdOrQueryAsync, getServerAdminConfigAsync } from '@/lib/server/user-store';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || searchParams.get('id') || searchParams.get('query');

    if (!userId) {
      return NextResponse.json({ ok: false, error: 'User ID tidak diberikan' }, { status: 400 });
    }

    const user = await getServerUserByIdOrQueryAsync(userId);
    const config = await getServerAdminConfigAsync();

    if (!user) {
      return NextResponse.json(
        { ok: false, notFound: true, config },
        {
          status: 404,
          headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
        }
      );
    }

    return NextResponse.json(
      {
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
      },
      {
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
      }
    );
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
