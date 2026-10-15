import { Transaction } from '../types';
import { demoStore } from '../store/demo-store';

export function generateCSVReport(transactions: Transaction[]): string {
  const headers = ['ID Transaksi', 'Tanggal', 'Tipe', 'Nominal (IDR)', 'Kategori', 'Dompet', 'Catatan', 'Sumber', 'Rincian Item'];
  
  const rows = transactions.map((tx) => {
    const itemsStr = tx.receipt_items && tx.receipt_items.length > 0
      ? tx.receipt_items.map((it) => `${it.name} (${it.qty}x Rp${it.price})`).join('; ')
      : '-';

    return [
      tx.id,
      new Date(tx.transaction_date).toLocaleDateString('id-ID'),
      tx.type === 'expense' ? 'Pengeluaran' : tx.type === 'income' ? 'Pemasukan' : 'Transfer',
      tx.amount,
      `"${tx.category?.name || 'Umum'}"`,
      `"${tx.wallet?.name || 'Default'}"`,
      `"${tx.description.replace(/"/g, '""')}"`,
      tx.source,
      `"${itemsStr.replace(/"/g, '""')}"`,
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function generateHTMLPrintablePDF(transactions: Transaction[], startDate: string, endDate: string, totalIncome: number, totalExpense: number): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Laporan Keuangan TataDana</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 30px; color: #111; }
    .header { border-bottom: 2px solid #FF6B00; padding-bottom: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
    .logo { font-size: 24px; font-weight: bold; color: #FF6B00; }
    .tagline { font-size: 12px; color: #666; }
    .summary-box { display: flex; gap: 20px; margin-bottom: 25px; }
    .summary-card { flex: 1; padding: 15px; border-radius: 8px; background: #f8f9fa; border: 1px solid #e5e7eb; }
    .summary-title { font-size: 11px; text-transform: uppercase; color: #6b7280; font-weight: bold; }
    .summary-val { font-size: 18px; font-weight: bold; margin-top: 5px; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
    th { background: #f3f4f6; text-align: left; padding: 10px; border-bottom: 2px solid #e5e7eb; }
    td { padding: 10px; border-bottom: 1px solid #e5e7eb; }
    .expense { color: #dc2626; font-weight: 600; }
    .income { color: #16a34a; font-weight: 600; }
    .receipt-items { font-size: 11px; color: #4b5563; margin-top: 4px; padding-left: 10px; border-left: 2px solid #FF6B00; }
    @media print {
      body { padding: 0; }
      button { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">⚡ TataDana</div>
      <div class="tagline">Catat keuangan semudah chat — langsung dari Telegram kamu</div>
    </div>
    <div style="text-align: right; font-size: 12px; color: #555;">
      <div><strong>Periode:</strong> ${startDate} s/d ${endDate}</div>
      <div><strong>Tanggal Cetak:</strong> ${new Date().toLocaleDateString('id-ID')}</div>
    </div>
  </div>

  <div class="summary-box">
    <div class="summary-card">
      <div class="summary-title">Total Pemasukan</div>
      <div class="summary-val income">Rp ${totalIncome.toLocaleString('id-ID')}</div>
    </div>
    <div class="summary-card">
      <div class="summary-title">Total Pengeluaran</div>
      <div class="summary-val expense">Rp ${totalExpense.toLocaleString('id-ID')}</div>
    </div>
    <div class="summary-card">
      <div class="summary-title">Net Cashflow</div>
      <div class="summary-val" style="color: ${totalIncome >= totalExpense ? '#16a34a' : '#dc2626'}">
        Rp ${(totalIncome - totalExpense).toLocaleString('id-ID')}
      </div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Tanggal</th>
        <th>Keterangan</th>
        <th>Kategori</th>
        <th>Dompet</th>
        <th style="text-align: right;">Nominal</th>
      </tr>
    </thead>
    <tbody>
      ${transactions.map((tx) => `
        <tr>
          <td>${new Date(tx.transaction_date).toLocaleDateString('id-ID')}</td>
          <td>
            <strong>${tx.description}</strong>
            ${tx.receipt_items && tx.receipt_items.length > 0 ? `
              <div class="receipt-items">
                ${tx.receipt_items.map(it => `<div>• ${it.name} (${it.qty}x) - Rp ${it.price.toLocaleString('id-ID')}</div>`).join('')}
              </div>
            ` : ''}
          </td>
          <td>${tx.category?.icon || ''} ${tx.category?.name || '-'}</td>
          <td>${tx.wallet?.name || '-'}</td>
          <td style="text-align: right;" class="${tx.type === 'income' ? 'income' : 'expense'}">
            ${tx.type === 'income' ? '+' : '-'} Rp ${tx.amount.toLocaleString('id-ID')}
          </td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div style="margin-top: 30px; text-align: center;">
    <button onclick="window.print()" style="background: #FF6B00; color: white; padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">
      Cetak / Simpan sebagai PDF
    </button>
  </div>
</body>
</html>
`;
}
