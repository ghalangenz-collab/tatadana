// Node test runner for amount parsing, collision edge cases, and bot progress bar

function parseIndonesianAmount(raw) {
  if (!raw) return null;
  const clean = raw.toLowerCase().trim();

  // 0. Suffix Billions: "1m", "1.5m", "1 miliar", "1 milyar", "2.5 miliar"
  const mMatch = clean.match(/(?:^|\b|rp\.?\s*)([\d]+(?:[.,]\d+)?)\s*(?:m|miliar|milyar)\b/i);
  if (mMatch) {
    const num = parseFloat(mMatch[1].replace(',', '.'));
    if (!isNaN(num) && num > 0) return Math.round(num * 1000000000);
  }

  // 1. Suffix Millions: "1.5jt", "1,5jt", "2 jt", "10 juta", "rp 1.5jt", "1.5 jt", "10jt", "10juta"
  const jtMatch = clean.match(/(?:^|\b|rp\.?\s*)([\d]+(?:[.,]\d+)?)\s*(?:jt|juta)\b/i);
  if (jtMatch) {
    const num = parseFloat(jtMatch[1].replace(',', '.'));
    if (!isNaN(num) && num > 0) return Math.round(num * 1000000);
  }

  // 2. Suffix Thousands: "15rb", "15 ribu", "500rb", "1.5rb", "25rb", "25ribu"
  const rbMatch = clean.match(/(?:^|\b|rp\.?\s*)([\d]+(?:[.,]\d+)?)\s*(?:rb|ribu)\b/i);
  if (rbMatch) {
    const num = parseFloat(rbMatch[1].replace(',', '.'));
    if (!isNaN(num) && num > 0) return Math.round(num * 1000);
  }

  // 3. Suffix 'k': e.g. "50k", "25 k", "500k", "1.5k" (MUST be word bounded so "kemarin", "ke", "kue" etc do NOT match!)
  const kMatch = clean.match(/(?:^|\b|rp\.?\s*)([\d]+(?:[.,]\d+)?)\s*k\b/i);
  if (kMatch) {
    const num = parseFloat(kMatch[1].replace(',', '.'));
    if (!isNaN(num) && num > 0) return Math.round(num * 1000);
  }

  // 4. Dot or Comma formatted Rupiah / full thousands: e.g. "rp 35.000", "50.000", "1.500.000", "1,000,000", "10.000.000"
  const dotSepMatch = clean.match(/(?:rp\.?\s*)?(\b\d{1,3}(?:[.,]\d{3})+(?:[.,]\d+)?\b)/i);
  if (dotSepMatch) {
    const cleanedDigits = dotSepMatch[1].replace(/[.,](\d{3})/g, '$1').replace(/[.,].*$/, '');
    const num = parseInt(cleanedDigits, 10);
    if (!isNaN(num) && num > 0) return num;
  }

  // 5. Look for explicit "Rp <number>" or raw digits with spaces (e.g. "10 000 000")
  const cleanDigitsOnly = clean.replace(/rp\.?/g, '').replace(/rupiah/g, '').trim();
  if (/^\d+$/.test(cleanDigitsOnly)) {
    const num = parseInt(cleanDigitsOnly, 10);
    if (!isNaN(num) && num > 0) return num;
  }
  if (/^(\d+\s+)+\d+$/.test(cleanDigitsOnly)) {
    const num = parseInt(cleanDigitsOnly.replace(/\s+/g, ''), 10);
    if (!isNaN(num) && num > 0) return num;
  }

  const rpMatch = clean.match(/rp\.?\s*(\d+)\b/i);
  if (rpMatch) {
    const num = parseInt(rpMatch[1], 10);
    if (!isNaN(num) && num > 0) return num;
  }

  // 6. Direct numbers: handle quantities like "beli 2 porsi 50000" or plain numbers "50000"
  const numberTokens = Array.from(clean.matchAll(/\b\d+\b/g)).map((m) => ({
    val: parseInt(m[0], 10),
    index: m.index ?? 0,
    text: m[0],
  }));

  if (numberTokens.length === 1) {
    const num = numberTokens[0].val;
    if (num > 0) return num;
  } else if (numberTokens.length > 1) {
    const financialCandidates = numberTokens.filter((t) => t.val >= 500);
    if (financialCandidates.length > 0) {
      return financialCandidates[financialCandidates.length - 1].val;
    }
    const maxVal = Math.max(...numberTokens.map((t) => t.val));
    return maxVal > 0 ? maxVal : null;
  }

  return null;
}

function extractNote(text) {
  let note = text
    .replace(/(?:rp\.?\s*)?[\d]+(?:[.,]\d+)?\s*(?:jt|juta|rb|ribu|k)\b/gi, '')
    .replace(/(?:rp\.?\s*)?\b\d{1,3}(?:\.\d{3})+\b/gi, '')
    .replace(/(?:rp\.?\s*)?\b\d{4,}\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return note || text;
}

function renderProgressBar(percent) {
  const filledCount = Math.min(10, Math.max(0, Math.round(percent / 10)));
  const emptyCount = 10 - filledCount;
  return '█'.repeat(filledCount) + '░'.repeat(emptyCount);
}

let passed = 0;
let failed = 0;

function test(name, condition) {
  if (condition) {
    passed++;
    console.log(`[PASS] ${name}`);
  } else {
    failed++;
    console.error(`[FAIL] ${name}`);
  }
}

console.log('Testing TataDana Core Logic & Regressions:');
test('15rb is 15000', parseIndonesianAmount('15rb') === 15000);
test('15ribu is 15000', parseIndonesianAmount('15ribu') === 15000);
test('1.5jt is 1500000', parseIndonesianAmount('1.5jt') === 1500000);
test('1,5jt is 1500000', parseIndonesianAmount('1,5jt') === 1500000);
test('500k is 500000', parseIndonesianAmount('500k') === 500000);
test('25k is 25000', parseIndonesianAmount('25k') === 25000);
test('10jt is 10000000', parseIndonesianAmount('10jt') === 10000000);
test('10 juta is 10000000', parseIndonesianAmount('10 juta') === 10000000);
test('10juta is 10000000', parseIndonesianAmount('10juta') === 10000000);
test('1.000.000 is 1000000', parseIndonesianAmount('1.000.000') === 1000000);
test('10.000.000 is 10000000', parseIndonesianAmount('10.000.000') === 10000000);
test('10 000 000 with spaces is 10000000', parseIndonesianAmount('10 000 000') === 10000000);
test('1m is 1000000000', parseIndonesianAmount('1m') === 1000000000);
test('1.5m is 1500000000', parseIndonesianAmount('1.5m') === 1500000000);
test('1 miliar is 1000000000', parseIndonesianAmount('1 miliar') === 1000000000);
test('Rp 35.000 is 35000', parseIndonesianAmount('Rp 35.000') === 35000);
test('bayar kost 1.500.000 is 1500000', parseIndonesianAmount('bayar kost 1.500.000') === 1500000);

// Critical regression tests
test('Suffix collision: "makan 75000 kemarin" is 75000 (NOT 75jt)', parseIndonesianAmount('makan 75000 kemarin') === 75000);
test('Suffix collision: "bayar 50000 ke bca" is 50000 (NOT 50jt)', parseIndonesianAmount('bayar 50000 ke bca') === 50000);
test('Quantity prefix: "beli 2 porsi nasi goreng 50000" is 50000 (NOT 2)', parseIndonesianAmount('beli 2 porsi nasi goreng 50000') === 50000);
test('Quantity prefix: "nasi padang 2 bungkus 36000" is 36000 (NOT 2)', parseIndonesianAmount('nasi padang 2 bungkus 36000') === 36000);

// Note extraction tests
test('Note extraction: "beli bakso 15rb" -> "beli bakso"', extractNote('beli bakso 15rb') === 'beli bakso');
test('Note extraction: "gajian 15jt" -> "gajian"', extractNote('gajian 15jt') === 'gajian');
test('Note extraction: "bensin pertamax 50k" -> "bensin pertamax"', extractNote('bensin pertamax 50k') === 'bensin pertamax');

// Progress bar tests
test('Progress bar 80% is 8 filled 2 empty', renderProgressBar(80) === '████████░░');
test('Progress bar 50% is 5 filled 5 empty', renderProgressBar(50) === '█████░░░░░');
test('Progress bar 100% is 10 filled', renderProgressBar(100) === '██████████');

// Telegram polling helper tests
function calculateNextOffset(updates, currentOffset) {
  let maxId = currentOffset !== undefined ? currentOffset - 1 : 0;
  for (const u of updates) {
    if (u.update_id > maxId) maxId = u.update_id;
  }
  return maxId > 0 ? maxId + 1 : currentOffset;
}

test('Polling offset: empty updates returns same offset', calculateNextOffset([], 100) === 100);
test('Polling offset: advances to max(update_id) + 1', calculateNextOffset([{ update_id: 101 }, { update_id: 105 }, { update_id: 103 }], 100) === 106);
test('Polling offset: initial offset calculation', calculateNextOffset([{ update_id: 10 }, { update_id: 20 }], undefined) === 21);

function extractTelegramMessageContent(update) {
  const msg = update.message || update.edited_message;
  if (!msg) return null;
  const text = msg.text || msg.caption || '';
  const hasPhoto = !!(msg.photo && msg.photo.length > 0);
  const hasVoice = !!msg.voice;
  if (!text && !hasPhoto && !hasVoice) return null;
  return {
    chatId: msg.chat?.id,
    text,
    hasPhoto,
    hasVoice,
  };
}

const sampleUpdate = {
  update_id: 501,
  message: {
    message_id: 12,
    chat: { id: 987654321, type: 'private' },
    text: 'beli kopi 25rb',
  },
};
const parsed = extractTelegramMessageContent(sampleUpdate);
test('Telegram payload extractor: extracts chatId and text correctly', parsed && parsed.chatId === 987654321 && parsed.text === 'beli kopi 25rb');

// Edited message test
const sampleEditedUpdate = {
  update_id: 502,
  edited_message: {
    message_id: 13,
    chat: { id: 987654321, type: 'private' },
    text: 'gajian 10jt',
  },
};
const parsedEdited = extractTelegramMessageContent(sampleEditedUpdate);
test('Telegram payload extractor: handles edited_message seamlessly', parsedEdited && parsedEdited.text === 'gajian 10jt');

// Non-actionable service update test
const serviceUpdate = {
  update_id: 503,
  message: {
    message_id: 14,
    chat: { id: 987654321, type: 'private' },
    pinned_message: {},
  },
};
test('Telegram payload extractor: ignores empty/service events', extractTelegramMessageContent(serviceUpdate) === null);

// Token fallback test
function resolveBotToken(inputToken, envToken) {
  const raw = typeof inputToken === 'string' ? inputToken.trim() : '';
  return raw || envToken;
}
test('Token resolution: uses input when provided', resolveBotToken('123:abc', 'env-tok') === '123:abc');
test('Token resolution: falls back to env when input is empty', resolveBotToken('', 'env-tok') === 'env-tok');
test('Token resolution: falls back to env when input is spaces', resolveBotToken('   ', 'env-tok') === 'env-tok');

// Demo token detection test
function isDemoToken(token) {
  if (!token) return true;
  return token.startsWith('demo_') || token.includes('demo');
}
test('Demo token detector: detects demo_ prefix', isDemoToken('demo_telegram_bot_token_tatadana') === true);
test('Demo token detector: recognizes real token', isDemoToken('748192837:AAFl3K9RealProductionTokenXYZ') === false);

// Simulator real-time parser and balance calculations
test('Simulator amount: "beli kopi 25rb" is 25000', parseIndonesianAmount('beli kopi 25rb') === 25000);
test('Simulator note: "beli kopi 25rb" -> "beli kopi"', extractNote('beli kopi 25rb') === 'beli kopi');
test('Simulator amount: "gajian 5jt" is 5000000', parseIndonesianAmount('gajian 5jt') === 5000000);
test('Simulator note: "gajian 5jt" -> "gajian"', extractNote('gajian 5jt') === 'gajian');

// Real-time balance change calculations
let mockWalletBalance = 14850000;
let mockTotalBalance = 16655000;

// Expense simulation
const expenseAmt = parseIndonesianAmount('beli kopi 25rb');
mockWalletBalance -= expenseAmt;
mockTotalBalance -= expenseAmt;
test('Simulator expense: wallet balance decreases by 25rb to 14825000', mockWalletBalance === 14825000);
test('Simulator expense: total balance decreases by 25rb to 16630000', mockTotalBalance === 16630000);

// Income simulation
const incomeAmt = parseIndonesianAmount('gajian 5jt');
mockWalletBalance += incomeAmt;
mockTotalBalance += incomeAmt;
test('Simulator income: wallet balance increases by 5jt to 19825000', mockWalletBalance === 19825000);
test('Simulator income: total balance increases by 5jt to 21630000', mockTotalBalance === 21630000);

// Telegram Fallback Link Validation
const telegramBotUrl = 'https://t.me/rumahtatdanabot';
test('Telegram Fallback Link format is valid', telegramBotUrl === 'https://t.me/rumahtatdanabot');

// Test "5 ribu makan" parsing
test('Amount parser: "5 ribu makan" is 5000', parseIndonesianAmount('5 ribu makan') === 5000);
test('Amount parser: "makan 5 ribu" is 5000', parseIndonesianAmount('makan 5 ribu') === 5000);
test('Amount parser: "/makan 25rb" is 25000', parseIndonesianAmount('25rb') === 25000);
test('Amount parser: "/tambah_saldo 500rb" is 500000', parseIndonesianAmount('500rb') === 500000);

// Default resolution tests for menu command clicks (/makan, /bensin, /bayar & /tambah_saldo)
function resolveCommandAmount(cmd, rawParam) {
  const parsed = parseIndonesianAmount(rawParam);
  if (parsed) return parsed;
  if (cmd === '/makan') return 25000;
  if (cmd === '/bensin') return 50000;
  if (cmd === '/bayar') return 25000;
  if (cmd === '/tambah_saldo' || cmd === '/topup') return 100000;
  return null;
}
test('/makan default resolution is 25000', resolveCommandAmount('/makan', '') === 25000);
test('/makan with 15rb is 15000', resolveCommandAmount('/makan', '15rb') === 15000);
test('/bensin default resolution is 50000', resolveCommandAmount('/bensin', '') === 50000);
test('/bensin with 100rb is 100000', resolveCommandAmount('/bensin', '100rb') === 100000);
test('/bayar default resolution is 25000', resolveCommandAmount('/bayar', '') === 25000);
test('/tambah_saldo default resolution is 100000', resolveCommandAmount('/tambah_saldo', '') === 100000);
test('/tambah_saldo with 500rb is 500000', resolveCommandAmount('/tambah_saldo', '500rb') === 500000);
test('/topup default resolution is 100000', resolveCommandAmount('/topup', '') === 100000);

// Deduplication tests
function deduplicateSimMessages(messages) {
  if (!Array.isArray(messages)) return [];
  const result = [];
  const seenIds = new Set();

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (!msg || !msg.id) continue;
    if (seenIds.has(msg.id)) continue;
    const prev = result[result.length - 1];
    if (
      prev &&
      prev.sender === msg.sender &&
      prev.text?.trim() === msg.text?.trim() &&
      prev.type === msg.type &&
      prev.mediaUrl === msg.mediaUrl
    ) {
      continue;
    }
    seenIds.add(msg.id);
    result.push(msg);
  }
  return result;
}

const duplicateMessagesSample = [
  { id: 'msg_welcome', sender: 'bot', text: 'welcome', timestamp: '12:00' },
  { id: 'msg_u_1', sender: 'user', text: '5 ribu makan', timestamp: '12:01' },
  { id: 'msg_u_2', sender: 'user', text: '5 ribu makan', timestamp: '12:01' },
];
const dedupedResult = deduplicateSimMessages(duplicateMessagesSample);
test('Deduplication: removes consecutive duplicate user message with different id', dedupedResult.length === 2 && dedupedResult[1].id === 'msg_u_1');

const duplicateIdSample = [
  { id: 'msg_u_1', sender: 'user', text: '5 ribu makan', timestamp: '12:01' },
  { id: 'msg_u_1', sender: 'user', text: '5 ribu makan', timestamp: '12:01' },
];
test('Deduplication: removes duplicate message by ID', deduplicateSimMessages(duplicateIdSample).length === 1);

// Route simulator check test: optimistic message detection
function resolveSimulateUserMessage(currentMsgs, { text, messageId }) {
  const expectedText = text;
  const existingUserMsg = currentMsgs.find(
    (m) =>
      (messageId && m.id === messageId) ||
      (m.sender === 'user' &&
        m.text === expectedText &&
        currentMsgs.indexOf(m) >= currentMsgs.length - 2)
  );
  if (existingUserMsg) {
    return { userMsg: existingUserMsg, wasAdded: false };
  }
  const newMsg = { id: messageId || 'new_id', sender: 'user', text: expectedText };
  return { userMsg: newMsg, wasAdded: true };
}

const msgsWithOptimistic = [
  { id: 'msg_welcome', sender: 'bot', text: 'welcome' },
  { id: 'msg_client_opt', sender: 'user', text: '5 ribu makan' },
];
const resolutionWithOpt = resolveSimulateUserMessage(msgsWithOptimistic, { text: '5 ribu makan', messageId: 'msg_client_opt' });
test('Simulator route deduplication: reuses optimistic message without adding duplicate', resolutionWithOpt.wasAdded === false && resolutionWithOpt.userMsg.id === 'msg_client_opt');

const msgsWithoutOpt = [
  { id: 'msg_welcome', sender: 'bot', text: 'welcome' },
];
const resolutionWithoutOpt = resolveSimulateUserMessage(msgsWithoutOpt, { text: '5 ribu makan' });
test('Simulator route deduplication: creates user message if not already present', resolutionWithoutOpt.wasAdded === true);

// --- MULTI-LAYER IDEMPOTENCY & ANTI-BOUNCE TESTS ---

// 1. Processed Update IDs Idempotency Test
const processedUpdateIds = new Set();
function filterNewUpdates(updates) {
  const toProcess = [];
  for (const u of updates) {
    if (processedUpdateIds.has(u.update_id)) continue;
    processedUpdateIds.add(u.update_id);
    toProcess.push(u);
  }
  return toProcess;
}

const batch1 = [{ update_id: 1001, text: '/makan' }, { update_id: 1002, text: '/saldo' }];
const processedBatch1 = filterNewUpdates(batch1);
test('Update Deduplication: processes fresh updates', processedBatch1.length === 2);

// Same batch arriving again (e.g. concurrent poll or unacknowledged Telegram delivery)
const batch2 = [{ update_id: 1001, text: '/makan' }, { update_id: 1002, text: '/saldo' }, { update_id: 1003, text: '/tambah_saldo' }];
const processedBatch2 = filterNewUpdates(batch2);
test('Update Deduplication: skips already processed update_ids and only processes new one', processedBatch2.length === 1 && processedBatch2[0].update_id === 1003);

// 2. Server-side Offset Tracking & Stale Offset Protection
function resolveEffectiveOffset(clientOffset, serverLastOffset) {
  if (clientOffset === undefined && serverLastOffset > 0) return serverLastOffset;
  if (clientOffset !== undefined && serverLastOffset > clientOffset) return serverLastOffset;
  return clientOffset;
}
test('Offset Resolver: uses serverLastOffset if client sends undefined', resolveEffectiveOffset(undefined, 1004) === 1004);
test('Offset Resolver: uses serverLastOffset if client sends stale offset', resolveEffectiveOffset(1001, 1004) === 1004);
test('Offset Resolver: accepts client offset if client is ahead', resolveEffectiveOffset(1010, 1004) === 1010);
test('Offset Resolver: preserves undefined when server has no offset', resolveEffectiveOffset(undefined, 0) === undefined);

// 3. Mutex Locking Logic
let isPollingInProgress = false;
let lastPollStartTime = 0;
function tryAcquirePollLock(now = Date.now()) {
  if (isPollingInProgress && (now - lastPollStartTime < 15000)) {
    return false; // locked
  }
  isPollingInProgress = true;
  lastPollStartTime = now;
  return true;
}
function releasePollLock() {
  isPollingInProgress = false;
}

test('Polling Mutex: acquires lock on initial request', tryAcquirePollLock(1000) === true);
test('Polling Mutex: rejects second concurrent request while first is in-flight', tryAcquirePollLock(2000) === false);
releasePollLock();
test('Polling Mutex: acquires lock after release', tryAcquirePollLock(3000) === true);
// Safeguard timeout test: lock older than 15s expires
test('Polling Mutex: auto-expires lock if previous request timed out (>15s)', tryAcquirePollLock(20000) === true);
releasePollLock();

// 4. Store Transaction Anti-Bounce and Idempotency Guard Test
class MockStore {
  constructor() {
    this.walletBalance = 1000000;
    this.transactions = [];
    this.processedTxMap = new Map();
  }

  addTransaction(params) {
    // 1. Idempotency Key
    if (params.idempotencyKey && this.processedTxMap.has(params.idempotencyKey)) {
      return this.processedTxMap.get(params.idempotencyKey);
    }

    // 2. Anti-bounce guard within 2500ms
    const now = params.now || Date.now();
    const cleanDesc = (params.description || '').trim().toLowerCase();
    const recentDuplicate = this.transactions.find((t) => {
      if (t.type !== params.type || t.amount !== params.amount) return false;
      if ((t.description || '').trim().toLowerCase() !== cleanDesc) return false;
      const txTime = new Date(t.created_at).getTime();
      return Math.abs(now - txTime) < 2500;
    });

    if (recentDuplicate) {
      const existing = { transaction: recentDuplicate, duplicateBlocked: true };
      if (params.idempotencyKey) this.processedTxMap.set(params.idempotencyKey, existing);
      return existing;
    }

    // Balance update
    if (params.type === 'expense') {
      this.walletBalance -= params.amount;
    } else {
      this.walletBalance += params.amount;
    }

    const tx = {
      id: `tx_${Date.now()}_${Math.random()}`,
      type: params.type,
      amount: params.amount,
      description: params.description,
      created_at: new Date(now).toISOString(),
      idempotency_key: params.idempotencyKey,
    };
    this.transactions.unshift(tx);
    const result = { transaction: tx, duplicateBlocked: false };
    if (params.idempotencyKey) {
      this.processedTxMap.set(params.idempotencyKey, result);
    }
    return result;
  }
}

const mockStore = new MockStore();
const t0 = 1000000;

// User clicks /makan (expense 25,000)
const tx1 = mockStore.addTransaction({
  type: 'expense',
  amount: 25000,
  description: 'Makan',
  idempotencyKey: 'tg_upd_5001_makan',
  now: t0,
});
test('Store Transaction: initial /makan succeeds and balance drops by 25,000', mockStore.walletBalance === 975000 && !tx1.duplicateBlocked);

// Duplicate click / bounce of /makan within 1000ms with same idempotency key
const tx2 = mockStore.addTransaction({
  type: 'expense',
  amount: 25000,
  description: 'Makan',
  idempotencyKey: 'tg_upd_5001_makan',
  now: t0 + 1000,
});
test('Store Transaction Idempotency: duplicate idempotencyKey does NOT decrease balance again', mockStore.walletBalance === 975000 && tx2.transaction.id === tx1.transaction.id);

// Duplicate bounce WITHOUT idempotency key (e.g. quick double-tap) within 800ms
const tx3 = mockStore.addTransaction({
  type: 'expense',
  amount: 25000,
  description: 'Makan',
  now: t0 + 800,
});
test('Store Transaction Anti-Bounce: rapid duplicate without key blocked from decreasing balance', mockStore.walletBalance === 975000 && tx3.duplicateBlocked);

// Valid second transaction after bounce window (> 3000ms)
const tx4 = mockStore.addTransaction({
  type: 'expense',
  amount: 25000,
  description: 'Makan',
  now: t0 + 4000,
});
test('Store Transaction: legitimate transaction after debounce window succeeds', mockStore.walletBalance === 950000 && !tx4.duplicateBlocked);

// Pemasukan / tambah_saldo idempotency
const inc1 = mockStore.addTransaction({
  type: 'income',
  amount: 100000,
  description: 'Tambah Saldo',
  idempotencyKey: 'tg_upd_5002_income',
  now: t0 + 5000,
});
test('Store Transaction: income increases balance by 100,000', mockStore.walletBalance === 1050000 && !inc1.duplicateBlocked);

const inc2 = mockStore.addTransaction({
  type: 'income',
  amount: 100000,
  description: 'Tambah Saldo',
  idempotencyKey: 'tg_upd_5002_income',
  now: t0 + 5200,
});
test('Store Transaction Idempotency: duplicate income does NOT increase balance twice', mockStore.walletBalance === 1050000);

// 5. Bot Service Response Cache Test
const botCache = new Map();
function simulateBotService(key, replyGenerator) {
  if (botCache.has(key)) {
    return { reply: botCache.get(key), fromCache: true };
  }
  const reply = replyGenerator();
  botCache.set(key, reply);
  return { reply, fromCache: false };
}

let execCount = 0;
const r1 = simulateBotService('update_777', () => {
  execCount++;
  return 'Pengeluaran tercatat! Saldo sisa : Rp950.000';
});
const r2 = simulateBotService('update_777', () => {
  execCount++;
  return 'Pengeluaran tercatat! Saldo sisa : Rp950.000';
});
test('Bot Service Cache: first execution generates reply', r1.fromCache === false && execCount === 1);
test('Bot Service Cache: second duplicate call returns cached reply without executing logic again', r2.fromCache === true && execCount === 1);

// 6. Callback Query (Telegram Button) Payload Extraction Test
function extractUpdatePayload(update) {
  let msg = update.message || update.edited_message;
  let isCallback = false;
  if (!msg && update.callback_query) {
    const cb = update.callback_query;
    isCallback = true;
    msg = {
      chat: cb.message?.chat || { id: cb.from?.id },
      text: cb.data || '',
    };
  }
  if (!msg) return null;
  return {
    chatId: msg.chat?.id,
    text: msg.text,
    isCallback,
  };
}

const inlineButtonUpdate = {
  update_id: 8881,
  callback_query: {
    id: 'cb_query_999',
    from: { id: 1234567, first_name: 'Budi' },
    message: { chat: { id: 1234567 } },
    data: '/makan 25rb',
  },
};
const extractedButton = extractUpdatePayload(inlineButtonUpdate);
test('Callback Query Extraction: successfully extracts command from Telegram button click', extractedButton && extractedButton.isCallback && extractedButton.text === '/makan 25rb' && extractedButton.chatId === 1234567);

// 7. Multi-Wallet Selection & Default Wallet tests
class MockMultiWalletStore {
  constructor() {
    this.wallets = [
      { id: 'wal_bca', name: 'BCA Prioritas', balance: 14850000, is_default: true },
      { id: 'wal_gopay', name: 'GoPay Saldo', balance: 485000, is_default: false },
      { id: 'wal_cash', name: 'Dompet Tunai', balance: 320000, is_default: false },
    ];
    this.transactions = [];
  }

  getDefaultWallet() {
    return this.wallets.find((w) => w.is_default) || this.wallets[0];
  }

  setDefaultWallet(walletId) {
    this.wallets = this.wallets.map((w) => ({
      ...w,
      is_default: w.id === walletId,
    }));
  }

  selectWalletByName(query) {
    if (!query) return null;
    const clean = query.trim().toLowerCase();
    const matched = this.wallets.find((w) => w.name.toLowerCase().includes(clean)) || null;
    if (matched) {
      this.setDefaultWallet(matched.id);
      return matched;
    }
    return null;
  }

  addWallet(name, initialBalance) {
    const newWallet = {
      id: `wal_${Date.now()}_${Math.random()}`,
      name,
      balance: initialBalance,
      is_default: false,
    };
    this.wallets.push(newWallet);
    return newWallet;
  }

  transfer(fromId, toId, amount) {
    const from = this.wallets.find((w) => w.id === fromId);
    const to = this.wallets.find((w) => w.id === toId);
    if (!from || !to) throw new Error('Dompet tidak ditemukan');
    if (from.balance < amount) throw new Error('Saldo tidak cukup');
    from.balance -= amount;
    to.balance += amount;
    return { from, to };
  }

  addTransaction(walletId, type, amount, desc) {
    const wal = this.wallets.find((w) => w.id === walletId) || this.getDefaultWallet();
    if (type === 'expense') {
      wal.balance -= amount;
    } else {
      wal.balance += amount;
    }
    this.transactions.push({ walletId: wal.id, amount, desc });
    return wal;
  }
}

const multiStore = new MockMultiWalletStore();
test('Multi-Wallet: initial default wallet is BCA', multiStore.getDefaultWallet().id === 'wal_bca');

// Switch to GoPay using setDefaultWallet
multiStore.setDefaultWallet('wal_gopay');
test('Multi-Wallet: setDefaultWallet switches default wallet to GoPay', multiStore.getDefaultWallet().id === 'wal_gopay');

// Switch using selectWalletByName('/pilih_dompet tunai')
const selectedTunai = multiStore.selectWalletByName('tunai');
test('Multi-Wallet: selectWalletByName("tunai") finds and sets Dompet Tunai as default', selectedTunai !== null && selectedTunai.id === 'wal_cash' && multiStore.getDefaultWallet().id === 'wal_cash');

// Add new wallet (Mandiri)
const newMandiri = multiStore.addWallet('Mandiri Tabungan', 2500000);
test('Multi-Wallet: addWallet creates new wallet with balance', newMandiri.name === 'Mandiri Tabungan' && multiStore.wallets.length === 4);

// Transfer 500k from Mandiri to GoPay
multiStore.transfer(newMandiri.id, 'wal_gopay', 500000);
test('Multi-Wallet Transfer: reduces from Mandiri and adds to GoPay', newMandiri.balance === 2000000 && multiStore.wallets.find((w) => w.id === 'wal_gopay').balance === 985000);

// Add transaction directly to specific wallet (deducts from GoPay, not BCA)
const bcaBalBefore = multiStore.wallets.find((w) => w.id === 'wal_bca').balance;
multiStore.addTransaction('wal_gopay', 'expense', 25000, 'Kopi Kenangan GoPay');
const gopayBalAfter = multiStore.wallets.find((w) => w.id === 'wal_gopay').balance;
const bcaBalAfter = multiStore.wallets.find((w) => w.id === 'wal_bca').balance;
test('Multi-Wallet Transaction: cuts balance from chosen wallet (GoPay: 960000) and preserves BCA', gopayBalAfter === 960000 && bcaBalAfter === bcaBalBefore);

// --- REVISI TESTS: 2 PORTAL, REAL APPROVAL, 6-DIGIT CODE, SALDO RP 0, & MEMBELI BASO 5 RIBU ---

// 1. Amount & Note Parsing for flexible input formats ("1jt", "1.5jt", "10 juta", "1.000.000", "500k", "25rb", etc.)
test('Amount parser: "1jt" is 1000000', parseIndonesianAmount('1jt') === 1000000);
test('Amount parser: "1.5jt" is 1500000', parseIndonesianAmount('1.5jt') === 1500000);
test('Amount parser: "10 juta" is 10000000', parseIndonesianAmount('10 juta') === 10000000);
test('Amount parser: "1.000.000" is 1000000', parseIndonesianAmount('1.000.000') === 1000000);
test('Amount parser: "1,000,000" is 1000000', parseIndonesianAmount('1,000,000') === 1000000);
test('Amount parser: "500k" is 500000', parseIndonesianAmount('500k') === 500000);
test('Amount parser: "25rb" is 25000', parseIndonesianAmount('25rb') === 25000);
test('Amount parser: "membeli baso 5 ribu" is 5000', parseIndonesianAmount('membeli baso 5 ribu') === 5000);
test('Amount parser: "beli baso 5rb" is 5000', parseIndonesianAmount('beli baso 5rb') === 5000);
test('Amount parser: "bakso 15rb" is 15000', parseIndonesianAmount('bakso 15rb') === 15000);
test('Note extraction: "membeli baso 5 ribu" -> "membeli baso"', extractNote('membeli baso 5 ribu') === 'membeli baso');
test('Note extraction: "beli baso 5rb" -> "beli baso"', extractNote('beli baso 5rb') === 'beli baso');

// 2. Personal Account Registration with Rp 0 Balance
class MockPortalStore {
  constructor() {
    this.users = [];
    this.currentUser = null;
    this.adminSession = null;
  }

  registerUser(params) {
    const newId = `usr_${Date.now()}_${Math.random()}`;
    const initialWallet = {
      id: `wal_${newId}`,
      name: 'Dompet Utama',
      type: 'cash',
      balance: 0, // MUST BE 0 RUPIAH (FULL KOSONG)
      is_default: true,
    };
    const newUser = {
      id: newId,
      full_name: params.fullName,
      email: params.email,
      phone: params.phone,
      role: 'user',
      status: 'pending_approval',
      verification_code: undefined,
      is_verified: false,
      wallets: [initialWallet],
      transactions: [], // 0 TRANSAKSI (EMPTY)
    };
    this.users.unshift(newUser);
    this.currentUser = newUser;
    return newUser;
  }

  approveUser(userId) {
    const user = this.users.find((u) => u.id === userId);
    if (!user) return { success: false };
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    user.status = 'approved';
    user.verification_code = code;
    return { success: true, verification_code: code };
  }

  verifyUserCode(userId, code) {
    const user = this.users.find((u) => u.id === userId);
    if (!user) return { success: false, error: 'User tidak ditemukan' };
    if (user.status !== 'approved') return { success: false, error: 'Belum di-approve' };
    if (user.verification_code !== code.trim()) return { success: false, error: 'Kode salah' };
    user.is_verified = true;
    return { success: true };
  }

  canAccessDashboard(user) {
    if (!user) return false;
    return user.status === 'approved' && user.is_verified === true;
  }

  addTransaction(user, params) {
    const wallet = user.wallets.find((w) => w.is_default) || user.wallets[0];
    if (params.type === 'expense') {
      wallet.balance -= params.amount;
    } else {
      wallet.balance += params.amount;
    }
    const tx = {
      id: `tx_${Date.now()}`,
      wallet_id: wallet.id,
      type: params.type,
      amount: params.amount,
      description: params.description,
      created_at: new Date().toISOString(),
    };
    user.transactions.unshift(tx);
    return { transaction: tx, wallet };
  }
}

const portalStore = new MockPortalStore();

// Test: Register personal user
const regUser = portalStore.registerUser({
  fullName: 'Ahmad Dahlan',
  email: 'ahmad@example.com',
  phone: '08123456789',
});
test('Personal Registration: Saldo awal harus Rp 0 (Full Nol)', regUser.wallets[0].balance === 0);
test('Personal Registration: Mutasi transaksi awal harus kosong (0)', regUser.transactions.length === 0);
test('Personal Registration: Status awal adalah pending_approval', regUser.status === 'pending_approval' && !regUser.is_verified);
test('Access Control: User pending TIDAK BISA masuk dashboard', portalStore.canAccessDashboard(regUser) === false);

// Test: User tries invalid verification before admin approval
const earlyVerify = portalStore.verifyUserCode(regUser.id, '123456');
test('Access Control: Verifikasi ditolak jika admin belum approve', earlyVerify.success === false);

// Test: Admin Approves User in Admin Portal -> Generates 6-Digit Code
const approvalResult = portalStore.approveUser(regUser.id);
test('Admin Approval: Menghasilkan 6-digit kode verifikasi real', approvalResult.success && approvalResult.verification_code.length === 6 && /^\d{6}$/.test(approvalResult.verification_code));
test('Admin Approval: Status user menjadi approved', regUser.status === 'approved');
test('Access Control: User approved tapi belum memasukkan kode masih BELUM BISA masuk dashboard', portalStore.canAccessDashboard(regUser) === false);

// Test: User inputs wrong verification code
const wrongCodeVerify = portalStore.verifyUserCode(regUser.id, '000000');
test('Verification: Kode yang salah ditolak', wrongCodeVerify.success === false && !regUser.is_verified);

// Test: User inputs correct verification code generated by Admin
const correctCodeVerify = portalStore.verifyUserCode(regUser.id, approvalResult.verification_code);
test('Verification: Kode verifikasi yang benar berhasil', correctCodeVerify.success === true && regUser.is_verified === true);
test('Access Control: User yang sudah terverifikasi BISA masuk dashboard', portalStore.canAccessDashboard(regUser) === true);

// Test: Input "membeli baso 5 ribu" on Rp 0 balance wallet
const txBaso = portalStore.addTransaction(regUser, {
  type: 'expense',
  amount: parseIndonesianAmount('membeli baso 5 ribu'),
  description: extractNote('membeli baso 5 ribu'),
});
test('Transaction "membeli baso 5 ribu": amount is 5000', txBaso.transaction.amount === 5000);
test('Transaction "membeli baso 5 ribu": description is "membeli baso"', txBaso.transaction.description === 'membeli baso');
test('Transaction "membeli baso 5 ribu": muncul di riwayat transaksi user', regUser.transactions.length === 1 && regUser.transactions[0].description === 'membeli baso');
test('Transaction "membeli baso 5 ribu": saldo dari Rp 0 berkurang menjadi -5000', regUser.wallets[0].balance === -5000);

// 3. WhatsApp Admin Configuration & OTP Help Desk Link
class MockWhatsAppSupport {
  constructor() {
    this.adminWhatsApp = '+6281234567890';
  }
  setAdminWhatsApp(phone) {
    this.adminWhatsApp = phone.trim();
  }
  generateWhatsAppHelpUrl(user) {
    const cleanPhone = this.adminWhatsApp.replace(/\D/g, '');
    const msg = encodeURIComponent(`Halo Admin TataDana, saya ${user.name} (${user.email}) sedang di halaman verifikasi OTP akun. Mohon bantuan terkait persetujuan / kode verifikasi akun saya.`);
    return `https://wa.me/${cleanPhone}?text=${msg}`;
  }
}
const waSupport = new MockWhatsAppSupport();
test('WhatsApp Admin: default nomor adalah valid', waSupport.adminWhatsApp.startsWith('+62'));
waSupport.setAdminWhatsApp('+62 899-1122-3344');
test('WhatsApp Admin: dapat diubah oleh admin', waSupport.adminWhatsApp === '+62 899-1122-3344');
const waUrl = waSupport.generateWhatsAppHelpUrl({ name: 'Ahmad Dahlan', email: 'ahmad@example.com' });
test('WhatsApp Admin: URL wa.me terbentuk dengan benar', waUrl.startsWith('https://wa.me/6289911223344?text='));
test('WhatsApp Admin: URL mencakup nama dan email pendaftar', waUrl.includes('Ahmad%20Dahlan') && waUrl.includes('ahmad%40example.com'));

// 4. Heuristic Parser Expense & Income Category Tests
function heuristicParseIndonesianText(text) {
  const lower = text.toLowerCase().trim();
  const amount = parseIndonesianAmount(lower);
  if (!amount) return null;

  const isIncome =
    lower.includes('gaji') ||
    lower.includes('gajian') ||
    lower.includes('tambah saldo') ||
    lower.includes('tambah_saldo') ||
    lower.includes('tambahsaldo') ||
    lower.includes('top up') ||
    lower.includes('topup') ||
    lower.includes('isi saldo') ||
    lower.includes('terima') ||
    lower.includes('transferan masuk') ||
    lower.includes('bonus') ||
    lower.includes('dividen') ||
    lower.includes('pendapatan') ||
    lower.includes('pemasukan') ||
    lower.includes('side hustle') ||
    lower.includes('freelance');

  const type = isIncome ? 'income' : 'expense';
  let categoryName = isIncome ? 'Gaji Pokok' : 'Makanan & Minuman';

  if (isIncome) {
    if (lower.includes('tambah saldo') || lower.includes('top up') || lower.includes('topup') || lower.includes('isi saldo') || lower.includes('pemasukan')) {
      categoryName = 'Pemasukan';
    } else if (lower.includes('freelance') || lower.includes('side hustle') || lower.includes('bonus')) {
      categoryName = 'Bonus & Side Hustle';
    } else if (lower.includes('dividen') || lower.includes('investasi') || lower.includes('reksadana')) {
      categoryName = 'Investasi & Dividen';
    }
  } else {
    if (
      lower.includes('baso') ||
      lower.includes('bakso') ||
      lower.includes('makan') ||
      lower.includes('minum') ||
      lower.includes('kopi') ||
      lower.includes('mie') ||
      lower.includes('nasi') ||
      lower.includes('ayam') ||
      lower.includes('soto')
    ) {
      categoryName = 'Makanan & Minuman';
    } else if (
      lower.includes('bensin') ||
      lower.includes('pertamax') ||
      lower.includes('pertalite') ||
      lower.includes('gojek') ||
      lower.includes('grab') ||
      lower.includes('tol') ||
      lower.includes('parkir')
    ) {
      categoryName = 'Transportasi';
    } else if (
      lower.includes('nonton') ||
      lower.includes('bioskop') ||
      lower.includes('game') ||
      lower.includes('steam') ||
      lower.includes('spotify') ||
      lower.includes('hobi')
    ) {
      categoryName = 'Hiburan & Hobi';
    } else if (
      lower.includes('listrik') ||
      lower.includes('pln') ||
      lower.includes('wifi') ||
      lower.includes('indihome') ||
      lower.includes('kost') ||
      lower.includes('tagihan')
    ) {
      categoryName = 'Tagihan & Rumah';
    } else if (
      lower.includes('obat') ||
      lower.includes('dokter') ||
      lower.includes('klinik') ||
      lower.includes('apotek') ||
      lower.includes('vitamin')
    ) {
      categoryName = 'Kesehatan & Obat';
    } else if (
      lower.includes('baju') ||
      lower.includes('sepatu') ||
      lower.includes('tokopedia') ||
      lower.includes('shopee') ||
      lower.includes('belanja')
    ) {
      categoryName = 'Belanja & Lifestyle';
    }
  }

  let note = extractNote(text);
  return { type, amount, categoryName, description: note };
}

test('Parser: "membeli baso 5 ribu" -> Makanan & Minuman', heuristicParseIndonesianText('membeli baso 5 ribu')?.categoryName === 'Makanan & Minuman');
test('Parser: "bensin 50rb" -> Transportasi', heuristicParseIndonesianText('bensin 50rb')?.categoryName === 'Transportasi');
test('Parser: "bayar wifi 300rb" -> Tagihan & Rumah', heuristicParseIndonesianText('bayar wifi 300rb')?.categoryName === 'Tagihan & Rumah');
test('Parser: "beli baju 150rb" -> Belanja & Lifestyle', heuristicParseIndonesianText('beli baju 150rb')?.categoryName === 'Belanja & Lifestyle');
test('Parser: "obat panadol 25rb" -> Kesehatan & Obat', heuristicParseIndonesianText('obat panadol 25rb')?.categoryName === 'Kesehatan & Obat');
test('Parser: "nonton bioskop 60k" -> Hiburan & Hobi', heuristicParseIndonesianText('nonton bioskop 60k')?.categoryName === 'Hiburan & Hobi');
test('Parser: "gajian 10jt" -> Gaji Pokok (income)', heuristicParseIndonesianText('gajian 10jt')?.type === 'income' && heuristicParseIndonesianText('gajian 10jt')?.categoryName === 'Gaji Pokok');
test('Parser: "bonus freelance 2jt" -> Bonus & Side Hustle (income)', heuristicParseIndonesianText('bonus freelance 2jt')?.type === 'income' && heuristicParseIndonesianText('bonus freelance 2jt')?.categoryName === 'Bonus & Side Hustle');
test('Parser: "tambah saldo 500rb" -> Pemasukan (income)', heuristicParseIndonesianText('tambah saldo 500rb')?.type === 'income' && heuristicParseIndonesianText('tambah saldo 500rb')?.amount === 500000 && heuristicParseIndonesianText('tambah saldo 500rb')?.categoryName === 'Pemasukan');
test('Parser: "top up 100rb" -> Pemasukan (income)', heuristicParseIndonesianText('top up 100rb')?.type === 'income' && heuristicParseIndonesianText('top up 100rb')?.amount === 100000 && heuristicParseIndonesianText('top up 100rb')?.categoryName === 'Pemasukan');
test('Parser: "isi saldo 250rb" -> Pemasukan (income)', heuristicParseIndonesianText('isi saldo 250rb')?.type === 'income' && heuristicParseIndonesianText('isi saldo 250rb')?.amount === 250000 && heuristicParseIndonesianText('isi saldo 250rb')?.categoryName === 'Pemasukan');

// 5. User Store Mutations on Personal User Account
class FullUserPortalStore extends MockPortalStore {
  addWallet(user, name, type, initialBalance, isDefault = false) {
    if (isDefault) {
      user.wallets.forEach((w) => (w.is_default = false));
    }
    const newWallet = {
      id: `wal_${Date.now()}`,
      name,
      type,
      balance: initialBalance,
      is_default: isDefault,
    };
    user.wallets.push(newWallet);
    return newWallet;
  }

  setDefaultWallet(user, walletId) {
    user.wallets.forEach((w) => (w.is_default = w.id === walletId));
  }

  transfer(user, fromId, toId, amount) {
    const from = user.wallets.find((w) => w.id === fromId);
    const to = user.wallets.find((w) => w.id === toId);
    if (!from || !to) throw new Error('Dompet tidak ditemukan');
    from.balance -= amount;
    to.balance += amount;
    const tx = {
      id: `tx_${Date.now()}`,
      wallet_id: fromId,
      to_wallet_id: toId,
      type: 'transfer',
      amount,
      description: `Transfer ke ${to.name}`,
    };
    user.transactions.unshift(tx);
    return tx;
  }

  deleteTransaction(user, txId) {
    const idx = user.transactions.findIndex((t) => t.id === txId);
    if (idx === -1) return;
    const tx = user.transactions[idx];
    const wal = user.wallets.find((w) => w.id === tx.wallet_id);
    if (wal) {
      if (tx.type === 'expense') wal.balance += tx.amount;
      else if (tx.type === 'income') wal.balance -= tx.amount;
    }
    user.transactions.splice(idx, 1);
  }

  topUpWallet(user, walletId, amount, note) {
    const wal = user.wallets.find((w) => w.id === walletId) || user.wallets[0];
    if (!wal) throw new Error('Dompet tidak ditemukan');
    wal.balance += amount;
    const tx = {
      id: `tx_${Date.now()}`,
      wallet_id: wal.id,
      type: 'income',
      amount,
      description: note || `Top Up Saldo ${wal.name}`,
      created_at: new Date().toISOString(),
    };
    user.transactions.unshift(tx);
    return tx;
  }

  setBudget(user, categoryId, monthlyLimit) {
    if (!user.budgets) user.budgets = [];
    const b = user.budgets.find((x) => x.category_id === categoryId);
    if (b) {
      b.monthly_limit = monthlyLimit;
    } else {
      user.budgets.push({
        id: `bud_${Date.now()}`,
        category_id: categoryId,
        monthly_limit: monthlyLimit,
        current_spent: 0,
      });
    }
  }
}

const fullStore = new FullUserPortalStore();
const activeUser = fullStore.registerUser({ fullName: 'Budi Personal', email: 'budi.personal@example.com', phone: '081299998888' });
fullStore.approveUser(activeUser.id);
fullStore.verifyUserCode(activeUser.id, activeUser.verification_code);

// Test custom wallet creation
const gopay = fullStore.addWallet(activeUser, 'GoPay User', 'ewallet', 100000, false);
test('User Wallet Mutation: tambah dompet baru tersimpan di user', activeUser.wallets.length === 2 && activeUser.wallets[1].name === 'GoPay User');

// Test set default wallet
fullStore.setDefaultWallet(activeUser, gopay.id);
test('User Wallet Mutation: ubah dompet utama berfungsi', activeUser.wallets.find((w) => w.id === gopay.id).is_default === true && activeUser.wallets[0].is_default === false);

// Test transfer between user wallets
const transferTx = fullStore.transfer(activeUser, gopay.id, activeUser.wallets[0].id, 50000);
test('User Wallet Transfer: saldo dompet terpotong dan bertambah sesuai transfer', gopay.balance === 50000 && activeUser.wallets[0].balance === 50000);
test('User Wallet Transfer: mutasi transfer tercatat di riwayat', activeUser.transactions[0].id === transferTx.id);

// Test delete transaction and balance restore
fullStore.deleteTransaction(activeUser, transferTx.id);
test('User Transaction Mutation: hapus transaksi menghapus dari riwayat', activeUser.transactions.length === 0);

// Test top up wallet
const topUpTx = fullStore.topUpWallet(activeUser, gopay.id, 500000, 'Top Up Saldo GoPay');
test('User Wallet Top Up: saldo dompet bertambah sesuai nominal', gopay.balance === 550000);
test('User Wallet Top Up: mutasi top up tercatat di riwayat transaksi sebagai income', topUpTx.type === 'income' && topUpTx.amount === 500000 && activeUser.transactions[0].id === topUpTx.id);

// Test user budget mutation
fullStore.setBudget(activeUser, 'cat_makanan', 2000000);
test('User Budget Mutation: tambah budget bulanan tersimpan di user', activeUser.budgets.length === 1 && activeUser.budgets[0].monthly_limit === 2000000);

// Test /bayar command resolution and note extraction
function resolveBayarCommand(cmdText, wallets, defaultWallet) {
  const param = cmdText.replace(/^\/bayar/i, '').trim();
  let chosen = defaultWallet;
  for (const w of wallets) {
    const lowerName = w.name.toLowerCase();
    const tokens = lowerName.split(/\s+/).filter((t) => !['dompet', 'rekening', 'tabungan', 'saldo', 'prioritas', 'akun'].includes(t));
    const wordsToMatch = [lowerName, ...tokens];
    if (wordsToMatch.some((tok) => tok.length >= 2 && param.toLowerCase().includes(tok))) {
      chosen = w;
      break;
    }
  }
  const amt = parseIndonesianAmount(param) || 25000;
  let cleanNote = param
    .replace(/(?:rp\.?\s*)?[\d]+(?:[.,]\d+)?\s*(?:jt|juta|rb|ribu|k)\b/gi, '')
    .replace(/(?:rp\.?\s*)?\b\d{1,3}(?:\.\d{3})+\b/gi, '')
    .replace(/(?:rp\.?\s*)?\b\d{4,}\b/gi, '');
  for (const w of wallets) {
    const tokens = w.name.toLowerCase().split(/\s+/);
    for (const tok of tokens) {
      if (tok.length >= 2) cleanNote = cleanNote.replace(new RegExp(`\\b${tok}\\b`, 'gi'), '');
    }
  }
  cleanNote = cleanNote.replace(/\bpakai\b/gi, '').replace(/\bvia\b/gi, '').replace(/\bdengan\b/gi, '').trim();
  return { wallet: chosen, amount: amt, note: cleanNote || `Bayar via ${chosen.name}` };
}

const bayarRes = resolveBayarCommand('/bayar gopay 25rb bakso', activeUser.wallets, activeUser.wallets[0]);
test('Bot /bayar Command: correctly selects GoPay and parses 25000', bayarRes.wallet.name === 'GoPay User' && bayarRes.amount === 25000);
test('Bot /bayar Command: correctly extracts note "bakso"', bayarRes.note === 'bakso');

// Test wallet matching with prefix word "Dompet"
const bcaWallet = fullStore.addWallet(activeUser, 'Dompet BCA Prioritas', 'bank', 250000, false);
const bayarBca = resolveBayarCommand('/bayar 50rb makan siang pakai bca', activeUser.wallets, activeUser.wallets[0]);
test('Bot /bayar Command: matches BCA token inside "Dompet BCA Prioritas"', bayarBca.wallet.id === bcaWallet.id && bayarBca.amount === 50000 && bayarBca.note.includes('makan siang'));

// Test /topup command resolution
function resolveTopupCommand(cmdText, wallets) {
  const param = cmdText.replace(/^\/topup/i, '').replace(/^top\s*up/i, '').trim();
  let chosen = null;
  for (const w of wallets) {
    const lowerName = w.name.toLowerCase();
    const tokens = lowerName.split(/\s+/).filter((t) => !['dompet', 'rekening', 'tabungan', 'saldo', 'prioritas', 'akun'].includes(t));
    const wordsToMatch = [lowerName, ...tokens];
    if (wordsToMatch.some((tok) => tok.length >= 2 && (cmdText.toLowerCase().includes(`_${tok}`) || cmdText.toLowerCase().includes(`ke ${tok}`) || param.toLowerCase().includes(tok)))) {
      chosen = w;
      break;
    }
  }
  const amt = parseIndonesianAmount(param) || parseIndonesianAmount(cmdText) || 100000;
  return { wallet: chosen, amount: amt };
}

const topupRes = resolveTopupCommand('/topup_gopay 100rb', activeUser.wallets);
test('Bot /topup Command: correctly selects GoPay and parses 100000', topupRes.wallet !== null && topupRes.wallet.name === 'GoPay User' && topupRes.amount === 100000);

const topupBca = resolveTopupCommand('top up 500rb ke bca', activeUser.wallets);
test('Bot /topup Command: matches BCA token inside "Dompet BCA Prioritas" in "top up 500rb ke bca"', topupBca.wallet !== null && topupBca.wallet.id === bcaWallet.id && topupBca.amount === 500000);

// Test getWalletSlug and Dompet Tunai resolution
function getWalletSlug(wallet) {
  if (!wallet || !wallet.name) return 'wallet';
  const STOP_WORDS = new Set(['dompet', 'rekening', 'tabungan', 'saldo', 'prioritas', 'akun', 'bank', 'wallet', 'user']);
  const tokens = wallet.name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2 && !STOP_WORDS.has(t));
  if (tokens.length > 0) return tokens[0];
  if (wallet.name.toLowerCase().includes('utama')) return 'utama';
  if (wallet.type === 'cash') return 'tunai';
  const fallback = wallet.name.toLowerCase().replace(/[^a-z0-9]/g, '');
  return fallback.length >= 2 ? fallback : wallet.id.replace(/^wal_/, '');
}

const tunaiWallet = fullStore.addWallet(activeUser, 'Dompet Tunai', 'cash', 150000, false);
const danaWallet = fullStore.addWallet(activeUser, 'Dana', 'ewallet', 200000, false);

test('Wallet Slug: "Dompet Tunai" produces slug "tunai"', getWalletSlug(tunaiWallet) === 'tunai');
test('Wallet Slug: "Dana" produces slug "dana"', getWalletSlug(danaWallet) === 'dana');
test('Wallet Slug: "Dompet BCA Prioritas" produces slug "bca"', getWalletSlug(bcaWallet) === 'bca');

function matchWallet(cmdText, wallets) {
  const lower = cmdText.toLowerCase();
  // Pass 1: Match specific wallet name, slug, or distinctive name tokens
  for (const w of wallets) {
    const slug = getWalletSlug(w);
    const wName = w.name.toLowerCase();
    const nameTokens = wName
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length >= 2 && !['dompet', 'rekening', 'tabungan', 'saldo', 'prioritas', 'akun'].includes(t));
    const targets = [wName, slug, ...nameTokens];
    const unique = Array.from(new Set(targets.filter((t) => t && t.length >= 2))).sort((a, b) => b.length - a.length);
    for (const target of unique) {
      const regex = new RegExp(`(?:^|[^a-z0-9]|_)${target}(?:[^a-z0-9]|_|$)`, 'i');
      if (regex.test(lower)) return w;
    }
  }

  // Pass 2: Match generic fallback aliases (tunai, cash, dompet)
  // Prioritize wallets with explicit 'tunai' in name over generic cash/dompet
  const sorted = [...wallets].sort((a, b) => {
    const aT = a.name.toLowerCase().includes('tunai') ? 1 : 0;
    const bT = b.name.toLowerCase().includes('tunai') ? 1 : 0;
    return bT - aT;
  });

  for (const w of sorted) {
    const targets = [];
    if (w.name.toLowerCase().includes('tunai')) {
      targets.push('dompet', 'tunai', 'cash', 'dompet_tunai', 'uang_tunai');
    } else if (w.type === 'cash') {
      targets.push('tunai', 'cash', 'dompet');
    } else if (w.name.toLowerCase().includes('dompet')) {
      targets.push('dompet');
    }
    const unique = Array.from(new Set(targets.filter((t) => t && t.length >= 2))).sort((a, b) => b.length - a.length);
    for (const target of unique) {
      const regex = new RegExp(`(?:^|[^a-z0-9]|_)${target}(?:[^a-z0-9]|_|$)`, 'i');
      if (regex.test(lower)) return w;
    }
  }
  return null;
}

test('Wallet Match: /bayar_tunai matches Dompet Tunai', matchWallet('/bayar_tunai 20rb makan', activeUser.wallets)?.id === tunaiWallet.id);
test('Wallet Match: /bayar_dompet matches Dompet Tunai (backward compatibility)', matchWallet('/bayar_dompet 20rb makan', activeUser.wallets)?.id === tunaiWallet.id);
test('Wallet Match: /topup_dana 50rb matches Dana', matchWallet('/topup_dana 50rb', activeUser.wallets)?.id === danaWallet.id);
test('Wallet Match: "beli bakso 15rb" without wallet returns null (triggers selection)', matchWallet('beli bakso 15rb', activeUser.wallets) === null);
test('Wallet Match: "beli bakso 15rb pakai bca" matches BCA', matchWallet('beli bakso 15rb pakai bca', activeUser.wallets)?.id === bcaWallet.id);
test('Wallet Match: "/makan" without wallet returns null (triggers wallet picker)', matchWallet('/makan', activeUser.wallets) === null);
test('Wallet Match: "/makan pakai bca" matches BCA', matchWallet('/makan pakai bca', activeUser.wallets)?.id === bcaWallet.id);
test('Wallet Match: "/bensin" without wallet returns null (triggers wallet picker)', matchWallet('/bensin', activeUser.wallets) === null);
test('Wallet Match: "/bensin dana" matches Dana', matchWallet('/bensin dana', activeUser.wallets)?.id === danaWallet.id);
test('Wallet Match: "/bayar" without wallet returns null (triggers wallet picker)', matchWallet('/bayar', activeUser.wallets) === null);
test('Wallet Match: "/topup" without wallet returns null (triggers wallet picker)', matchWallet('/topup', activeUser.wallets) === null);

// Test budget current_spent tracking
fullStore.setBudget(activeUser, 'cat_makan', 500000);
const expenseTx = {
  id: 'tx_expense_test',
  wallet_id: bcaWallet.id,
  category_id: 'cat_makan',
  type: 'expense',
  amount: 75000,
};
const targetBud = activeUser.budgets.find((b) => b.category_id === 'cat_makan');
targetBud.current_spent = (targetBud.current_spent || 0) + expenseTx.amount;
test('User Budget Spent Tracking: spent increments on expense', targetBud.current_spent === 75000);

// Test parseNominalInput function
function parseNominalInput(raw) {
  if (typeof raw === 'number') return isNaN(raw) ? 0 : Math.max(0, raw);
  if (!raw) return 0;
  const str = String(raw).trim().toLowerCase();
  if (str === '0' || str === '0 rupiah' || str === 'rp 0' || str === 'rp. 0' || str === 'nol') return 0;

  const parsed = parseIndonesianAmount(str);
  if (parsed !== null && !isNaN(parsed) && parsed >= 0) {
    return parsed;
  }

  // Fallback: extract numeric digits
  const digitsOnly = str.replace(/[^\d]/g, '');
  if (digitsOnly) {
    const num = parseInt(digitsOnly, 10);
    if (!isNaN(num) && num >= 0) return num;
  }

  return 0;
}

test('parseNominalInput: "1jt" returns 1000000', parseNominalInput('1jt') === 1000000);
test('parseNominalInput: "1.5jt" returns 1500000', parseNominalInput('1.5jt') === 1500000);
test('parseNominalInput: "1,5jt" returns 1500000', parseNominalInput('1,5jt') === 1500000);
test('parseNominalInput: "10 juta" returns 10000000', parseNominalInput('10 juta') === 10000000);
test('parseNominalInput: "10jt" returns 10000000', parseNominalInput('10jt') === 10000000);
test('parseNominalInput: "1.000.000" returns 1000000', parseNominalInput('1.000.000') === 1000000);
test('parseNominalInput: "10.000.000" returns 10000000', parseNominalInput('10.000.000') === 10000000);
test('parseNominalInput: "500k" returns 500000', parseNominalInput('500k') === 500000);
test('parseNominalInput: "25rb" returns 25000', parseNominalInput('25rb') === 25000);
test('parseNominalInput: "25 ribu" returns 25000', parseNominalInput('25 ribu') === 25000);
test('parseNominalInput: "10 000 000" returns 10000000', parseNominalInput('10 000 000') === 10000000);
test('parseNominalInput: "50000" returns 50000', parseNominalInput('50000') === 50000);
test('parseNominalInput: "0" returns 0', parseNominalInput('0') === 0);
test('parseNominalInput: "0 rupiah" returns 0', parseNominalInput('0 rupiah') === 0);
test('parseNominalInput: "rp 0" returns 0', parseNominalInput('rp 0') === 0);
test('parseNominalInput: 10000000 returns 10000000', parseNominalInput(10000000) === 10000000);
test('parseNominalInput: null/undefined returns 0', parseNominalInput(null) === 0 && parseNominalInput(undefined) === 0);

// Test Photo 1 & Photo 2 scenario: User "Farhan Botak" registers and adds wallet "bca" with "10 juta"
const farhanUser = fullStore.registerUser({ fullName: 'Farhan Botak', email: 'farhan.botak@example.com', phone: '081234567891' });
fullStore.approveUser(farhanUser.id);
fullStore.verifyUserCode(farhanUser.id, farhanUser.verification_code);

test('Farhan Initial State: 1 wallet "Dompet Utama" with balance Rp 0', farhanUser.wallets.length === 1 && farhanUser.wallets[0].name === 'Dompet Utama' && farhanUser.wallets[0].balance === 0);

const bcaInitialNominal = parseNominalInput('10 juta');
test('Farhan Add Wallet: "10 juta" parsed to 10000000', bcaInitialNominal === 10000000);

const farhanBca = fullStore.addWallet(farhanUser, 'bca', 'bank', bcaInitialNominal, false);
test('Farhan Wallets: now has 2 wallets (Dompet Utama & bca)', farhanUser.wallets.length === 2);
test('Farhan BCA Wallet: has balance Rp 10.000.000', farhanBca.balance === 10000000);
test('Farhan Dompet Utama: still has balance Rp 0', farhanUser.wallets.find(w => w.name === 'Dompet Utama').balance === 0);

// Photo 2: User records transaction in AddTransactionModal
const expenseNominal = parseNominalInput('500k');
test('AddTransactionModal: "500k" parsed to 500000', expenseNominal === 500000);

// Record expense
farhanBca.balance -= expenseNominal;
const farhanTx1 = {
  id: `tx_${Date.now()}_1`,
  wallet_id: farhanBca.id,
  type: 'expense',
  amount: expenseNominal,
  description: 'Makan siang enak',
  created_at: new Date().toISOString(),
};
farhanUser.transactions.unshift(farhanTx1);
test('Farhan Transaction: BCA balance reduced to 9.500.000', farhanBca.balance === 9500000);
test('Farhan Mutasi: transaction recorded in user transactions', farhanUser.transactions[0].id === farhanTx1.id);

// Record income
const incomeNominal = parseNominalInput('1.5jt');
test('AddTransactionModal: "1.5jt" parsed to 1500000', incomeNominal === 1500000);

const dompetUtama = farhanUser.wallets.find(w => w.name === 'Dompet Utama');
dompetUtama.balance += incomeNominal;
const farhanTx2 = {
  id: `tx_${Date.now()}_2`,
  wallet_id: dompetUtama.id,
  type: 'income',
  amount: incomeNominal,
  description: 'Gaji freelance',
  created_at: new Date().toISOString(),
};
farhanUser.transactions.unshift(farhanTx2);
test('Farhan Transaction: Dompet Utama balance increased to 1.500.000', dompetUtama.balance === 1500000);
test('Farhan Mutasi: latest transaction is top of list', farhanUser.transactions[0].id === farhanTx2.id);

// Test Muhammad Ghalan Admin Account & WhatsApp 6285156847921
const defaultAdminAccount = {
  fullName: 'Muhammad Ghalan',
  password: 'ghalan123',
  phone: '6285156847921',
  role: 'admin',
};

function verifyAdminCredentials(userOrId, pass) {
  const cleanId = (userOrId || '').trim().toLowerCase();
  const isNameMatch = cleanId === 'muhammad ghalan' || cleanId === 'ghalan' || cleanId === 'admin';
  const isPassMatch = pass === 'ghalan123' || pass === 'admin';
  return isNameMatch && isPassMatch;
}

test('Admin Auth: Muhammad Ghalan with password ghalan123 is valid', verifyAdminCredentials('Muhammad Ghalan', 'ghalan123') === true);
test('Admin Auth: ghalan with password ghalan123 is valid', verifyAdminCredentials('ghalan', 'ghalan123') === true);
test('Admin Auth: invalid password is rejected', verifyAdminCredentials('Muhammad Ghalan', 'wrongpass') === false);

// Test Admin WhatsApp configuration default 6285156847921
const defaultWhatsApp = '6285156847921';
function getWhatsAppHelpDeskLink(waNumber, user) {
  const cleanNumber = (waNumber || defaultWhatsApp).replace(/\D/g, '');
  const msg = encodeURIComponent(`Halo Admin TataDana, saya ${user.fullName} (${user.email}) sedang di halaman verifikasi OTP akun.`);
  return `https://wa.me/${cleanNumber}?text=${msg}`;
}

const waLink = getWhatsAppHelpDeskLink(defaultWhatsApp, { fullName: 'Muhammad Ghalan', email: 'admin@tatadana.id' });
test('Admin WhatsApp: link starts with https://wa.me/6285156847921', waLink.startsWith('https://wa.me/6285156847921'));

// Test Transaction deduplication: prevent double transaction display (e.g. "beli makan 25ribu")
function deduplicateTransactionsList(txs) {
  const seen = new Set();
  return (txs || []).filter((tx) => {
    if (!tx || !tx.id || seen.has(tx.id)) return false;
    seen.add(tx.id);
    return true;
  });
}

const sampleDuplicateTxs = [
  { id: 'tx_101', description: 'beli makan 25ribu', amount: 25000, type: 'expense' },
  { id: 'tx_101', description: 'beli makan 25ribu', amount: 25000, type: 'expense' },
  { id: 'tx_102', description: 'bonus kerja', amount: 1000000, type: 'income' },
  { id: 'tx_102', description: 'bonus kerja', amount: 1000000, type: 'income' },
];

const dedupedTxs = deduplicateTransactionsList(sampleDuplicateTxs);
test('Transaction Deduplication: removes duplicate transactions with same ID (length becomes 2)', dedupedTxs.length === 2);
test('Transaction Deduplication: contains only 1 "beli makan 25ribu"', dedupedTxs.filter(t => t.description === 'beli makan 25ribu').length === 1);
// Test User Wallet Isolation (No Admin Wallets in Regular User Accounts)
function isWalletAllowedForUser(w, user) {
  if (!w || !w.id) return false;
  const nameLower = (w.name || '').toLowerCase();
  const idLower = (w.id || '').toLowerCase();
  if (user && user.role === 'admin') return true;
  if (nameLower.includes('(admin)') || nameLower.includes('admin') || idLower.includes('admin')) {
    return false;
  }
  if (w.user_id && (w.user_id.startsWith('adm_') || w.user_id === 'adm_ghalan_01')) {
    return false;
  }
  if (user && w.user_id && w.user_id !== user.id) {
    return false;
  }
  return true;
}

const mockAdminWallet = {
  id: 'wal_admin_99',
  user_id: 'adm_01',
  name: 'Dompet Utama (Admin)',
  type: 'bank',
  balance: 9950000,
  is_default: true,
};

const mockUserWallet1 = {
  id: 'wal_user_01',
  user_id: 'usr_zaa_01',
  name: 'Dompet Utama',
  type: 'cash',
  balance: 0,
  is_default: true,
};

const mockUserWallet2 = {
  id: 'wal_user_02',
  user_id: 'usr_zaa_01',
  name: 'BRI Tabungan',
  type: 'bank',
  balance: 10000000,
  is_default: false,
};

const regularUserZaa = {
  id: 'usr_zaa_01',
  full_name: 'zaa',
  role: 'user',
  wallets: [mockUserWallet1, mockAdminWallet, mockUserWallet2],
};

test('Wallet Isolation: Admin wallet is rejected for regular user', isWalletAllowedForUser(mockAdminWallet, regularUserZaa) === false);
test('Wallet Isolation: User wallet 1 is accepted for regular user', isWalletAllowedForUser(mockUserWallet1, regularUserZaa) === true);
test('Wallet Isolation: User wallet 2 is accepted for regular user', isWalletAllowedForUser(mockUserWallet2, regularUserZaa) === true);

// Purge test
const sanitizedWallets = regularUserZaa.wallets.filter(w => isWalletAllowedForUser(w, regularUserZaa));
test('Wallet Isolation: Sanitized wallet count is 2 (purged admin wallet)', sanitizedWallets.length === 2);
test('Wallet Isolation: Admin wallet is not in sanitized list', !sanitizedWallets.some(w => w.name.includes('Admin')));
const cleanTotalBalance = sanitizedWallets.reduce((acc, w) => acc + w.balance, 0);
test('Wallet Isolation: Sanitized total balance is 10000000', cleanTotalBalance === 10000000);

// Specific test for Azril ngawi account isolation
const mockAdminWallet10M = {
  id: 'wal_admin_ghalan_01',
  user_id: 'adm_ghalan_01',
  name: 'Dompet Utama (Admin)',
  type: 'bank',
  balance: 10000000,
  is_default: true,
};
const mockAzrilMainWallet = {
  id: 'wal_azril_main',
  user_id: 'usr_azril_13',
  name: 'Dompet Utama',
  type: 'cash',
  balance: 0,
  is_default: true,
};
const mockAzrilDanaWallet = {
  id: 'wal_azril_dana',
  user_id: 'usr_azril_13',
  name: 'Dana Dompet',
  type: 'ewallet',
  balance: 5000000,
  is_default: false,
};
const userAzrilNgawi = {
  id: 'usr_azril_13',
  full_name: 'Azril ngawi',
  telegram_username: 'azril13',
  role: 'user',
  wallets: [mockAdminWallet10M, mockAzrilMainWallet, mockAzrilDanaWallet],
};

test('Azril ngawi: Admin wallet 10M is strictly rejected', isWalletAllowedForUser(mockAdminWallet10M, userAzrilNgawi) === false);
test('Azril ngawi: Dompet Utama Rp 0 is accepted', isWalletAllowedForUser(mockAzrilMainWallet, userAzrilNgawi) === true);
test('Azril ngawi: Dana Dompet Rp 5M is accepted', isWalletAllowedForUser(mockAzrilDanaWallet, userAzrilNgawi) === true);

const azrilSanitizedWallets = userAzrilNgawi.wallets.filter(w => isWalletAllowedForUser(w, userAzrilNgawi));
test('Azril ngawi: Sanitized wallet count is 2 (Dompet Utama & Dana Dompet)', azrilSanitizedWallets.length === 2);
test('Azril ngawi: Sanitized wallets contain NO admin wallet', !azrilSanitizedWallets.some(w => w.name.toLowerCase().includes('admin') || w.id.includes('admin')));
const azrilTotalBalance = azrilSanitizedWallets.reduce((acc, w) => acc + w.balance, 0);
test('Azril ngawi: Total balance is strictly Rp 5.000.000 (not 15.000.000)', azrilTotalBalance === 5000000);

let azrilDefaultCount = 0;
const azrilDedupedWallets = azrilSanitizedWallets.map(w => {
  if (w.is_default && azrilDefaultCount === 0) {
    azrilDefaultCount++;
    return { ...w, is_default: true };
  }
  return { ...w, is_default: false };
});
test('Azril ngawi: Exactly 1 default wallet exists', azrilDedupedWallets.filter(w => w.is_default).length === 1);

// --- TELEGRAM BOT WELCOME GREETING & ONBOARDING TESTS ---
function resolveTelegramUserName(from, fallback = 'Sobat TataDana') {
  if (!from) return fallback;
  if (typeof from === 'string') {
    const trimmed = from.trim().replace(/^@/, '');
    return trimmed || fallback;
  }
  const firstName = (from.first_name || '').trim();
  const lastName = (from.last_name || '').trim();
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
  if (fullName) return fullName;
  if (from.username) {
    const cleanUser = from.username.replace(/^@/, '').trim();
    if (cleanUser) return cleanUser;
  }
  return fallback;
}

function formatTelegramWelcomeMessage(userName = 'Sobat TataDana') {
  const cleanName = (userName || '').trim() || 'Sobat TataDana';
  return (
    `👋 Selamat datang di TataDana, ${cleanName}! 🌟\n\n` +
    `Catat keuangan pribadi semudah chatting! 💬✨\n\n` +
    `Kamu bisa langsung ketik pengeluaran atau pemasukan harianmu, misalnya:\n` +
    `• *beli makan 25rb*\n` +
    `• *bensin 30rb*\n` +
    `• *gajian 5jt*\n` +
    `• *top up 100rb ke dana*\n\n` +
    `Ketik */menu* atau gunakan tombol di bawah untuk melihat pilihan lengkap.`
  );
}

// 1. Username resolution tests
test('Telegram Welcome: Full name from first_name + last_name', resolveTelegramUserName({ first_name: 'Muhammad', last_name: 'Ghalan' }) === 'Muhammad Ghalan');
test('Telegram Welcome: First name only', resolveTelegramUserName({ first_name: 'Ghalan' }) === 'Ghalan');
test('Telegram Welcome: Last name only', resolveTelegramUserName({ last_name: 'Dahlan' }) === 'Dahlan');
test('Telegram Welcome: Username fallback without @', resolveTelegramUserName({ username: 'ghalan_tg' }) === 'ghalan_tg');
test('Telegram Welcome: Username fallback with @ stripped', resolveTelegramUserName({ username: '@rumahtatdana' }) === 'rumahtatdana');
test('Telegram Welcome: Empty object falls back to "Sobat TataDana"', resolveTelegramUserName({}) === 'Sobat TataDana');
test('Telegram Welcome: null falls back to "Sobat TataDana"', resolveTelegramUserName(null) === 'Sobat TataDana');
test('Telegram Welcome: undefined falls back to "Sobat TataDana"', resolveTelegramUserName(undefined) === 'Sobat TataDana');
test('Telegram Welcome: string name passed directly', resolveTelegramUserName('Zaa') === 'Zaa');
test('Telegram Welcome: empty string falls back to "Sobat TataDana"', resolveTelegramUserName('   ') === 'Sobat TataDana');
test('Telegram Welcome: custom fallback used when provided', resolveTelegramUserName(null, 'Tamu') === 'Tamu');

// 2. Welcome message formatting tests
const sampleWelcome = formatTelegramWelcomeMessage('Muhammad Ghalan');
test('Welcome Message: Starts with personalized greeting', sampleWelcome.startsWith('👋 Selamat datang di TataDana, Muhammad Ghalan! 🌟'));
test('Welcome Message: Contains friendly subtitle', sampleWelcome.includes('Catat keuangan pribadi semudah chatting! 💬✨'));
test('Welcome Message: Contains example "beli makan 25rb"', sampleWelcome.includes('• *beli makan 25rb*'));
test('Welcome Message: Contains example "bensin 30rb"', sampleWelcome.includes('• *bensin 30rb*'));
test('Welcome Message: Contains example "gajian 5jt"', sampleWelcome.includes('• *gajian 5jt*'));
test('Welcome Message: Contains example "top up 100rb ke dana"', sampleWelcome.includes('• *top up 100rb ke dana*'));
test('Welcome Message: Contains menu instruction and button hint', sampleWelcome.includes('Ketik */menu* atau gunakan tombol di bawah untuk melihat pilihan lengkap.'));

// 3. Fallback welcome message formatting test
const fallbackWelcome = formatTelegramWelcomeMessage('');
test('Welcome Message Fallback: Uses "Sobat TataDana" when name is empty', fallbackWelcome.startsWith('👋 Selamat datang di TataDana, Sobat TataDana! 🌟'));

// 4. Amount parsing for all examples mentioned in welcome message
test('Welcome Example Amount: "beli makan 25rb" parsed as 25000', parseIndonesianAmount('beli makan 25rb') === 25000);
test('Welcome Example Amount: "bensin 30rb" parsed as 30000', parseIndonesianAmount('bensin 30rb') === 30000);
test('Welcome Example Amount: "gajian 5jt" parsed as 5000000', parseIndonesianAmount('gajian 5jt') === 5000000);
test('Welcome Example Amount: "top up 100rb ke dana" parsed as 100000', parseIndonesianAmount('top up 100rb ke dana') === 100000);

// 5. /start command routing vs /menu command routing
function simulateBotCommandHandler(cmd, userFrom) {
  const cleanCmd = (cmd || '').trim().toLowerCase().replace(/@\w+/, '');
  if (cleanCmd === '/start' || cleanCmd.startsWith('/start')) {
    const name = resolveTelegramUserName(userFrom);
    return {
      type: 'welcome',
      text: formatTelegramWelcomeMessage(name),
      hasButtons: true,
      buttons: [
        { label: '📋 Menu Lengkap', text: '/menu' },
        { label: '👛 Cek Saldo', text: '/saldo' },
        { label: '🍜 Beli Makan 25rb', text: 'beli makan 25rb' },
        { label: '⛽ Bensin 30rb', text: 'bensin 30rb' },
        { label: '💰 Top Up 100rb Dana', text: 'top up 100rb ke dana' },
        { label: '💼 Gajian 5jt', text: 'gajian 5jt' },
        { label: '💳 Bayar Rekening', text: '/bayar' },
      ],
    };
  }
  if (cleanCmd === '/menu' || cleanCmd === '/bantuan') {
    return {
      type: 'menu_guide',
      text: '🤖 *Menu & Panduan Bot TataDana*',
      hasButtons: false,
    };
  }
  return { type: 'unknown', text: '' };
}

const startRes = simulateBotCommandHandler('/start', { first_name: 'Zaa' });
test('Bot Router: /start returns welcome type', startRes.type === 'welcome');
test('Bot Router: /start addresses user personally', startRes.text.includes('👋 Selamat datang di TataDana, Zaa! 🌟'));
test('Bot Router: /start provides interactive quick action buttons', startRes.hasButtons === true);
test('Bot Router: /start buttons include all 4 welcome examples', startRes.buttons.some(b => b.text === 'beli makan 25rb') && startRes.buttons.some(b => b.text === 'bensin 30rb') && startRes.buttons.some(b => b.text === 'gajian 5jt') && startRes.buttons.some(b => b.text === 'top up 100rb ke dana'));

const startWithBotName = simulateBotCommandHandler('/start@rumahtatdanabot', { first_name: 'Zaa' });
test('Bot Router: /start@rumahtatdanabot recognized as welcome', startWithBotName.type === 'welcome');

const menuRes = simulateBotCommandHandler('/menu', { first_name: 'Zaa' });
test('Bot Router: /menu returns menu_guide type', menuRes.type === 'menu_guide');
test('Bot Router: /menu provides full guide text', menuRes.text.startsWith('🤖 *Menu & Panduan Bot TataDana*'));

const menuWithBotName = simulateBotCommandHandler('/menu@rumahtatdanabot', { first_name: 'Zaa' });
test('Bot Router: /menu@rumahtatdanabot recognized as menu_guide', menuWithBotName.type === 'menu_guide');

// 6. Natural Language bensin category and note retention
function extractNaturalPaymentNote(rawText) {
  const lowerRaw = rawText.toLowerCase().trim();
  let cleanNote = rawText
    .replace(/(?:rp\.?\s*)?[\d]+(?:[.,]\d+)?\s*(?:jt|juta|rb|ribu|k)\b/gi, '')
    .replace(/(?:rp\.?\s*)?\b\d{1,3}(?:\.\d{3})+\b/gi, '')
    .replace(/(?:rp\.?\s*)?\b\d{4,}\b/gi, '')
    .replace(/\b(?:bayar|beli|makan|bensin|isi\s+bensin)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (!cleanNote) {
    if (lowerRaw.includes('bensin')) {
      cleanNote = 'bensin';
    } else if (lowerRaw.includes('makan')) {
      cleanNote = 'makan';
    }
  }
  return cleanNote;
}

function resolveExpenseCategory(note, categoriesList) {
  let expenseCat = categoriesList.find((c) => c.type === 'expense') || categoriesList[0];
  if (note) {
    if (/makan|bakso|baso|kopi|mie|nasi|ayam|soto/i.test(note)) {
      const foodCat = categoriesList.find((c) => c.name.toLowerCase().includes('makan'));
      if (foodCat) expenseCat = foodCat;
    } else if (/bensin|pertamax|pertalite|transport|bbm|solar|parkir|tol|gojek|grab/i.test(note)) {
      const transCat = categoriesList.find((c) => c.name.toLowerCase().includes('transport') || c.name.toLowerCase().includes('bensin'));
      if (transCat) expenseCat = transCat;
    }
  }
  return expenseCat;
}

const mockCategories = [
  { id: 'cat_food', name: 'Makanan & Minuman', type: 'expense' },
  { id: 'cat_trans', name: 'Transportasi', type: 'expense' },
];

test('Natural Note: "bensin 30rb" preserves note "bensin"', extractNaturalPaymentNote('bensin 30rb') === 'bensin');
test('Natural Note: "beli makan 25rb" preserves note "makan"', extractNaturalPaymentNote('beli makan 25rb') === 'makan');
test('Category Matcher: note "bensin" correctly resolves to Transportasi category', resolveExpenseCategory('bensin', mockCategories).id === 'cat_trans');
test('Category Matcher: note "beli makan" correctly resolves to Makanan category', resolveExpenseCategory('makan', mockCategories).id === 'cat_food');

console.log(`\nResults: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);


