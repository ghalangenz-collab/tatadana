import { NextRequest, NextResponse } from 'next/server';
import { demoStore } from '@/lib/store/demo-store';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');
  const categoryId = searchParams.get('category_id');
  const walletId = searchParams.get('wallet_id');
  const search = searchParams.get('search')?.toLowerCase();

  let txs = demoStore.getTransactions();

  if (type) {
    txs = txs.filter((t) => t.type === type);
  }
  if (categoryId) {
    txs = txs.filter((t) => t.category_id === categoryId);
  }
  if (walletId) {
    txs = txs.filter((t) => t.wallet_id === walletId);
  }
  if (search) {
    txs = txs.filter((t) => t.description.toLowerCase().includes(search));
  }

  return NextResponse.json({
    ok: true,
    transactions: txs,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.type === 'transfer') {
      const tx = demoStore.transferBetweenWallets(
        body.wallet_id,
        body.to_wallet_id,
        Number(body.amount),
        body.description
      );
      return NextResponse.json({ ok: true, transaction: tx });
    }

    const result = demoStore.addTransaction({
      wallet_id: body.wallet_id,
      category_id: body.category_id,
      type: body.type,
      amount: Number(body.amount),
      description: body.description,
      source: body.source || 'web_manual',
      has_receipt: body.has_receipt,
      receipt_url: body.receipt_url,
      receipt_items: body.receipt_items,
      transaction_date: body.transaction_date,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ ok: false, error: 'ID tidak valid' }, { status: 400 });

  demoStore.deleteTransaction(id);
  return NextResponse.json({ ok: true });
}
