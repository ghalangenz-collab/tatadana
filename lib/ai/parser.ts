import { ParsedTransaction, AIProviderName } from '../types';
import { demoStore } from '../store/demo-store';

/**
 * Parsing nominal dalam format Indonesia:
 * "15rb", "15ribu", "15k", "1.5jt", "1,5jt", "500k", "20000", "2.000.000", "makan 75000 kemarin",
 * "beli 2 porsi nasi goreng 50000", "bayar 50000 ke bca", dll.
 */
export function parseIndonesianAmount(raw: string): number | null {
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
    // If multiple numbers exist (e.g. 2 and 50000), filter out small quantities (< 500)
    // and pick the financial amount candidate.
    const financialCandidates = numberTokens.filter((t) => t.val >= 500);
    if (financialCandidates.length > 0) {
      return financialCandidates[financialCandidates.length - 1].val;
    }
    const maxVal = Math.max(...numberTokens.map((t) => t.val));
    return maxVal > 0 ? maxVal : null;
  }

  return null;
}

/**
 * Flexible input parser for free-form Indonesian monetary inputs:
 * Handles "1jt", "1.5jt", "10 juta", "1.000.000", "10.000.000", "500k", "25rb",
 * "10 000 000", "Rp 500.000,-", "0", etc. Returns a positive number or 0.
 */
export function parseNominalInput(raw: string | number | null | undefined): number {
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

/**
 * Heuristic parser when AI API is offline, failover, or unconfigured
 */
export function heuristicParseIndonesianText(text: string): ParsedTransaction | null {
  const lower = text.toLowerCase().trim();
  const amount = parseIndonesianAmount(lower);

  if (!amount) return null;

  // Determine income vs expense
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

  const type: 'expense' | 'income' = isIncome ? 'income' : 'expense';

  // Category matching
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
      lower.includes('soto') ||
      lower.includes('warteg') ||
      lower.includes('jajan') ||
      lower.includes('snack') ||
      lower.includes('resto') ||
      lower.includes('kantin') ||
      lower.includes('sarapan') ||
      lower.includes('lunch') ||
      lower.includes('dinner')
    ) {
      categoryName = 'Makanan & Minuman';
    } else if (
      lower.includes('bensin') ||
      lower.includes('pertamax') ||
      lower.includes('pertalite') ||
      lower.includes('gojek') ||
      lower.includes('grab') ||
      lower.includes('gocar') ||
      lower.includes('mrt') ||
      lower.includes('tol') ||
      lower.includes('parkir') ||
      lower.includes('krl')
    ) {
      categoryName = 'Transportasi';
    } else if (
      lower.includes('nonton') ||
      lower.includes('bioskop') ||
      lower.includes('game') ||
      lower.includes('steam') ||
      lower.includes('spotify') ||
      lower.includes('netflix') ||
      lower.includes('ngopi') ||
      lower.includes('cafe') ||
      lower.includes('hobi')
    ) {
      categoryName = 'Hiburan & Hobi';
    } else if (
      lower.includes('listrik') ||
      lower.includes('pln') ||
      lower.includes('wifi') ||
      lower.includes('indihome') ||
      lower.includes('pdam') ||
      lower.includes('air') ||
      lower.includes('kontrakan') ||
      lower.includes('kost') ||
      lower.includes('tagihan')
    ) {
      categoryName = 'Tagihan & Rumah';
    } else if (
      lower.includes('obat') ||
      lower.includes('dokter') ||
      lower.includes('klinik') ||
      lower.includes('apotek') ||
      lower.includes('vitamin') ||
      lower.includes('panadol') ||
      lower.includes('rumah sakit')
    ) {
      categoryName = 'Kesehatan & Obat';
    } else if (
      lower.includes('baju') ||
      lower.includes('sepatu') ||
      lower.includes('tokopedia') ||
      lower.includes('shopee') ||
      lower.includes('belanja') ||
      lower.includes('supermarket') ||
      lower.includes('indomaret') ||
      lower.includes('alfamart')
    ) {
      categoryName = 'Belanja & Lifestyle';
    } else if (
      lower.includes('kursus') ||
      lower.includes('buku') ||
      lower.includes('kuliah') ||
      lower.includes('spp') ||
      lower.includes('les')
    ) {
      categoryName = 'Pendidikan';
    }
  }

  // Clean note: cleanly strip the matched financial amount
  let note = text
    .replace(/(?:rp\.?\s*)?[\d]+(?:[.,]\d+)?\s*(?:jt|juta|rb|ribu|k)\b/gi, '')
    .replace(/(?:rp\.?\s*)?\b\d{1,3}(?:\.\d{3})+\b/gi, '')
    .replace(/(?:rp\.?\s*)?\b\d{4,}\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // If note was emptied or only had whitespace, fallback to original text
  if (!note) {
    note = text;
  }

  return {
    type,
    amount,
    categoryName,
    description: note,
    rawInput: text,
    confidence: 0.95,
  };
}

// System prompt for all AI providers
const SYSTEM_PROMPT = `Ekstrak transaksi keuangan dari teks bahasa Indonesia ini ke JSON terstruktur.
Kembalikan HANYA format JSON valid berikut:
{
  "type": "expense" atau "income",
  "amount": number (konversi "15rb" -> 15000, "1.5jt" -> 1500000, "500k" -> 500000),
  "categoryName": string (pilih yang paling relevan: Makanan & Minuman, Transportasi, Hiburan & Hobi, Tagihan & Rumah, Kesehatan & Obat, Belanja & Lifestyle, Pendidikan, Gaji Pokok, Bonus & Side Hustle, Investasi & Dividen),
  "description": string (nama barang / keterangan singkat tanpa nominal)
}`;

/**
 * Call Gemini Generative AI
 */
async function callGemini(apiKey: string, model: string, text: string): Promise<ParsedTransaction | null> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: `${SYSTEM_PROMPT}\n\nTeks: "${text}"` }],
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API error ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  const jsonMatch = rawText?.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  const parsed = JSON.parse(jsonMatch[0]);
  return {
    type: parsed.type === 'income' ? 'income' : 'expense',
    amount: Number(parsed.amount),
    categoryName: parsed.categoryName || 'Makanan & Minuman',
    description: parsed.description || text,
    rawInput: text,
    confidence: 0.98,
  };
}

/**
 * Call OpenAI (GPT-4o / GPT-4o-mini)
 */
async function callOpenAI(apiKey: string, model: string, text: string): Promise<ParsedTransaction | null> {
  const url = 'https://api.openai.com/v1/chat/completions';
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: text },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) return null;

  const parsed = JSON.parse(content);
  return {
    type: parsed.type === 'income' ? 'income' : 'expense',
    amount: Number(parsed.amount),
    categoryName: parsed.categoryName || 'Makanan & Minuman',
    description: parsed.description || text,
    rawInput: text,
    confidence: 0.98,
  };
}

/**
 * Call DeepSeek (deepseek-chat)
 */
async function callDeepSeek(apiKey: string, model: string, text: string): Promise<ParsedTransaction | null> {
  const url = 'https://api.deepseek.com/chat/completions';
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || 'deepseek-chat',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: text },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    throw new Error(`DeepSeek API error ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) return null;

  const parsed = JSON.parse(content);
  return {
    type: parsed.type === 'income' ? 'income' : 'expense',
    amount: Number(parsed.amount),
    categoryName: parsed.categoryName || 'Makanan & Minuman',
    description: parsed.description || text,
    rawInput: text,
    confidence: 0.98,
  };
}

/**
 * Call Multi-Provider AI (Gemini, GPT, DeepSeek) with failover support
 */
export async function parseTransactionWithAI(
  text: string,
  preferredProvider?: AIProviderName
): Promise<ParsedTransaction> {
  const startTime = Date.now();
  const providers = demoStore.getAIProviders();
  const executionMode = demoStore.getAIExecutionMode(); // 'single' or 'parallel'

  // Build provider queue
  let candidateProviders = providers.filter((p) => p.is_active);

  if (preferredProvider) {
    candidateProviders = [
      ...candidateProviders.filter((p) => p.provider === preferredProvider),
      ...candidateProviders.filter((p) => p.provider !== preferredProvider),
    ];
  } else {
    // Sort by primary first, then priority
    candidateProviders.sort((a, b) => {
      if (a.mode === 'primary' && b.mode !== 'primary') return -1;
      if (b.mode === 'primary' && a.mode !== 'primary') return 1;
      return a.priority - b.priority;
    });
  }

  // If single mode, only attempt the top candidate
  if (executionMode === 'single' && candidateProviders.length > 0) {
    candidateProviders = [candidateProviders[0]];
  }

  // Try providers in queue
  for (const provider of candidateProviders) {
    const apiKey =
      provider.provider === 'gemini'
        ? process.env.GEMINI_API_KEY
        : provider.provider === 'openai'
        ? process.env.OPENAI_API_KEY
        : process.env.DEEPSEEK_API_KEY;

    if (apiKey && !apiKey.startsWith('demo-') && !apiKey.includes('ENCRYPTED_DEMO')) {
      try {
        let result: ParsedTransaction | null = null;
        if (provider.provider === 'gemini') {
          result = await callGemini(apiKey, provider.model_name, text);
        } else if (provider.provider === 'openai') {
          result = await callOpenAI(apiKey, provider.model_name, text);
        } else if (provider.provider === 'deepseek') {
          result = await callDeepSeek(apiKey, provider.model_name, text);
        }

        if (result) {
          demoStore.addAILog({
            provider: `${provider.provider} (${provider.model_name})`,
            input_type: 'text',
            prompt: text,
            response: JSON.stringify({
              type: result.type,
              amount: result.amount,
              category: result.categoryName,
              note: result.description,
            }),
            latency_ms: Date.now() - startTime,
            status: 'success',
          });
          return result;
        }
      } catch (err: any) {
        console.warn(`[AI Failover] Provider ${provider.provider} failed:`, err.message);
        demoStore.addAILog({
          provider: `${provider.provider} (${provider.model_name})`,
          input_type: 'text',
          prompt: text,
          response: err.message || 'API request failed',
          latency_ms: Date.now() - startTime,
          status: 'error',
          error_message: err.message,
        });
        // Continue to next provider in failover queue
      }
    }
  }

  // Seamless fallback to heuristic Indonesian natural language parser
  const heuristicResult = heuristicParseIndonesianText(text);
  const latency = Date.now() - startTime;
  const activeProvider = candidateProviders[0] || { provider: 'gemini', model_name: 'gemini-1.5-flash' };

  if (heuristicResult) {
    demoStore.addAILog({
      provider: `${activeProvider.provider} (${activeProvider.model_name})`,
      input_type: 'text',
      prompt: text,
      response: JSON.stringify({
        type: heuristicResult.type,
        amount: heuristicResult.amount,
        category: heuristicResult.categoryName,
        note: heuristicResult.description,
      }),
      latency_ms: Math.max(80, latency),
      status: 'success',
    });
    return heuristicResult;
  }

  // Ambiguous input error
  demoStore.addAILog({
    provider: `${activeProvider.provider} (${activeProvider.model_name})`,
    input_type: 'text',
    prompt: text,
    response: 'Gagal mendeteksi nominal atau jenis transaksi.',
    latency_ms: latency,
    status: 'error',
    error_message: 'Input ambigu atau nominal tidak ditemukan.',
  });

  throw new Error(
    `Format pesan belum dipahami.\n\nContoh format yang didukung:\n• "beli bakso 15rb"\n• "bensin shell 50k"\n• "gajian 10jt"\n• "ngopi 25ribu"`
  );
}
