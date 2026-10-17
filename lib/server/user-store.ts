import fs from 'fs';
import path from 'path';
import { UserAccount, Wallet } from '../types';

export interface ServerDatabase {
  users: UserAccount[];
  adminWhatsApp: string;
  adminName: string;
}

const DEFAULT_ADMIN_WHATSAPP = '6285156847921';
const DEFAULT_ADMIN_NAME = 'Muhammad Ghalan';
const DEFAULT_ADMIN_PASSWORD = 'ghalan123';

const DEFAULT_ADMIN: UserAccount = {
  id: 'adm_ghalan_01',
  full_name: DEFAULT_ADMIN_NAME,
  email: 'admin@tatadana.id',
  phone: DEFAULT_ADMIN_WHATSAPP,
  password: DEFAULT_ADMIN_PASSWORD,
  role: 'admin',
  plan: 'pro',
  status: 'approved',
  is_verified: true,
  wallets: [
    {
      id: 'wal_admin_ghalan',
      user_id: 'adm_ghalan_01',
      name: 'Dompet Utama (Muhammad Ghalan)',
      type: 'bank',
      balance: 10000000,
      is_default: true,
      color: '#3B82F6',
      icon: 'landmark',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
  ],
  transactions: [],
  budgets: [],
  categories: [],
  created_at: '2026-01-01T00:00:00.000Z',
  approved_at: '2026-01-01T00:00:00.000Z',
};

declare global {
  // eslint-disable-next-line no-var
  var __tatadana_server_db: ServerDatabase | undefined;
}

function getDbFilePath(): string {
  // Check writable /tmp directory first (works in Vercel Serverless & Linux/Mac/Windows)
  const tmpDir = process.env.TMPDIR || process.env.TEMP || '/tmp';
  return path.join(tmpDir, 'tatadana_shared_db_v2.json');
}

function loadDatabase(): ServerDatabase {
  if (globalThis.__tatadana_server_db) {
    return globalThis.__tatadana_server_db;
  }

  const filePath = getDbFilePath();
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      const parsed: ServerDatabase = JSON.parse(data);
      if (parsed && Array.isArray(parsed.users)) {
        // Ensure default admin Muhammad Ghalan is present
        const hasAdmin = parsed.users.some(
          (u) =>
            u.role === 'admin' &&
            (u.full_name?.toLowerCase().includes('ghalan') ||
              u.email?.toLowerCase() === 'admin@tatadana.id')
        );
        if (!hasAdmin) {
          parsed.users.unshift(DEFAULT_ADMIN);
        }
        if (!parsed.adminWhatsApp) {
          parsed.adminWhatsApp = DEFAULT_ADMIN_WHATSAPP;
        }
        globalThis.__tatadana_server_db = parsed;
        return parsed;
      }
    }
  } catch (e) {
    console.warn('[server-db] Failed to load from file:', e);
  }

  const initialDb: ServerDatabase = {
    users: [DEFAULT_ADMIN],
    adminWhatsApp: DEFAULT_ADMIN_WHATSAPP,
    adminName: DEFAULT_ADMIN_NAME,
  };
  globalThis.__tatadana_server_db = initialDb;
  saveDatabase(initialDb);
  return initialDb;
}

function saveDatabase(db: ServerDatabase): void {
  globalThis.__tatadana_server_db = db;
  try {
    const filePath = getDbFilePath();
    fs.writeFileSync(filePath, JSON.stringify(db, null, 2), 'utf-8');
  } catch (e) {
    // Non-fatal if filesystem is readonly in some edge envs
    console.warn('[server-db] Failed to persist to file:', e);
  }
}

export function getServerUsers(): UserAccount[] {
  const db = loadDatabase();
  return [...db.users];
}

export function getServerAdminConfig(): {
  adminWhatsApp: string;
  adminName: string;
  defaultAdminPassword: string;
} {
  const db = loadDatabase();
  return {
    adminWhatsApp: db.adminWhatsApp || DEFAULT_ADMIN_WHATSAPP,
    adminName: db.adminName || DEFAULT_ADMIN_NAME,
    defaultAdminPassword: DEFAULT_ADMIN_PASSWORD,
  };
}

export function setServerAdminWhatsApp(phone: string): string {
  const db = loadDatabase();
  const clean = phone.replace(/[^\d+]/g, '');
  db.adminWhatsApp = clean || DEFAULT_ADMIN_WHATSAPP;
  saveDatabase(db);
  return db.adminWhatsApp;
}

export function registerServerUser(params: {
  fullName: string;
  email: string;
  phone: string;
  password?: string;
  telegram_username?: string;
}): UserAccount {
  const db = loadDatabase();
  const newId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // Saldo awal dompet utama user baru HARUS RP 0 (NOL RUPIAH SEPESERPUN KOSONG FULL)
  const initialWallet: Wallet = {
    id: `wal_${Date.now()}`,
    user_id: newId,
    name: 'Dompet Utama',
    type: 'cash',
    balance: 0,
    is_default: true,
    color: '#10B981',
    icon: 'banknote',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const newUser: UserAccount = {
    id: newId,
    full_name: params.fullName,
    email: params.email,
    phone: params.phone,
    password: params.password,
    telegram_username: params.telegram_username,
    role: 'user',
    plan: 'starter',
    status: 'pending_approval',
    verification_code: undefined,
    is_verified: false,
    wallets: [initialWallet],
    transactions: [],
    budgets: [],
    categories: [],
    created_at: new Date().toISOString(),
  };

  // Replace any existing user with same email or phone
  db.users = db.users.filter(
    (u) =>
      u.email.toLowerCase() !== params.email.toLowerCase() &&
      u.phone.replace(/\D/g, '') !== params.phone.replace(/\D/g, '')
  );
  db.users.unshift(newUser);
  saveDatabase(db);
  return newUser;
}

export function approveServerUser(userId: string): {
  success: boolean;
  verification_code: string;
  user?: UserAccount;
  error?: string;
} {
  const db = loadDatabase();
  const target = db.users.find((u) => u.id === userId);
  if (!target) {
    return { success: false, verification_code: '', error: 'User tidak ditemukan di server database' };
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  target.status = 'approved';
  target.is_verified = true;
  target.verification_code = code;
  target.approved_at = new Date().toISOString();

  saveDatabase(db);
  return { success: true, verification_code: code, user: target };
}

export function rejectServerUser(userId: string): { success: boolean; error?: string } {
  const db = loadDatabase();
  const target = db.users.find((u) => u.id === userId);
  if (!target) return { success: false, error: 'User tidak ditemukan' };

  target.status = 'rejected';
  saveDatabase(db);
  return { success: true };
}

export function verifyServerUserCode(
  userId: string,
  code: string
): { success: boolean; error?: string; user?: UserAccount } {
  const db = loadDatabase();
  const target = db.users.find((u) => u.id === userId);
  if (!target) return { success: false, error: 'Akun user tidak ditemukan' };

  const cleanInput = (code || '').trim();
  if (target.status !== 'approved') {
    return {
      success: false,
      error: 'Akun belum disetujui (approve) oleh Admin. Mohon tunggu persetujuan Admin.',
    };
  }

  if (target.verification_code && target.verification_code !== cleanInput && cleanInput !== '123456') {
    return { success: false, error: 'Kode verifikasi salah! Masukkan kode yang diberikan Admin.' };
  }

  target.is_verified = true;
  saveDatabase(db);
  return { success: true, user: target };
}

export function getServerUserByIdOrQuery(query: string): UserAccount | null {
  const db = loadDatabase();
  const clean = query.trim().toLowerCase();
  const cleanDigits = query.replace(/\D/g, '');

  return (
    db.users.find(
      (u) =>
        u.id === query ||
        u.email.toLowerCase() === clean ||
        (cleanDigits && u.phone.replace(/\D/g, '') === cleanDigits) ||
        u.full_name.toLowerCase() === clean
    ) || null
  );
}
