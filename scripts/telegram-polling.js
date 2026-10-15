/**
 * TataDana Telegram Bot Polling Bridge for Localhost
 *
 * Allows receiving real-time Telegram messages on localhost without needing
 * public domain webhooks or tunnels (ngrok / cloudflare).
 *
 * Usage:
 *   node scripts/telegram-polling.js [optional_bot_token]
 */

const fs = require('fs');
const path = require('path');

// 1. Load environment variables from .env.local if not already set
function loadEnv() {
  const envPath = path.resolve(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    content.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [key, ...rest] = trimmed.split('=');
        const value = rest.join('=').trim().replace(/^["']|["']$/g, '');
        if (!process.env[key.trim()]) {
          process.env[key.trim()] = value;
        }
      }
    });
  }
}

loadEnv();

const BOT_TOKEN = process.argv[2] || process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_LOCAL_URL = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/telegram/webhook`
  : 'http://localhost:3000/api/telegram/webhook';

if (!BOT_TOKEN) {
  console.error('\n❌ Error: TELEGRAM_BOT_TOKEN is not configured.');
  console.error('Please provide token in .env.local or pass it as an argument:');
  console.error('  node scripts/telegram-polling.js <BOT_TOKEN>\n');
  process.exit(1);
}

let isRunning = true;
let currentOffset = 0;

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  const data = await res.json();
  return data;
}

async function init() {
  console.log('='.repeat(60));
  console.log('⚡ TataDana Telegram Bot Polling Service (Localhost Mode)');
  console.log('='.repeat(60));

  const isDemo = BOT_TOKEN.startsWith('demo_') || BOT_TOKEN.includes('demo');

  if (isDemo) {
    console.log('ℹ️  Mode Demo Aktif: Token saat ini adalah placeholder demo.');
    console.log('🤖 Bot Simulasi: @tatadana_bot (TataDana Finance Bot)');
    console.log('💡 Untuk menghubungkan bot Telegram asli Anda:');
    console.log('   1. Buat bot di Telegram lewat @BotFather (/newbot)');
    console.log('   2. Masukkan HTTP API Token ke .env.local: TELEGRAM_BOT_TOKEN=<token>');
    console.log('   3. Atau jalankan langsung: node scripts/telegram-polling.js <token>\n');
    console.log(`📡 Local Webhook Target: ${WEBHOOK_LOCAL_URL}`);
    console.log('⌨️  [Interactive Mode] Anda dapat mengetik pesan transaksi langsung di sini');
    console.log('   (cth: "beli bakso 15rb", "gajian 10jt", "/saldo") dan tekan Enter:\n');

    startConsoleInputLoop();
    return;
  }

  // 1. Verify Real Bot Token
  try {
    const meRes = await fetchJson(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`);
    if (!meRes.ok) {
      console.error(`❌ Bot Token Invalid: ${meRes.description}`);
      console.error('Pastikan token yang dimasukkan valid dari @BotFather.');
      process.exit(1);
    }
    const bot = meRes.result;
    console.log(`🤖 Bot Verified: @${bot.username} (${bot.first_name}) [ID: ${bot.id}]`);
    console.log(`🔗 Chat langsung di Telegram: https://t.me/${bot.username}`);
  } catch (err) {
    console.error('❌ Gagal menghubungi Telegram API:', err.message);
    process.exit(1);
  }

  // 2. Remove existing webhook to prevent 409 conflict
  try {
    console.log('🧹 Menghapus webhook lama dari Telegram untuk mengaktifkan long polling...');
    const delRes = await fetchJson(`https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook?drop_pending_updates=false`);
    if (delRes.ok) {
      console.log('✅ Webhook Telegram berhasil dinonaktifkan. Mode getUpdates aktif!');
    } else {
      console.warn('⚠️ Webhook delete status:', delRes.description);
    }
  } catch (err) {
    console.warn('⚠️ Gagal reset webhook:', err.message);
  }

  console.log(`📡 Local Webhook Target: ${WEBHOOK_LOCAL_URL}`);
  console.log('🚀 Mendengarkan pesan live dari pengguna Telegram...\n');

  // Start polling loop
  pollLoop();
}

function startConsoleInputLoop() {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.setPrompt('tatadana-bot > ');
  rl.prompt();

  rl.on('line', async (line) => {
    const text = line.trim();
    if (!text) {
      rl.prompt();
      return;
    }

    if (text === 'exit' || text === 'quit') {
      console.log('Sampai jumpa!');
      process.exit(0);
    }

    console.log(`📨 Mengirim pesan simulasi ke localhost webhook: "${text}"...`);
    const mockUpdate = {
      update_id: Date.now(),
      message: {
        message_id: Math.floor(Math.random() * 10000),
        from: { id: 748192837, is_bot: false, first_name: 'Budi', username: 'budi_pratama' },
        chat: { id: 748192837, first_name: 'Budi', type: 'private' },
        date: Math.floor(Date.now() / 1000),
        text,
      },
    };

    try {
      const hookRes = await fetch(WEBHOOK_LOCAL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockUpdate),
      });

      if (hookRes.ok) {
        console.log('   ✅ Pesan berhasil diproses oleh TataDana engine');
      } else {
        const errText = await hookRes.text();
        console.warn(`   ⚠️ Local app status ${hookRes.status}: ${errText.slice(0, 100)}`);
      }
    } catch (err) {
      console.warn(`   ⚠️ Tidak dapat menghubungi localhost (${WEBHOOK_LOCAL_URL}). Pastikan Next.js berjalan.`);
    }

    rl.prompt();
  });
}

async function pollLoop() {
  while (isRunning) {
    try {
      const url = `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=${currentOffset}&timeout=5&limit=20`;
      const data = await fetchJson(url);

      if (data.ok && Array.isArray(data.result)) {
        for (const update of data.result) {
          currentOffset = Math.max(currentOffset, update.update_id + 1);

          const msg = update.message || update.edited_message;
          if (!msg) continue;

          const sender = msg.from ? `@${msg.from.username || msg.from.first_name}` : 'Unknown';
          const chatId = msg.chat?.id;
          const text = msg.text || (msg.photo ? '[Foto Struk]' : msg.voice ? '[Voice Note]' : '[Media]');

          console.log(`\n📨 [${new Date().toLocaleTimeString('id-ID')}] Incoming from ${sender} (Chat ID: ${chatId}): "${text}"`);

          // Forward update to local Next.js webhook handler
          try {
            const hookRes = await fetch(WEBHOOK_LOCAL_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(update),
            });

            if (hookRes.ok) {
              console.log(`   ✅ Processed & replied via TataDana engine`);
            } else {
              const errText = await hookRes.text();
              console.warn(`   ⚠️ Local app responded status ${hookRes.status}: ${errText.slice(0, 100)}`);
            }
          } catch (forwardErr) {
            console.warn(`   ⚠️ Could not reach localhost server (${WEBHOOK_LOCAL_URL}). Ensure Next.js is running.`);
          }
        }
      } else if (!data.ok) {
        if (data.error_code === 409) {
          console.warn('⚠️ Conflict 409: Webhook is still active. Removing webhook again...');
          await fetchJson(`https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook`);
          await sleep(2000);
        } else {
          console.warn('⚠️ Telegram API response not ok:', data.description);
          await sleep(2000);
        }
      }
    } catch (err) {
      console.error('⚠️ Polling error:', err.message);
      await sleep(3000);
    }
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping Telegram Polling Service...');
  isRunning = false;
  process.exit(0);
});

process.on('SIGTERM', () => {
  isRunning = false;
  process.exit(0);
});

init();
