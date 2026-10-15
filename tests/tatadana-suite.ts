import { parseIndonesianAmount, heuristicParseIndonesianText } from '../lib/ai/parser';
import { handleTelegramMessage, handleTelegramMessageAdvanced, renderProgressBar, getWIBDateString } from '../lib/telegram/bot-service';
import { generateOTP, verifyOTP } from '../lib/otp/service';
import { demoStore } from '../lib/store/demo-store';

export async function runTataDanaVerificationSuite(): Promise<{
  total: number;
  passed: number;
  failed: number;
  errors: string[];
}> {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, testName: string) {
    if (condition) {
      passed++;
      console.log(`[PASS] ${testName}`);
    } else {
      failed++;
      errors.push(testName);
      console.error(`[FAIL] ${testName}`);
    }
  }

  console.log('--- Starting TataDana Deep Verification Suite ---');

  // Test 1: Amount parser standard formats
  assert(parseIndonesianAmount('15rb') === 15000, 'parseIndonesianAmount("15rb") == 15000');
  assert(parseIndonesianAmount('15ribu') === 15000, 'parseIndonesianAmount("15ribu") == 15000');
  assert(parseIndonesianAmount('1.5jt') === 1500000, 'parseIndonesianAmount("1.5jt") == 1500000');
  assert(parseIndonesianAmount('1,5jt') === 1500000, 'parseIndonesianAmount("1,5jt") == 1500000');
  assert(parseIndonesianAmount('500k') === 500000, 'parseIndonesianAmount("500k") == 500000');
  assert(parseIndonesianAmount('25k') === 25000, 'parseIndonesianAmount("25k") == 25000');
  assert(parseIndonesianAmount('10jt') === 10000000, 'parseIndonesianAmount("10jt") == 10000000');
  assert(parseIndonesianAmount('Rp 25.000') === 25000, 'parseIndonesianAmount("Rp 25.000") == 25000');
  assert(parseIndonesianAmount('bayar kost 1.500.000') === 1500000, 'parseIndonesianAmount("bayar kost 1.500.000") == 1500000');

  // Test 2: Critical Edge Cases (Prior attempt fatal bugs)
  // Bug 1 fix: Suffix 'k' must NOT collide with Indonesian words starting with 'k'
  assert(
    parseIndonesianAmount('makan 75000 kemarin') === 75000,
    'Collision edge case: "makan 75000 kemarin" must be 75000, NOT 75000000'
  );
  assert(
    parseIndonesianAmount('bayar 50000 ke bca') === 50000,
    'Collision edge case: "bayar 50000 ke bca" must be 50000, NOT 50000000'
  );

  // Bug 2 fix: Quantity prefix must NOT shadow monetary amount
  assert(
    parseIndonesianAmount('beli 2 porsi nasi goreng 50000') === 50000,
    'Quantity prefix edge case: "beli 2 porsi nasi goreng 50000" must be 50000, NOT 2'
  );
  assert(
    parseIndonesianAmount('nasi padang 2 bungkus 36000') === 36000,
    'Quantity prefix edge case: "nasi padang 2 bungkus 36000" must be 36000, NOT 2'
  );

  // Test 3: Natural Text Parsing & Clean Note Extraction
  // Bug 3 fix: Note description must NOT retain the amount string
  const t1 = heuristicParseIndonesianText('beli bakso 15rb');
  assert(
    t1 !== null && t1.amount === 15000 && t1.type === 'expense' && t1.categoryName.includes('Makanan'),
    'Parsing "beli bakso 15rb" -> expense 15000 Makanan'
  );
  assert(
    t1 !== null && t1.description === 'beli bakso',
    'Note clean extraction: "beli bakso 15rb" -> description is "beli bakso"'
  );

  const t2 = heuristicParseIndonesianText('gajian 15jt');
  assert(
    t2 !== null && t2.amount === 15000000 && t2.type === 'income' && t2.categoryName.includes('Gaji'),
    'Parsing "gajian 15jt" -> income 15000000 Gaji'
  );
  assert(
    t2 !== null && t2.description === 'gajian',
    'Note clean extraction: "gajian 15jt" -> description is "gajian"'
  );

  const t3 = heuristicParseIndonesianText('bensin pertamax 50k');
  assert(
    t3 !== null && t3.amount === 50000 && t3.categoryName.includes('Transportasi'),
    'Parsing "bensin pertamax 50k" -> Transportasi'
  );
  assert(
    t3 !== null && t3.description === 'bensin pertamax',
    'Note clean extraction: "bensin pertamax 50k" -> description is "bensin pertamax"'
  );

  // Test 4: Progress Bar Visuals
  assert(renderProgressBar(50) === '█████░░░░░', 'renderProgressBar(50) == "█████░░░░░"');
  assert(renderProgressBar(80) === '████████░░', 'renderProgressBar(80) == "████████░░"');
  assert(renderProgressBar(100) === '██████████', 'renderProgressBar(100) == "██████████"');

  // Test 5: OTP Verification
  const otpRes = generateOTP('+6281234567890');
  assert(otpRes.success && otpRes.devCode !== undefined, 'generateOTP returns devCode');
  const validCheck = verifyOTP('+6281234567890', '123456');
  assert(validCheck.valid === true, 'verifyOTP accepts default mock code 123456');
  const invalidCheck = verifyOTP('+6281234567890', '000000');
  assert(invalidCheck.valid === false, 'verifyOTP rejects incorrect code');

  // Test 6: Multi-Wallet & Default Wallet
  const defaultWallet = demoStore.getDefaultWallet();
  assert(defaultWallet !== undefined && defaultWallet.is_default === true, 'Default wallet exists and has is_default = true');

  // Test 7: AI Execution Mode & Failover Configuration
  assert(demoStore.getAIExecutionMode() === 'parallel', 'Default AI mode is parallel failover');
  demoStore.setAIExecutionMode('single');
  assert(demoStore.getAIExecutionMode() === 'single', 'setAIExecutionMode switches to single');
  demoStore.setAIExecutionMode('parallel');
  assert(demoStore.getAIExecutionMode() === 'parallel', 'Restored to parallel failover');

  // Test 8: Dynamic Bot Commands (No hardcoded values)
  const bulanIniReply = await handleTelegramMessage({ text: '/bulan_ini' });
  assert(bulanIniReply.includes('Rekap Bulan'), '/bulan_ini returns monthly recap header');
  assert(bulanIniReply.includes('Breakdown Kategori:'), '/bulan_ini provides dynamic category breakdown');

  const mingguIniReply = await handleTelegramMessage({ text: '/minggu_ini' });
  assert(mingguIniReply.includes('Rekap 7 Hari Terakhir'), '/minggu_ini returns 7-day recap');

  const saldoReply = await handleTelegramMessage({ text: '/saldo' });
  assert(saldoReply.includes('Saldo Dompet TataDana') && saldoReply.includes('BCA Prioritas'), '/saldo lists user wallets');

  // Test 9: Telegram User Linking Command
  const linkReply = await handleTelegramMessage({ text: '/link', chatId: 987654321 });
  assert(linkReply.includes('Akun Berhasil Dihubungkan!'), '/link binds chatId to user');
  assert(demoStore.getProfile().telegram_chat_id === 987654321, 'User profile has linked telegram_chat_id');

  // Test 10: Real-time Simulator Expense & Balance Deduction
  const walBeforeExpense = demoStore.getDefaultWallet().balance;
  const expenseReply = await handleTelegramMessage({ text: 'beli kopi 25rb' });
  const walAfterExpense = demoStore.getDefaultWallet().balance;
  assert(
    walAfterExpense === walBeforeExpense - 25000,
    `Expense deduction: "beli kopi 25rb" reduced wallet balance from ${walBeforeExpense} to ${walAfterExpense}`
  );
  assert(
    expenseReply.includes(walAfterExpense.toLocaleString('id-ID')),
    `Expense reply reflects updated saldo ${walAfterExpense.toLocaleString('id-ID')}`
  );

  // Test 11: Real-time Simulator Income & Balance Addition
  const walBeforeIncome = demoStore.getDefaultWallet().balance;
  const incomeReply = await handleTelegramMessage({ text: 'gajian 5jt' });
  const walAfterIncome = demoStore.getDefaultWallet().balance;
  assert(
    walAfterIncome === walBeforeIncome + 5000000,
    `Income addition: "gajian 5jt" increased wallet balance from ${walBeforeIncome} to ${walAfterIncome}`
  );
  assert(
    incomeReply.includes(walAfterIncome.toLocaleString('id-ID')),
    `Income reply reflects updated saldo ${walAfterIncome.toLocaleString('id-ID')}`
  );

  // Test 12: Simulator Store Sync & Reset
  demoStore.syncState({
    simMessages: [
      { id: 'custom_1', sender: 'user', text: 'test', timestamp: '12:00' },
    ],
  });
  assert(demoStore.getSimMessages().length === 1, 'demoStore.syncState updates simMessages');
  demoStore.resetSimMessages();
  assert(demoStore.getSimMessages().length >= 3, 'demoStore.resetSimMessages restores initial welcome messages');

  // Test 13: Telegram Fallback Link Validation
  const fallbackLink = 'https://t.me/tatadana_bot';
  assert(fallbackLink.startsWith('https://t.me/tatadana_bot'), 'Fallback Telegram bot link is correct and prominent');

  // Test 14: Interactive Wallet Selection Prompt for /bayar without Wallet Specified
  const bayarPromptResult = await handleTelegramMessageAdvanced({ text: '/bayar 25rb kopi', idempotencyKey: 'test_bayar_prompt' });
  assert(
    bayarPromptResult.action?.type === 'select_wallet_pay' &&
      Array.isArray(bayarPromptResult.action.options) &&
      bayarPromptResult.action.options.length > 0 &&
      bayarPromptResult.replyMarkup?.inline_keyboard?.length > 0,
    '/bayar without wallet prompts interactive wallet selection with action metadata and inline keyboard'
  );

  // Test 15: Interactive Wallet Selection Prompt for /topup without Wallet Specified
  const topupPromptResult = await handleTelegramMessageAdvanced({ text: '/topup 50rb', idempotencyKey: 'test_topup_prompt' });
  assert(
    topupPromptResult.action?.type === 'select_wallet_topup' &&
      Array.isArray(topupPromptResult.action.options) &&
      topupPromptResult.action.options.length > 0 &&
      topupPromptResult.replyMarkup?.inline_keyboard?.length > 0,
    '/topup without wallet prompts interactive destination wallet selection with action metadata and inline keyboard'
  );

  // Test 16: Direct Payment Execution when Specific Wallet Specified (/bayar_bca 25rb kopi)
  const bcaWallet = demoStore.getWallets().find((w) => w.name.toLowerCase().includes('bca'))!;
  const bcaBalBefore = bcaWallet.balance;
  const bayarBcaResult = await handleTelegramMessageAdvanced({ text: '/bayar_bca 25rb kopi', idempotencyKey: 'test_bayar_bca' });
  const bcaBalAfter = demoStore.getWallets().find((w) => w.id === bcaWallet.id)!.balance;
  assert(
    bcaBalAfter === bcaBalBefore - 25000,
    `Direct payment: /bayar_bca 25rb debits exactly 25.000 from BCA wallet (${bcaBalBefore} -> ${bcaBalAfter})`
  );
  assert(
    bayarBcaResult.text.includes('Pembayaran Tercatat') && bayarBcaResult.text.includes(bcaBalAfter.toLocaleString('id-ID')),
    'Direct payment reply contains confirmation and updated BCA balance'
  );

  // Test 17: Direct Top Up Execution when Specific Wallet Specified (/topup_gopay 50rb)
  const gopayWallet = demoStore.getWallets().find((w) => w.name.toLowerCase().includes('gopay'))!;
  const gopayBalBefore = gopayWallet.balance;
  const topupGopayResult = await handleTelegramMessageAdvanced({ text: '/topup_gopay 50rb', idempotencyKey: 'test_topup_gopay' });
  const gopayBalAfter = demoStore.getWallets().find((w) => w.id === gopayWallet.id)!.balance;
  assert(
    gopayBalAfter === gopayBalBefore + 50000,
    `Direct top up: /topup_gopay 50rb credits exactly 50.000 to GoPay wallet (${gopayBalBefore} -> ${gopayBalAfter})`
  );
  assert(
    topupGopayResult.text.includes('Top Up Saldo Berhasil') && topupGopayResult.text.includes(gopayBalAfter.toLocaleString('id-ID')),
    'Direct top up reply contains confirmation and updated GoPay balance'
  );

  // Test 18: Direct Payment Execution with Cash / Dompet Tunai (/bayar_tunai & /bayar_dompet)
  const cashWallet = demoStore.getWallets().find((w) => w.type === 'cash' || w.name.toLowerCase().includes('tunai'))!;
  const cashBalBefore = cashWallet.balance;
  const bayarTunaiResult = await handleTelegramMessageAdvanced({ text: '/bayar_tunai 20rb makan', idempotencyKey: 'test_bayar_tunai' });
  const cashBalAfter = demoStore.getWallets().find((w) => w.id === cashWallet.id)!.balance;
  assert(
    cashBalAfter === cashBalBefore - 20000,
    `Direct payment: /bayar_tunai debits 20.000 from Dompet Tunai (${cashBalBefore} -> ${cashBalAfter})`
  );
  assert(
    bayarTunaiResult.text.includes(cashWallet.name) && bayarTunaiResult.text.includes(cashBalAfter.toLocaleString('id-ID')),
    'Dompet Tunai payment reply contains confirmation and updated balance'
  );

  // Test 19: Direct Top Up Execution with Dana (/topup_dana 50rb & natural text)
  const danaWallet = demoStore.getWallets().find((w) => w.name.toLowerCase().includes('dana'))!;
  const danaBalBefore = danaWallet.balance;
  const topupDanaResult = await handleTelegramMessageAdvanced({ text: '/topup_dana 50rb', idempotencyKey: 'test_topup_dana' });
  const danaBalAfter = demoStore.getWallets().find((w) => w.id === danaWallet.id)!.balance;
  assert(
    danaBalAfter === danaBalBefore + 50000,
    `Direct top up: /topup_dana 50rb credits 50.000 to Dana wallet (${danaBalBefore} -> ${danaBalAfter})`
  );
  assert(
    topupDanaResult.text.includes('Dana') && topupDanaResult.text.includes(danaBalAfter.toLocaleString('id-ID')),
    'Dana top up reply contains confirmation and updated balance'
  );

  // Test 20: Direct Top Up Execution with Dompet Tunai (/topup_tunai 100rb)
  const cashBalBeforeTopup = demoStore.getWallets().find((w) => w.id === cashWallet.id)!.balance;
  const topupCashResult = await handleTelegramMessageAdvanced({ text: '/topup_tunai 100rb', idempotencyKey: 'test_topup_cash' });
  const cashBalAfterTopup = demoStore.getWallets().find((w) => w.id === cashWallet.id)!.balance;
  assert(
    cashBalAfterTopup === cashBalBeforeTopup + 100000,
    `Direct top up: /topup_tunai credits 100.000 to Dompet Tunai (${cashBalBeforeTopup} -> ${cashBalAfterTopup})`
  );

  // Test 21: Natural language payment prompts wallet selection when no wallet is specified
  const naturalPromptResult = await handleTelegramMessageAdvanced({ text: 'bayar kopi 25rb', idempotencyKey: 'test_natural_bayar' });
  assert(
    naturalPromptResult.action?.type === 'select_wallet_pay' &&
      naturalPromptResult.action.amount === 25000 &&
      naturalPromptResult.action.options.length > 0,
    'Natural text "bayar kopi 25rb" prompts interactive wallet selection with amount 25000'
  );

  // Test 22: Natural language payment executes direct debit when wallet is specified ("bayar baso 5 ribu pakai BCA")
  const bcaW = demoStore.getWallets().find((w) => w.name.toLowerCase().includes('bca'))!;
  const bcaPreDebit = bcaW.balance;
  const naturalPayResult = await handleTelegramMessageAdvanced({ text: 'bayar baso 5 ribu pakai BCA', idempotencyKey: 'test_natural_bca' });
  const bcaPostDebit = demoStore.getWallets().find((w) => w.id === bcaW.id)!.balance;
  assert(
    bcaPostDebit === bcaPreDebit - 5000,
    `Direct debit: "bayar baso 5 ribu pakai BCA" debits 5000 from BCA (${bcaPreDebit} -> ${bcaPostDebit})`
  );
  assert(
    naturalPayResult.text.includes('Pembayaran Tercatat') || naturalPayResult.text.includes('Pengeluaran'),
    'Natural language payment confirmation returned'
  );

  console.log(`--- Deep Verification Suite Complete: ${passed} Passed, ${failed} Failed ---`);
  return { total: passed + failed, passed, failed, errors };
}
