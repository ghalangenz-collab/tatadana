import { NextRequest, NextResponse } from 'next/server';
import { demoStore } from '@/lib/store/demo-store';

export async function GET() {
  return NextResponse.json({
    ok: true,
    providers: demoStore.getAIProviders(),
    logs: demoStore.getAILogs(),
  });
}

export async function POST(req: NextRequest) {
  try {
    const { id, updates } = await req.json();
    demoStore.updateAIProvider(id, updates);
    return NextResponse.json({
      ok: true,
      providers: demoStore.getAIProviders(),
      message: 'Konfigurasi provider AI berhasil diperbarui.',
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 400 });
  }
}
