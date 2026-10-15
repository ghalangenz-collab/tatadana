# ⚡ TataDana

> **Catat keuangan semudah chat — langsung dari Telegram kamu.**
> Aplikasi SaaS FinTech personal finance Indonesia terintegrasi dengan Telegram Bot, AI Multi-Provider (Gemini, GPT, DeepSeek), Supabase Postgres RLS, dan Dark Mode premium.

---

## 🌟 Fitur Utama

1. **Telegram Bot Idempotent & Real-Time Sync**
   - 1 Bot Telegram digunakan bersama oleh seluruh pengguna dengan pengenalan nomor HP/chat ID.
   - Parsing natural language Bahasa Indonesia menggunakan LLM (`"beli bakso 15rb"`, `"gajian 5jt"`, `"bensin 50k"`, `"1.5jt"`).
   - Ekstraksi foto struk belanja (Vision AI) dengan itemized breakdown multi-item.
   - Input pesan suara / Voice Note dengan Speech-to-Text (`🎙️ Transkrip: "..."`).
   - Format reply bot lengkap dengan tanggal/jam WIB, nominal, kategori, dompet default, sisa saldo, visual progress bar budget (`████████░░ 82%`), dan rekomendasi AI Financial Advisor.
   - Idempotensi webhook melalui tracking `update_id` di database untuk mencegah pencatatan transaksi ganda saat Telegram me-retry request.

2. **Interactive Telegram Simulator di Dashboard & Landing Page**
   - Pengguna dan pengembang dapat langsung menguji coba percakapan natural, scan struk foto, pesan suara, dan perintah bot (`/saldo`, `/hari_ini`, `/bulan_ini`, `/budget`, `/sheet`, `/bantuan`) langsung di browser tanpa perlu set webhook publik terlebih dahulu.
   - Setiap mutasi dari simulator langsung meng-update saldo dompet, grafik, dan limit budget secara real-time.

3. **Multi-Wallet & Antar-Dompet**
   - Dukungan multi-rekening: Rekening Bank (BCA, Mandiri), E-Wallet (GoPay, OVO), Dompet Tunai (Cash), dan Akun Investasi (Bibit, Reksadana).
   - Satu dompet ditandai sebagai `Default Telegram` untuk auto-debit transaksi chat.
   - Fitur transfer saldo antar dompet dengan riwayat mutasi otomatis.

4. **Kategori Cerdas & Budgeting**
   - AI Onboarding Recommendation: Menghasilkan kategori awal yang disesuaikan dengan aktivitas dan gaya hidup pengguna saat registrasi.
   - Limit bulanan per kategori dengan indikator visual dan auto-alert saat mencapai 80% (Waspada) dan 100% (Batas Maksimal) via Telegram.

5. **Halaman Laporan Native & Export PDF / Excel (.xlsx)**
   - Filter rentang tanggal custom, jenis (pemasukan/pengeluaran/transfer), kategori, dompet, dan pencarian catatan.
   - Ringkasan statistik periode: Total Pemasukan, Total Pengeluaran, Net Cashflow, dan Top 5 Kategori Pengeluaran Terbesar.
   - Ekspor on-demand ke format Excel (.csv/.xlsx) dan PDF formal siap cetak.
   - Riwayat export tersimpan yang bisa diunduh ulang kapan saja.
   - Transaksi foto struk ditampilkan sebagai 1 baris utama dengan rincian item yang dapat di-expand.

6. **Dev / Mock Phone OTP Gateway**
   - Flow verifikasi nomor WhatsApp/HP dengan auto-generated OTP atau kode default dev `123456`.
   - Modul adapter siap dihubungkan ke gateway SMS/WhatsApp production (Fonnte, Wablas, Twilio, Qontak).

7. **Superadmin Portal**
   - Manajemen Multi-Provider AI (Gemini, OpenAI GPT-4o, DeepSeek): ganti API key, toggle status aktif, dan set primary/failover mode.
   - Audit Log AI: memantau waktu eksekusi, prompt, hasil JSON, latensi (ms), dan status keberhasilan.
   - Approval Pembayaran: validasi transaksi Midtrans dan bukti transfer bank manual untuk aktivasi paket Pro.
   - Manajemen user dan status langganan.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS (Dark Mode Premium: `#0D0F12`, Aksen Oranye `#FF6B00`, Kartu Abu Gelap `#14171D`)
- **Database & Auth**: Supabase (PostgreSQL + Supabase Auth + Supabase Storage)
- **Timezone**: Asia/Jakarta (WIB, UTC+7)
- **Icons**: Lucide React

---

## 📁 Struktur Direktori

```
tatadana/
├── app/
│   ├── admin/                    # Superadmin Portal (AI Providers, Logs, Approvals)
│   ├── api/
│   │   ├── admin/                # API AI Providers & Payments Approval
│   │   ├── auth/otp/             # API Phone OTP Gateway
│   │   ├── export/               # API Laporan Export History
│   │   ├── telegram/
│   │   │   ├── setup/            # Endpoint pendaftaran webhook bot (@BotFather)
│   │   │   ├── simulate/         # Endpoint Interactive Chat Simulator
│   │   │   ├── test/             # Endpoint uji koneksi getMe
│   │   │   └── webhook/          # Public Telegram Webhook Endpoint
│   │   └── transactions/         # API CRUD transaksi & transfer
│   ├── dashboard/
│   │   ├── budgets/              # Halaman Manajemen Budget & Alert Limit
│   │   ├── reports/              # Halaman Native Laporan & Export PDF/Excel
│   │   ├── settings/             # Halaman Pengaturan (Bot, Profil, Reminder, Kategori)
│   │   ├── simulator/            # Halaman Dedicated Telegram Chat Simulator
│   │   ├── transactions/         # Halaman Tabel Transaksi Lengkap & Filter
│   │   ├── wallets/              # Halaman Multi-Dompet & Transfer
│   │   └── page.tsx              # Overview Dashboard (Stats Cards, Charts, Recent Tx)
│   ├── login/                    # Halaman Masuk (WhatsApp OTP & Email)
│   ├── register/                 # Halaman Daftar (AI Category Onboarding)
│   ├── globals.css               # Styling tema dark mode premium & glassmorphism
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Landing Page Komprehensif
├── components/
│   ├── auth/PhoneOTPModal.tsx    # Modal verifikasi OTP WhatsApp dengan Dev Code
│   ├── dashboard/                # Komponen Dashboard (Sidebar, Header, Charts, Tables)
│   ├── simulator/                # Komponen Interactive Telegram Chat Simulator
│   └── ui/                       # Komponen Dasar (Button, Badge, Modal, Card)
├── lib/
│   ├── ai/                       # Parser Natural Language, Vision Struk, Speech, Advisor
│   ├── export/                   # Generator Excel CSV & PDF Printable View
│   ├── mock/                     # Seed Data FinTech Indonesia
│   ├── otp/                      # Service Phone OTP
│   ├── store/                    # Demo Store Reaktif untuk simulasi instan
│   ├── supabase/                 # Supabase SSR & Admin Clients
│   ├── telegram/                 # Service & Telegram Bot API
│   └── types/                    # Definisi Interface TypeScript Lengkap
├── supabase/
│   └── migrations/               # Skema Database PostgreSQL, Triggers, & RLS
├── tests/                        # Test suite parser & core logic
├── .env.example                  # Template konfigurasi environment variables
└── README.md
```

---

## ⚙️ Panduan Setup & Menjalankan

### 1. Salin Environment Variables
```bash
cp .env.example .env.local
```
Sesuaikan nilai konfigurasi:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

TELEGRAM_BOT_TOKEN=your-telegram-bot-token
WEBHOOK_BASE_URL=https://your-domain.vercel.app

GEMINI_API_KEY=your-gemini-key
OPENAI_API_KEY=your-openai-key
DEEPSEEK_API_KEY=your-deepseek-key

MIDTRANS_SERVER_KEY=your-midtrans-server-key
MIDTRANS_CLIENT_KEY=your-midtrans-client-key
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=your-midtrans-client-key
```

### 2. Jalankan Migrasi Database Supabase
Jalankan file SQL di `supabase/migrations/20261013000000_init_tatadana.sql` melalui **Supabase SQL Editor** pada dashboard Supabase kamu. File ini secara otomatis membuat:
- Seluruh tabel (`profiles`, `wallets`, `categories`, `budgets`, `transactions`, `telegram_updates`, `ai_providers`, `ai_logs`, `subscriptions`, `report_exports`).
- Trigger otomatis untuk sinkronisasi saldo dompet saat transaksi dibuat/dihapus.
- Trigger otomatis untuk memastikan hanya 1 dompet default aktif per user.
- Policy Row-Level Security (RLS) untuk keamanan data.
- Kategori awal dan konfigurasi default AI provider.

### 3. Install Dependensi & Jalankan Aplikasi
```bash
npm install
npm run dev
```
Buka browser di [http://localhost:3000](http://localhost:3000).

---

## 📱 Panduan Bot Telegram & Penggunaan

1. Buka halaman **Pengaturan > Tab Telegram Bot** di dashboard.
2. Masukkan token dari `@BotFather` lalu klik **Test Koneksi** dan **Set Webhook**.
3. Di chat Telegram, ketik contoh transaksi:
   - `beli bakso 15rb`
   - `bensin pertamax 50k`
   - `gajian 15jt`
   - Kirim foto struk minimarket
   - Kirim voice note rekaman suara
4. Gunakan perintah bot cepat:
   - `/saldo` — Cek saldo seluruh dompet
   - `/hari_ini` — Rekap mutasi hari ini
   - `/minggu_ini` — Rekap 7 hari terakhir
   - `/bulan_ini` — Rekap bulan berjalan & breakdown kategori
   - `/budget` — Status pemakaian budget
   - `/sheet` — Tautan laporan dan download data
   - `/bantuan` — Panduan lengkap perintah bot

---

## 🔒 Keamanan & Lisensi

- Data keuangan dilindungi oleh Supabase Row-Level Security (RLS).
- Kunci API LLM tersimpan terenkripsi dan dikelola melalui Superadmin Dashboard.
- Seluruh transaksi disesuaikan dengan zona waktu resmi Indonesia: **WIB (Asia/Jakarta)**.
