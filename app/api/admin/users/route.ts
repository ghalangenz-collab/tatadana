import { NextResponse } from 'next/server';
import { getServerUsers, getServerAdminConfig } from '@/lib/server/user-store';

export async function GET() {
  try {
    const users = getServerUsers();
    const config = getServerAdminConfig();
    return NextResponse.json({
      ok: true,
      users,
      config,
      adminWhatsApp: config.adminWhatsApp,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
