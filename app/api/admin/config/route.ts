import { NextRequest, NextResponse } from 'next/server';
import { getServerAdminConfig, setServerAdminWhatsApp } from '@/lib/server/user-store';

export async function GET() {
  try {
    const config = getServerAdminConfig();
    return NextResponse.json({ ok: true, config });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { adminWhatsApp } = await req.json();
    if (!adminWhatsApp) {
      return NextResponse.json({ ok: false, error: 'Nomor WhatsApp admin wajib diisi' }, { status: 400 });
    }

    const saved = setServerAdminWhatsApp(adminWhatsApp);
    return NextResponse.json({ ok: true, adminWhatsApp: saved });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
