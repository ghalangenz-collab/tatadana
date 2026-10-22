import { NextResponse } from 'next/server';
import { getServerUsersAsync, getServerAdminConfigAsync } from '@/lib/server/user-store';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const users = await getServerUsersAsync();
    const config = await getServerAdminConfigAsync();
    return NextResponse.json(
      {
        ok: true,
        users,
        config,
        adminWhatsApp: config.adminWhatsApp,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
