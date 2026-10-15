# Setup Autostart & Akses Instan Localhost TataDana ("Boost 5 Menit")

Dokumen ini menjelaskan konfigurasi dan cara kerja autostart background untuk aplikasi **TataDana (Next.js 14)** di Windows.

---

## 🚀 Keunggulan Solusi Ini

1. **Otomatis Aktif Saat Laptop Dinyalakan (Boot / Restart):**
   Tidak perlu lagi membuka terminal / command prompt atau mengetik `npm run dev` secara manual setiap kali menghidupkan laptop.
2. **100% Senyap (Silent Background):**
   Menggunakan VBScript wrapper (`WshShell.Run "%COMSPEC% /c ...", 0, False`) sehingga **tidak ada jendela CMD hitam yang muncul** mengganggu layar saat Windows dinyalakan.
3. **Fitur Boost / Pre-Compile Warmup (Akses Instan Tanpa Lag):**
   Next.js biasanya lambat saat halaman pertama dibuka karena harus melakukan kompilasi rute saat di-request (JIT). Script `warmup.js` otomatis mem-fetch rute-rute utama (`/`, `/login`, `/dashboard`, `/dashboard/transactions`, `/dashboard/wallets`, `/dashboard/simulator`, dll.) segera setelah server hidup di background. Ketika Anda membuka browser, seluruh halaman inti sudah terkompilasi dan langsung tampil instan tanpa perlu refresh-refresh lagi.
4. **Bebas Ketergantungan PATH Global:**
   Script otomatis menyertakan folder Node.js portabel:
   `C:\Users\Performance Edition\.gemini\antigravity\scratch\tools\node-v20.18.0-win-x64`
   ke dalam `PATH` lokal proses secara deterministik.
5. **Dukungan Desktop Standar & OneDrive:**
   Installer otomatis mendeteksi apakah Desktop pengguna berada di direktori lokal (`%USERPROFILE%\Desktop`) atau disinkronkan oleh OneDrive (`%USERPROFILE%\OneDrive\Desktop`), sehingga shortcut dipastikan muncul di layar.

---

## 📂 Daftar File Script di `scripts/`

| Nama File | Fungsi |
|---|---|
| [`pasang-autostart-dan-desktop.bat`](file:///C:/Users/Performance%20Edition/.gemini/antigravity/scratch/tatadana/scripts/pasang-autostart-dan-desktop.bat) | **Installer 1-Klik:** Menyalin script ke Startup Windows & shortcut ke Desktop pengguna, serta langsung menyalakan server. |
| [`TataDana-Autostart.vbs`](file:///C:/Users/Performance%20Edition/.gemini/antigravity/scratch/tatadana/scripts/TataDana-Autostart.vbs) | Script yang dipasang di folder Startup Windows pengguna (`shell:startup`). |
| [`tatadana-silent.vbs`](file:///C:/Users/Performance%20Edition/.gemini/antigravity/scratch/tatadana/scripts/tatadana-silent.vbs) | Script VBS peluncur senyap tanpa jendela console. |
| [`autostart-tatadana.bat`](file:///C:/Users/Performance%20Edition/.gemini/antigravity/scratch/tatadana/scripts/autostart-tatadana.bat) | Mesin utama: Mengatur environment Node, memeriksa port 3000, menyalakan Next.js dev server, bridge polling Telegram, dan memicu warmup. |
| [`warmup.js`](file:///C:/Users/Performance%20Edition/.gemini/antigravity/scratch/tatadana/scripts/warmup.js) | Worker node yang mem-ping localhost:3000 untuk memicu kompilasi halaman secara background. |
| [`buka-tatadana.bat`](file:///C:/Users/Performance%20Edition/.gemini/antigravity/scratch/tatadana/scripts/buka-tatadana.bat) | Shortcut pengguna untuk membuka browser ke `http://localhost:3000`. Jika server belum aktif, otomatis menyalakannya lebih dulu. |
| [`hentikan-tatadana.bat`](file:///C:/Users/Performance%20Edition/.gemini/antigravity/scratch/tatadana/scripts/hentikan-tatadana.bat) | Shortcut pengguna untuk mematikan server port 3000 dan proses Node background secara bersih. |
| [`hapus-autostart-dan-desktop.bat`](file:///C:/Users/Performance%20Edition/.gemini/antigravity/scratch/tatadana/scripts/hapus-autostart-dan-desktop.bat) | Script pencopotan (uninstaller) jika sewaktu-waktu ingin menonaktifkan autostart. |

---

## 🛠️ Cara Memasang (Cukup 1 Kali)

1. Buka folder:
   `C:\Users\Performance Edition\.gemini\antigravity\scratch\tatadana\scripts\`
2. Klik 2x pada file:
   **`pasang-autostart-dan-desktop.bat`**
3. Selesai! File autostart akan terpasang di:
   `C:\Users\Performance Edition\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\TataDana-Autostart.vbs`
   dan shortcut akan tersedia di Desktop:
   - `Buka TataDana.bat`
   - `Hentikan TataDana.bat`

---

## 🖥️ Cara Penggunaan Harian

- **Ketika Menghidupkan Laptop:**
  Anda tidak perlu melakukan apa pun. Windows akan otomatis menjalankan server TataDana di background saat login.
- **Membuka Web TataDana:**
  Klik 2x file **`Buka TataDana.bat`** di Desktop Anda, atau langsung buka browser dan ketik `http://localhost:3000`.
- **Mematikan Server (Jika Sedang Tidak Dipakai):**
  Klik 2x file **`Hentikan TataDana.bat`** di Desktop Anda.
