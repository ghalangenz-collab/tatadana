import { NextRequest, NextResponse } from 'next/server';
import { demoStore } from '@/lib/store/demo-store';

export async function POST(req: NextRequest) {
  try {
    const { title, format, periodStart, periodEnd } = await req.json();

    const exp = demoStore.addReportExport(
      title || `Laporan Keuangan ${periodStart} - ${periodEnd}`,
      format || 'pdf',
      periodStart || '2026-10-01',
      periodEnd || '2026-10-31'
    );

    return NextResponse.json({
      ok: true,
      export: exp,
      message: `Laporan ${format.toUpperCase()} berhasil dibuat.`,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    exports: demoStore.getReportExports(),
  });
}
