import { NextRequest, NextResponse } from 'next/server';
import { demoStore } from '@/lib/store/demo-store';

export async function GET() {
  return NextResponse.json({
    ok: true,
    subscriptions: demoStore.getSubscriptions(),
  });
}

export async function POST(req: NextRequest) {
  try {
    const { id, status } = await req.json();
    demoStore.updateSubscription(id, status);

    // If approved, upgrade profile
    if (status === 'active') {
      demoStore.updateProfile({ plan: 'pro' });
    }

    return NextResponse.json({
      ok: true,
      subscriptions: demoStore.getSubscriptions(),
      message: `Status pembayaran diubah menjadi: ${status}.`,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 400 });
  }
}
