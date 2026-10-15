import { Profile, Budget, Transaction } from '../types';

export function generateFinancialAdvice(
  profile: Profile,
  budget: Budget,
  percentUsed: number,
  recentTx?: Transaction
): string {
  const firstName = profile.full_name.split(' ')[0] || 'Teman';
  const categoryName = budget.category?.name || 'Kategori ini';
  const remaining = Math.max(0, budget.monthly_limit - (budget.current_spent || 0));

  let advice = '';
  if (percentUsed >= 100) {
    advice = `🤖 Financial Advisor
Hei ${firstName}! Pengeluaran untuk ${categoryName} sudah mencapai batas 100% dari budget bulanan kamu (Rp${budget.monthly_limit.toLocaleString('id-ID')}).
💡 Saran: Tunda dulu pengeluaran non-esensial di kategori ini sampai awal bulan depan, atau alokasikan sisa saldo dari pos budget lain yang masih surplus.`;
  } else if (percentUsed >= 80) {
    advice = `🤖 Financial Advisor
Hei ${firstName}! Pengeluaran untuk ${categoryName} sudah mencapai ${percentUsed}% dari budget bulanan. Sisa alokasi kamu tinggal Rp${remaining.toLocaleString('id-ID')}.
💡 Saran: Kurangi frekuensi transaksi besar beberapa hari ke depan agar budget kamu tetap aman sampai akhir bulan.`;
  } else {
    advice = `🤖 Financial Advisor
Hei ${firstName}! Aliran keuanganmu minggu ini cukup terkendali. Total pengeluaran masih dalam batas aman.
💡 Saran: Sisihkan minimal 10% ke Bibit Reksadana atau tabungan darurat sebelum terpakai untuk belanja impulsif.`;
  }

  return advice;
}
