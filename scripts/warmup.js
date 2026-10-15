/**
 * TataDana Server Warmup & Pre-Compiler ("Boost 5 Menit")
 * Pings critical Next.js routes right after server launch so pages are
 * pre-compiled in background before user opens their browser.
 */

const http = require('http');

const PORT = 3000;
const HOST = '127.0.0.1';
const ROUTES = [
  '/',
  '/login',
  '/register',
  '/dashboard',
  '/dashboard/transactions',
  '/dashboard/wallets',
  '/dashboard/simulator',
  '/dashboard/budgets',
  '/dashboard/reports',
];
const MAX_WAIT_MS = 180000; // 3 minutes max wait for server to come online
const RETRY_INTERVAL_MS = 1500;
const SOCKET_TIMEOUT_MS = 45000; // 45s socket timeout for slow cold JIT compiles

function pingRoute(path) {
  return new Promise((resolve) => {
    let resolved = false;
    const safeResolve = (val) => {
      if (!resolved) {
        resolved = true;
        resolve(val);
      }
    };

    const req = http.get(
      {
        hostname: HOST,
        port: PORT,
        path: path,
        timeout: SOCKET_TIMEOUT_MS,
        headers: {
          'User-Agent': 'TataDana-Warmup-Bot/1.0',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      },
      (res) => {
        // Consume data so socket closes cleanly
        res.on('data', () => {});
        res.on('end', () => {
          console.log(`[Warmup] Route ${path} -> Status ${res.statusCode}`);
          safeResolve(true);
        });
      }
    );

    req.on('error', () => {
      safeResolve(false);
    });

    req.on('timeout', () => {
      req.destroy();
      safeResolve(false);
    });
  });
}

async function waitForServer() {
  const startTime = Date.now();
  console.log(`[Warmup] Menunggu server TataDana siap di http://${HOST}:${PORT}...`);

  while (Date.now() - startTime < MAX_WAIT_MS) {
    const isUp = await pingRoute('/');
    if (isUp) {
      console.log('[Warmup] Server aktif! Memulai pre-kompilasi halaman TataDana...');
      return true;
    }
    await new Promise((r) => setTimeout(r, RETRY_INTERVAL_MS));
  }

  console.warn('[Warmup] Timeout menunggu server aktif.');
  return false;
}

async function run() {
  const ready = await waitForServer();
  if (!ready) {
    console.error('[Warmup] Gagal melakukan warmup karena server belum merespon.');
    process.exit(1);
  }

  for (const route of ROUTES) {
    if (route === '/') continue; // already compiled during waitForServer
    console.log(`[Warmup] Meng-cache halaman ${route}...`);
    await pingRoute(route);
  }

  console.log('[Warmup] Pre-kompilasi selesai. Semua route TataDana siap diakses secara instan tanpa lag!');
  process.exit(0);
}

run();
