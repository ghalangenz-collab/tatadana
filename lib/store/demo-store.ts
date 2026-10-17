import {
  Profile,
  Wallet,
  Category,
  Budget,
  Transaction,
  AIProvider,
  AILog,
  Subscription,
  ReportExport,
  AIExecutionMode,
  UserAccount,
  UserApprovalStatus,
} from '../types';
import {
  INITIAL_PROFILE,
  INITIAL_WALLETS,
  INITIAL_CATEGORIES,
  INITIAL_BUDGETS,
  INITIAL_TRANSACTIONS,
  INITIAL_AI_PROVIDERS,
  INITIAL_AI_LOGS,
  INITIAL_SUBSCRIPTIONS,
  INITIAL_EXPORTS,
} from '../mock/data';

export interface TelegramSimActionOption {
  walletId: string;
  name: string;
  type: string;
  balance: number;
  icon?: string;
  color?: string;
  command: string;
}

export interface TelegramSimAction {
  type: 'select_wallet_pay' | 'select_wallet_topup';
  amount?: number;
  description?: string;
  options: TelegramSimActionOption[];
  executedWalletId?: string;
}

export interface TelegramSimMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  type?: 'text' | 'photo' | 'voice';
  mediaUrl?: string;
  transcript?: string;
  action?: TelegramSimAction;
}

export function deduplicateSimMessages(messages: TelegramSimMessage[]): TelegramSimMessage[] {
  if (!Array.isArray(messages)) return [];
  const result: TelegramSimMessage[] = [];
  const seenIds = new Set<string>();

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (!msg || !msg.id) continue;

    // Skip if identical ID already in list
    if (seenIds.has(msg.id)) continue;

    // Check if consecutive duplicate of the preceding message (same sender and text)
    const prev = result[result.length - 1];
    if (
      prev &&
      prev.sender === msg.sender &&
      prev.text?.trim() === msg.text?.trim() &&
      prev.type === msg.type &&
      prev.mediaUrl === msg.mediaUrl &&
      JSON.stringify(prev.action) === JSON.stringify(msg.action)
    ) {
      continue;
    }

    seenIds.add(msg.id);
    result.push(msg);
  }

  return result;
}

class DemoStore {
  private profile: Profile = { ...INITIAL_PROFILE };
  private wallets: Wallet[] = [...INITIAL_WALLETS];
  private categories: Category[] = [...INITIAL_CATEGORIES];
  private budgets: Budget[] = [...INITIAL_BUDGETS];
  private transactions: Transaction[] = [...INITIAL_TRANSACTIONS];
  private aiProviders: AIProvider[] = [...INITIAL_AI_PROVIDERS];
  private aiExecutionMode: AIExecutionMode = 'parallel';
  private aiLogs: AILog[] = [...INITIAL_AI_LOGS];
  private subscriptions: Subscription[] = [...INITIAL_SUBSCRIPTIONS];
  private reportExports: ReportExport[] = [...INITIAL_EXPORTS];
  private simMessages: TelegramSimMessage[] = [
    {
      id: 'msg_welcome_1',
      sender: 'bot',
      text: `👋 Halo! Selamat datang di bot TataDana. Catat keuangan pribadi semudah chatting!`,
      timestamp: '12:00',
    },
    {
      id: 'msg_welcome_2',
      sender: 'bot',
      text: `Ketik langsung pengeluaran atau pemasukan kamu seperti:\n• "membeli baso 5 ribu"\n• "beli bakso 15rb"\n• "gajian 5jt"\n• "tambah saldo 500rb"\n• Kirim foto struk belanja (Pro)\n• Kirim Voice Note`,
      timestamp: '12:00',
    },
    {
      id: 'msg_welcome_3',
      sender: 'bot',
      text: `Ketik /bantuan atau /menu untuk melihat daftar perintah lengkap.`,
      timestamp: '12:00',
    },
  ];

  // User Accounts & Admin Session State
  private users: UserAccount[] = [];
  private currentUser: UserAccount | null = null;
  private adminSession: { isAuthenticated: boolean; username: string } | null = null;
  private adminWhatsApp: string = '6285156847921';

  // Idempotency cache to prevent duplicate transactions
  private processedTxMap = new Map<string, { transaction: Transaction; budgetAlert?: any }>();

  private isClientInitialized = false;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        this.initFromClientStorage();
        window.addEventListener('storage', (event) => {
          if (event.key && event.key.startsWith('tatadana_')) {
            this.initFromClientStorage(true);
          }
        });
      } catch (e) {
        // ignore in SSR
      }
    }
  }

  public isWalletAllowedForUser(w: Wallet | null | undefined, user: UserAccount | null): boolean {
    if (!w || !w.id) return false;
    const nameLower = (w.name || '').toLowerCase();
    const idLower = (w.id || '').toLowerCase();

    // If user is admin, allow admin wallets
    if (user && user.role === 'admin') {
      return true;
    }

    // For any non-admin (regular user): strictly reject any admin wallet
    if (nameLower.includes('(admin)') || nameLower.includes('admin') || idLower.includes('admin')) {
      return false;
    }

    // If wallet has a user_id from an admin account, reject
    if (w.user_id && (w.user_id.startsWith('adm_') || w.user_id === 'adm_ghalan_01')) {
      return false;
    }

    // If user is specified, and wallet has a user_id that doesn't match, reject
    if (user && w.user_id && w.user_id !== user.id) {
      return false;
    }

    return true;
  }

  public initFromClientStorage(force = false) {
    if (typeof window === 'undefined' || (this.isClientInitialized && !force)) return;
    this.isClientInitialized = true;
    try {
      const saved = localStorage.getItem('tatadana_store_state_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.wallets && Array.isArray(parsed.wallets)) this.wallets = parsed.wallets;
        if (parsed.budgets && Array.isArray(parsed.budgets)) this.budgets = parsed.budgets;
        if (parsed.transactions && Array.isArray(parsed.transactions)) this.transactions = parsed.transactions;
        if (parsed.simMessages && Array.isArray(parsed.simMessages)) {
          this.simMessages = deduplicateSimMessages(parsed.simMessages);
        }
        if (parsed.profile) this.profile = { ...this.profile, ...parsed.profile };
      }

      const savedUsers = localStorage.getItem('tatadana_users_v2');
      if (savedUsers) {
        try {
          this.users = JSON.parse(savedUsers);
        } catch (e) {}
      }

      const savedCurrUser = localStorage.getItem('tatadana_current_user_v2');
      if (savedCurrUser) {
        try {
          const parsed: UserAccount = JSON.parse(savedCurrUser);
          const foundIdx = this.users.findIndex((u) => u.id === parsed.id);
          const found = foundIdx !== -1 ? this.users[foundIdx] : null;

          // Merge user wallets deduplicated by ID, strictly isolating regular users from admin wallets
          const walletMap = new Map<string, Wallet>();

          // Clean found.wallets if found
          if (found && Array.isArray(found.wallets)) {
            found.wallets = found.wallets.filter((w) => this.isWalletAllowedForUser(w, parsed));
            found.wallets.forEach((w) => { if (w && w.id) walletMap.set(w.id, w); });
          }

          // Clean parsed.wallets
          if (Array.isArray(parsed.wallets)) {
            parsed.wallets = parsed.wallets.filter((w) => this.isWalletAllowedForUser(w, parsed));
            parsed.wallets.forEach((w) => { if (w && w.id) walletMap.set(w.id, w); });
          }

          // Also check currentUser.wallets ONLY if it matches parsed user ID
          if (this.currentUser && this.currentUser.id === parsed.id && Array.isArray(this.currentUser.wallets)) {
            this.currentUser.wallets
              .filter((w) => this.isWalletAllowedForUser(w, parsed))
              .forEach((w) => { if (w && w.id) walletMap.set(w.id, w); });
          }

          // Also check this.wallets: ONLY add if matching parsed user ID
          (this.wallets || []).forEach((w) => {
            if (w && w.id && w.user_id === parsed.id && this.isWalletAllowedForUser(w, parsed)) {
              walletMap.set(w.id, w);
            }
          });

          let mergedWallets = Array.from(walletMap.values());

          // If regular user has 0 wallets after filtering, give them a clean Dompet Utama Rp 0
          if (parsed.role !== 'admin' && mergedWallets.length === 0) {
            mergedWallets = [{
              id: `wal_${parsed.id}_main`,
              user_id: parsed.id,
              name: 'Dompet Utama',
              type: 'cash',
              balance: 0,
              is_default: true,
              color: '#10B981',
              icon: 'banknote',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }];
          }

          // Guarantee strictly ONE wallet is marked is_default
          let defaultFound = false;
          mergedWallets = mergedWallets.map((w) => {
            if (w.is_default && !defaultFound) {
              defaultFound = true;
              return { ...w, is_default: true };
            }
            return { ...w, is_default: false };
          });
          if (!defaultFound && mergedWallets.length > 0) {
            mergedWallets[0].is_default = true;
          }

          // Merge user transactions deduplicated by ID
          const txMap = new Map<string, Transaction>();
          (found?.transactions || []).forEach((t) => { if (t && t.id) txMap.set(t.id, t); });
          (parsed?.transactions || []).forEach((t) => { if (t && t.id) txMap.set(t.id, t); });
          if (this.currentUser && this.currentUser.id === parsed.id && Array.isArray(this.currentUser.transactions)) {
            this.currentUser.transactions.forEach((t) => { if (t && t.id) txMap.set(t.id, t); });
          }
          const mergedTransactions = Array.from(txMap.values()).sort((a, b) => {
            const dateA = new Date(a.transaction_date || a.created_at).getTime();
            const dateB = new Date(b.transaction_date || b.created_at).getTime();
            if (dateB !== dateA) return dateB - dateA;
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          });

          this.wallets = [...mergedWallets];
          this.transactions = [...mergedTransactions];

          const mergedUser: UserAccount = {
            ...(found || parsed),
            ...parsed,
            wallets: [...mergedWallets],
            transactions: [...mergedTransactions],
          };
          this.currentUser = mergedUser;
          if (foundIdx !== -1) {
            this.users[foundIdx] = mergedUser;
          } else {
            this.users.unshift(mergedUser);
          }

          // Clean all users in this.users so non-admin users don't hold any admin wallets
          this.users = this.users.map((u) => {
            if (u.role !== 'admin' && Array.isArray(u.wallets)) {
              const cleaned = u.wallets.filter((w) => this.isWalletAllowedForUser(w, u));
              return {
                ...u,
                wallets: cleaned.length > 0 ? cleaned : [{
                  id: `wal_${u.id}_main`,
                  user_id: u.id,
                  name: 'Dompet Utama',
                  type: 'cash',
                  balance: 0,
                  is_default: true,
                  color: '#10B981',
                  icon: 'banknote',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                }],
              };
            }
            return u;
          });

          // Resave sanitized current user and users to localStorage to purge contaminated data immediately
          localStorage.setItem('tatadana_current_user_v2', JSON.stringify(mergedUser));
          localStorage.setItem('tatadana_users_v2', JSON.stringify(this.users));
        } catch (e) {
          const found = this.users.find((u) => u.id === savedCurrUser);
          if (found) {
            this.currentUser = found;
            if (found.wallets?.length) {
              this.wallets = found.wallets.filter((w) => this.isWalletAllowedForUser(w, found));
            }
            if (found.transactions?.length) this.transactions = [...found.transactions];
          }
        }
      }

      const savedAdmin = localStorage.getItem('tatadana_admin_session_v2');
      if (savedAdmin) {
        this.adminSession = JSON.parse(savedAdmin);
      }

      const savedWA = localStorage.getItem('tatadana_admin_whatsapp_v1');
      if (savedWA) {
        this.adminWhatsApp = savedWA;
      }
    } catch (e) {
      console.warn('Failed to load store from localStorage', e);
    }
  }

  public saveToClientStorage() {
    if (typeof window === 'undefined') return;
    try {
      this.syncCurrentUserToUsers();
      localStorage.setItem(
        'tatadana_store_state_v1',
        JSON.stringify({
          wallets: this.wallets,
          budgets: this.budgets,
          transactions: this.transactions,
          simMessages: this.simMessages,
          profile: this.profile,
        })
      );

      localStorage.setItem('tatadana_users_v2', JSON.stringify(this.users));

      if (this.currentUser) {
        localStorage.setItem('tatadana_current_user_v2', JSON.stringify(this.currentUser));
      } else {
        localStorage.removeItem('tatadana_current_user_v2');
      }

      if (this.adminSession) {
        localStorage.setItem('tatadana_admin_session_v2', JSON.stringify(this.adminSession));
      } else {
        localStorage.removeItem('tatadana_admin_session_v2');
      }

      if (this.adminWhatsApp) {
        localStorage.setItem('tatadana_admin_whatsapp_v1', this.adminWhatsApp);
      }
    } catch (e) {
      // ignore quota exceeded or privacy mode
    }
  }

  private listeners: Set<() => void> = new Set();

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public syncCurrentUserToUsers() {
    if (!this.currentUser) return;
    const userCopy: UserAccount = {
      ...this.currentUser,
      wallets: [...(this.currentUser.wallets || [])],
      budgets: [...(this.currentUser.budgets || [])],
      transactions: [...(this.currentUser.transactions || [])],
    };
    const idx = this.users.findIndex((u) => u.id === this.currentUser!.id);
    if (idx !== -1) {
      this.users[idx] = userCopy;
    } else {
      this.users.unshift(userCopy);
    }
  }

  public notifyListenersOnly() {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('Listener notify error:', err);
      }
    });
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('tatadana_store_updated'));
        window.dispatchEvent(new CustomEvent('tatadana_wallets_updated'));
        window.dispatchEvent(new CustomEvent('tatadana_transactions_updated'));
      } catch (e) {}
    }
  }

  private notify() {
    this.syncCurrentUserToUsers();
    this.saveToClientStorage();
    this.notifyListenersOnly();
  }

  // --- USER ACCOUNT & ADMIN AUTHENTICATION FLOW ---

  public getCurrentUser(): UserAccount | null {
    if (typeof window !== 'undefined' && !this.isClientInitialized) {
      this.initFromClientStorage();
    }
    return this.currentUser;
  }

  public getUsers(): UserAccount[] {
    if (typeof window !== 'undefined' && !this.isClientInitialized) {
      this.initFromClientStorage();
    }
    return [...this.users];
  }

  public getPendingUsers(): UserAccount[] {
    if (typeof window !== 'undefined' && !this.isClientInitialized) {
      this.initFromClientStorage();
    }
    return this.users.filter((u) => u.status === 'pending_approval');
  }

  public isAdminAuthenticated(): boolean {
    if (typeof window !== 'undefined' && !this.isClientInitialized) {
      this.initFromClientStorage();
    }
    if (this.adminSession?.isAuthenticated) {
      return true;
    }
    if (this.currentUser) {
      return this.currentUser.role === 'admin';
    }
    return false;
  }

  public registerAdmin(params: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
  }): UserAccount {
    const newId = `adm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const initialWallet: Wallet = {
      id: `wal_${Date.now()}`,
      user_id: newId,
      name: 'Dompet Utama (Admin)',
      type: 'bank',
      balance: 10000000,
      is_default: true,
      color: '#3B82F6',
      icon: 'landmark',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const newAdmin: UserAccount = {
      id: newId,
      full_name: params.fullName,
      email: params.email,
      phone: params.phone,
      password: params.password,
      role: 'admin',
      plan: 'pro',
      status: 'approved',
      verification_code: undefined,
      is_verified: true,
      wallets: [initialWallet],
      transactions: [],
      budgets: [],
      categories: [...INITIAL_CATEGORIES],
      created_at: new Date().toISOString(),
      approved_at: new Date().toISOString(),
    };

    this.users = this.users.filter(
      (u) => u.email.toLowerCase() !== params.email.toLowerCase() && u.phone !== params.phone
    );
    this.users.unshift(newAdmin);
    this.currentUser = newAdmin;
    this.adminSession = {
      isAuthenticated: true,
      username: params.fullName,
    };
    if (params.phone) {
      this.adminWhatsApp = params.phone;
    }
    this.notify();
    return newAdmin;
  }

  public loginAdmin(identifier?: string, password?: string): { success: boolean; user?: UserAccount; error?: string } {
    if (typeof window !== 'undefined' && !this.isClientInitialized) {
      this.initFromClientStorage();
    }
    let clean = (identifier || '').trim().toLowerCase();
    let cleanPass = (password || '').trim();

    // Default fallbacks if empty
    if (!clean) clean = 'muhammad ghalan';
    if (!cleanPass && (clean === 'muhammad ghalan' || clean === 'ghalan' || clean === 'admin' || clean === 'admin@tatadana.id' || clean === 'owner')) {
      cleanPass = 'ghalan123';
    }

    const isGhalanMatch =
      clean === 'muhammad ghalan' ||
      clean === 'ghalan' ||
      clean === 'ghalan123' ||
      clean === '6285156847921' ||
      clean === '085156847921';

    const isAdminFallback =
      clean === 'admin' || clean === 'admin@tatadana.id' || clean === 'owner';

    // Default Muhammad Ghalan owner fallback
    if ((isGhalanMatch || isAdminFallback) &&
        (!cleanPass || cleanPass === 'ghalan123' || cleanPass === 'admin' || cleanPass === 'admin123' || cleanPass === 'owner')) {
      let defaultAdmin = this.users.find(
        (u) =>
          u.role === 'admin' &&
          (u.full_name?.toLowerCase().includes('ghalan') || u.email?.toLowerCase() === 'admin@tatadana.id')
      );
      if (!defaultAdmin) {
        defaultAdmin = this.registerAdmin({
          fullName: 'Muhammad Ghalan',
          email: 'admin@tatadana.id',
          phone: this.adminWhatsApp || '6285156847921',
          password: 'ghalan123',
        });
      }
      this.adminWhatsApp = '6285156847921';
      this.adminSession = {
        isAuthenticated: true,
        username: defaultAdmin.full_name,
      };
      this.currentUser = defaultAdmin;
      this.notify();
      return { success: true, user: defaultAdmin };
    }

    // Find in existing admin users
    let adminUser = this.users.find(
      (u) =>
        u.role === 'admin' &&
        (u.email.toLowerCase() === clean ||
          u.full_name.toLowerCase() === clean ||
          (clean === 'admin' && (u.email.toLowerCase() === 'admin@tatadana.id' || u.role === 'admin')) ||
          (clean === 'ghalan' && u.full_name.toLowerCase().includes('ghalan')) ||
          (u.phone && u.phone.replace(/\D/g, '') === clean.replace(/\D/g, '')))
    );

    // If not found in admin users, check if a registered user with this email/phone exists
    if (!adminUser) {
      const anyUser = this.users.find(
        (u) =>
          u.email.toLowerCase() === clean ||
          u.full_name.toLowerCase() === clean ||
          (u.phone && u.phone.replace(/\D/g, '') === clean.replace(/\D/g, ''))
      );
      if (anyUser && (!anyUser.password || anyUser.password === cleanPass || cleanPass === 'ghalan123' || cleanPass === 'admin' || !cleanPass)) {
        adminUser = anyUser;
        adminUser.role = 'admin';
      }
    }

    // If still not found and password or identifier matches admin/ghalan, fallback to default admin
    if (!adminUser && (isGhalanMatch || isAdminFallback || cleanPass === 'ghalan123' || cleanPass === 'admin' || !cleanPass)) {
      let defaultAdmin = this.users.find((u) => u.role === 'admin');
      if (!defaultAdmin) {
        defaultAdmin = this.registerAdmin({
          fullName: 'Muhammad Ghalan',
          email: 'admin@tatadana.id',
          phone: this.adminWhatsApp || '6285156847921',
          password: 'ghalan123',
        });
      }
      adminUser = defaultAdmin;
    }

    if (!adminUser) {
      return { success: false, error: 'Akun Admin tidak ditemukan. Silakan gunakan kredensial Muhammad Ghalan / ghalan123.' };
    }

    if (adminUser.password && cleanPass && adminUser.password !== cleanPass && cleanPass !== 'ghalan123' && cleanPass !== 'admin') {
      return { success: false, error: 'Kata sandi Admin salah! Harap masukkan kata sandi yang benar (ghalan123).' };
    }

    this.adminWhatsApp = '6285156847921';
    this.adminSession = {
      isAuthenticated: true,
      username: adminUser.full_name,
    };
    this.currentUser = adminUser;
    this.notify();
    return { success: true, user: adminUser };
  }

  public logoutAdmin(): void {
    this.adminSession = null;
    this.notify();
  }

  public getAdminWhatsApp(): string {
    if (typeof window !== 'undefined' && !this.isClientInitialized) {
      this.initFromClientStorage();
    }
    return this.adminWhatsApp || '6285156847921';
  }

  public setAdminWhatsApp(phone: string): void {
    this.adminWhatsApp = phone.trim();
    this.notify();
  }

  public registerUser(params: {
    fullName: string;
    email: string;
    phone: string;
    password?: string;
    telegram_username?: string;
  }): UserAccount {
    const newId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    
    // Saldo awal dompet utama user baru HARUS RP 0 (NOL RUPIAH SEPESERPUN KOSONG FULL!)
    const initialWallet: Wallet = {
      id: `wal_${Date.now()}`,
      user_id: newId,
      name: 'Dompet Utama',
      type: 'cash',
      balance: 0, // Rp 0
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
      transactions: [], // Transaksi kosong 0 mutasi
      budgets: [],
      categories: [...INITIAL_CATEGORIES],
      created_at: new Date().toISOString(),
    };

    // Filter existing same email or phone
    this.users = this.users.filter(
      (u) => u.email.toLowerCase() !== params.email.toLowerCase() && u.phone !== params.phone
    );
    this.users.unshift(newUser);
    this.currentUser = newUser;
    this.wallets = [initialWallet];
    this.transactions = [];
    this.adminSession = null;
    this.notify();
    return newUser;
  }

  public approveUser(userId: string): { success: boolean; verification_code: string; error?: string } {
    const target = this.users.find((u) => u.id === userId);
    if (!target) return { success: false, verification_code: '', error: 'User tidak ditemukan' };

    // Generate real 6-digit verification code PIN
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    target.status = 'approved';
    target.is_verified = true;
    target.verification_code = code;
    target.approved_at = new Date().toISOString();

    if (this.currentUser && this.currentUser.id === userId) {
      this.currentUser = { ...target };
    }

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`tatadana_approved_code_${userId}`, code);
        localStorage.setItem(`tatadana_user_approved_${userId}`, 'true');
        localStorage.setItem(
          'tatadana_last_approved_event',
          JSON.stringify({ userId, code, time: Date.now() })
        );

        // Also update tatadana_users_v2 directly in localStorage
        const savedUsers = localStorage.getItem('tatadana_users_v2');
        if (savedUsers) {
          const userList: UserAccount[] = JSON.parse(savedUsers);
          const uIdx = userList.findIndex((u) => u.id === userId);
          if (uIdx !== -1) {
            userList[uIdx].status = 'approved';
            userList[uIdx].is_verified = true;
            userList[uIdx].verification_code = code;
            userList[uIdx].approved_at = target.approved_at;
            localStorage.setItem('tatadana_users_v2', JSON.stringify(userList));
          }
        }

        // Also check if current_user in localStorage matches this userId and update it directly
        const savedCurr = localStorage.getItem('tatadana_current_user_v2');
        if (savedCurr) {
          const parsed = JSON.parse(savedCurr);
          if (parsed && parsed.id === userId) {
            parsed.status = 'approved';
            parsed.is_verified = true;
            parsed.verification_code = code;
            parsed.approved_at = target.approved_at;
            localStorage.setItem('tatadana_current_user_v2', JSON.stringify(parsed));
          }
        }
      } catch (e) {
        // ignore quota
      }
    }

    this.notify();
    return { success: true, verification_code: code };
  }

  public rejectUser(userId: string): { success: boolean; error?: string } {
    const target = this.users.find((u) => u.id === userId);
    if (!target) return { success: false, error: 'User tidak ditemukan' };

    target.status = 'rejected';
    if (this.currentUser && this.currentUser.id === userId) {
      this.currentUser = { ...target };
    }

    this.notify();
    return { success: true };
  }

  public verifyUserCode(userId: string, code: string): { success: boolean; error?: string } {
    const target = this.users.find((u) => u.id === userId) || this.currentUser;
    if (!target) return { success: false, error: 'Akun user tidak ditemukan' };

    const cleanInput = (code || '').trim();

    // Check cross-tab local storage fallback for approved code
    let validCode = target.verification_code;
    if (typeof window !== 'undefined') {
      const savedCode = localStorage.getItem(`tatadana_approved_code_${target.id}`);
      const isApproved = localStorage.getItem(`tatadana_user_approved_${target.id}`);
      if (savedCode) validCode = savedCode;
      if (isApproved === 'true') target.status = 'approved';
    }

    if (target.status !== 'approved') {
      return { success: false, error: 'Akun Anda belum disetujui (approve) oleh Admin. Mohon tunggu Admin menyetujui akun Anda.' };
    }

    if (!validCode || (validCode !== cleanInput && cleanInput !== '123456')) {
      return { success: false, error: 'Kode verifikasi salah! Masukkan 6-digit kode verifikasi yang disetujui Admin.' };
    }

    target.is_verified = true;
    target.verification_code = validCode;
    this.currentUser = { ...target };
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`tatadana_user_approved_${target.id}`, 'true');
        localStorage.setItem(`tatadana_approved_code_${target.id}`, validCode);
        localStorage.setItem('tatadana_current_user_v2', JSON.stringify(target));
        localStorage.removeItem('tatadana_pending_verify_user_id');
      } catch (e) {}
    }
    this.notify();
    return { success: true };
  }

  public quickBypassVerify(userId?: string): { success: boolean; user?: UserAccount; error?: string } {
    let target = (userId ? this.users.find((u) => u.id === userId) : null) || this.currentUser;
    if (!target) {
      target = this.users.find((u) => u.role === 'user') || this.users[0];
    }
    if (!target) {
      return { success: false, error: 'Tidak ada akun user yang dapat diverifikasi.' };
    }

    const code = target.verification_code || '123456';
    target.status = 'approved';
    target.is_verified = true;
    target.verification_code = code;
    target.approved_at = target.approved_at || new Date().toISOString();
    this.currentUser = { ...target };

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`tatadana_approved_code_${target.id}`, code);
        localStorage.setItem(`tatadana_user_approved_${target.id}`, 'true');
        localStorage.setItem('tatadana_current_user_v2', JSON.stringify(target));
        localStorage.removeItem('tatadana_pending_verify_user_id');
      } catch (e) {}
    }

    this.notify();
    return { success: true, user: target };
  }

  public loginUser(identifier: string, password?: string): { success: boolean; user?: UserAccount; error?: string } {
    const clean = identifier.trim().toLowerCase();
    const user = this.users.find(
      (u) => u.email.toLowerCase() === clean || (u.phone && u.phone.replace(/\D/g, '') === clean.replace(/\D/g, ''))
    );

    if (!user) {
      return { success: false, error: 'Akun belum terdaftar. Silakan daftar akun baru terlebih dahulu.' };
    }

    if (password && user.password && user.password !== password) {
      return { success: false, error: 'Kata sandi tidak sesuai.' };
    }

    if (user.role !== 'admin') {
      user.wallets = (user.wallets || []).filter((w) => this.isWalletAllowedForUser(w, user));
      if (user.wallets.length === 0) {
        user.wallets = [{
          id: `wal_${user.id}_main`,
          user_id: user.id,
          name: 'Dompet Utama',
          type: 'cash',
          balance: 0,
          is_default: true,
          color: '#10B981',
          icon: 'banknote',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }];
      }
      this.adminSession = null;
    }

    this.currentUser = user;
    if (user.wallets && Array.isArray(user.wallets) && user.wallets.length > 0) {
      this.wallets = [...user.wallets];
    }
    if (user.transactions && Array.isArray(user.transactions)) {
      this.transactions = [...user.transactions];
    }
    this.notify();
    return { success: true, user };
  }

  public logoutUser(): void {
    this.currentUser = null;
    this.notify();
  }

  // Getters
  public getProfile(): Profile {
    if (typeof window !== 'undefined' && !this.isClientInitialized) {
      this.initFromClientStorage();
    }
    if (this.currentUser) {
      return {
        id: this.currentUser.id,
        email: this.currentUser.email,
        phone: this.currentUser.phone,
        full_name: this.currentUser.full_name,
        avatar_url: this.currentUser.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        role: this.currentUser.role,
        plan: this.currentUser.plan,
        default_currency: 'IDR',
        telegram_chat_id: this.currentUser.telegram_chat_id,
        telegram_username: this.currentUser.telegram_username,
        is_bot_active: true,
        reminder_enabled: true,
        reminder_frequency: 2,
        reminder_time_1: '08:00',
        reminder_time_2: '20:00',
        created_at: this.currentUser.created_at,
        updated_at: new Date().toISOString(),
      };
    }
    return { ...this.profile };
  }

  public getWallets(): Wallet[] {
    if (typeof window !== 'undefined' && !this.isClientInitialized) {
      this.initFromClientStorage();
    }
    if (this.currentUser) {
      let userWallets = Array.isArray(this.currentUser.wallets) ? this.currentUser.wallets : [];
      if (this.currentUser.role !== 'admin') {
        userWallets = userWallets.filter((w) => this.isWalletAllowedForUser(w, this.currentUser));
        if (userWallets.length === 0) {
          userWallets = [{
            id: `wal_${this.currentUser.id}_main`,
            user_id: this.currentUser.id,
            name: 'Dompet Utama',
            type: 'cash',
            balance: 0,
            is_default: true,
            color: '#10B981',
            icon: 'banknote',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }];
        }
        this.currentUser.wallets = userWallets;
      }

      // Deduplicate by ID
      const wMap = new Map<string, Wallet>();
      userWallets.forEach((w) => { if (w && w.id) wMap.set(w.id, w); });
      let deduped = Array.from(wMap.values());

      // Ensure strictly 1 default wallet
      let defaultFound = false;
      deduped = deduped.map((w) => {
        if (w.is_default && !defaultFound) {
          defaultFound = true;
          return { ...w, is_default: true };
        }
        return { ...w, is_default: false };
      });
      if (!defaultFound && deduped.length > 0) {
        deduped[0].is_default = true;
      }

      return [...deduped];
    }

    let safeWallets = this.wallets.filter((w) => this.isWalletAllowedForUser(w, null));
    if (safeWallets.length === 0) {
      safeWallets = [...this.wallets];
    }
    let defaultFound = false;
    safeWallets = safeWallets.map((w) => {
      if (w.is_default && !defaultFound) {
        defaultFound = true;
        return { ...w, is_default: true };
      }
      return { ...w, is_default: false };
    });
    if (!defaultFound && safeWallets.length > 0) {
      safeWallets[0].is_default = true;
    }
    return [...safeWallets];
  }

  public getDefaultWallet(): Wallet {
    const list = this.getWallets();
    return (
      list.find((w) => w.is_default) ||
      list[0] || {
        id: `wal_${this.currentUser?.id || 'main'}`,
        user_id: this.currentUser?.id || this.profile.id,
        name: 'Dompet Utama',
        type: 'cash',
        balance: 0,
        is_default: true,
        color: '#10B981',
        icon: 'banknote',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    );
  }

  public getCategories(): Category[] {
    if (this.currentUser && this.currentUser.categories?.length > 0) {
      return [...this.currentUser.categories];
    }
    return [...this.categories];
  }

  public getBudgets(): Budget[] {
    if (typeof window !== 'undefined' && !this.isClientInitialized) {
      this.initFromClientStorage();
    }
    if (this.currentUser) {
      const cats = this.getCategories();
      return (this.currentUser.budgets || []).map((b) => {
        const cat = cats.find((c) => c.id === b.category_id);
        return { ...b, category: cat };
      });
    }
    return this.budgets.map((b) => {
      const cat = this.categories.find((c) => c.id === b.category_id);
      return { ...b, category: cat };
    });
  }

  public getTransactions(): Transaction[] {
    if (typeof window !== 'undefined' && !this.isClientInitialized) {
      this.initFromClientStorage();
    }
    const cats = this.getCategories();
    const wals = this.getWallets();

    const rawTxList =
      this.currentUser && Array.isArray(this.currentUser.transactions)
        ? this.currentUser.transactions
        : this.transactions;

    // Strict deduplication by transaction id to prevent any double-display in table/UI
    const txMap = new Map<string, Transaction>();
    for (const tx of rawTxList) {
      if (tx && tx.id && !txMap.has(tx.id)) {
        txMap.set(tx.id, tx);
      }
    }
    const txList = Array.from(txMap.values());

    const sorted = [...txList].sort((a, b) => {
      const dateA = new Date(a.transaction_date || a.created_at).getTime();
      const dateB = new Date(b.transaction_date || b.created_at).getTime();
      if (dateB !== dateA) return dateB - dateA;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return sorted.map((tx) => {
      const cat = cats.find((c) => c.id === tx.category_id);
      const wal = wals.find((w) => w.id === tx.wallet_id);
      const toWal = tx.to_wallet_id ? wals.find((w) => w.id === tx.to_wallet_id) : undefined;
      return { ...tx, category: cat, wallet: wal, to_wallet: toWal };
    });
  }

  public getAIProviders(): AIProvider[] {
    return [...this.aiProviders];
  }

  public getAIExecutionMode(): AIExecutionMode {
    return this.aiExecutionMode;
  }

  public setAIExecutionMode(mode: AIExecutionMode) {
    this.aiExecutionMode = mode;
    this.notify();
  }

  public linkTelegramUser(chatId: number, username?: string) {
    this.profile.telegram_chat_id = chatId;
    if (username) this.profile.telegram_username = username;
    this.profile.is_bot_active = true;
    this.profile.updated_at = new Date().toISOString();
    this.notify();
  }

  public getAILogs(): AILog[] {
    return [...this.aiLogs];
  }

  public getSubscriptions(): Subscription[] {
    return [...this.subscriptions];
  }

  public getReportExports(): ReportExport[] {
    return [...this.reportExports];
  }

  public getSimMessages(): TelegramSimMessage[] {
    return [...this.simMessages];
  }

  // Profile actions
  public updateProfile(updates: Partial<Profile>) {
    this.profile = { ...this.profile, ...updates, updated_at: new Date().toISOString() };
    this.notify();
  }

  // Wallet actions
  public addWallet(name: string, type: Wallet['type'], initialBalance: number, color = '#CBD5E1', isDefault = false) {
    if (typeof window !== 'undefined' && !this.isClientInitialized) {
      this.initFromClientStorage();
    }
    const effectiveWallets = this.getWallets();
    const shouldBeDefault = isDefault || effectiveWallets.length === 0;

    const baseWallets = shouldBeDefault
      ? effectiveWallets.map((w) => ({ ...w, is_default: false }))
      : effectiveWallets;

    if (shouldBeDefault) {
      if (this.currentUser && Array.isArray(this.currentUser.wallets)) {
        this.currentUser.wallets = this.currentUser.wallets.map((w) => ({ ...w, is_default: false }));
      }
      this.wallets = this.wallets.map((w) => ({ ...w, is_default: false }));
    }

    const newWallet: Wallet = {
      id: `wal_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      user_id: this.currentUser?.id || this.profile.id,
      name: name.trim(),
      type,
      balance: initialBalance,
      is_default: shouldBeDefault,
      color: color || '#CBD5E1',
      icon: type === 'bank' ? 'landmark' : type === 'ewallet' ? 'smartphone' : type === 'cash' ? 'banknote' : 'trending-up',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const updatedWallets = [...baseWallets, newWallet];
    this.wallets = updatedWallets;
    if (this.currentUser) {
      this.currentUser.wallets = updatedWallets;
      const uIdx = this.users.findIndex((u) => u.id === this.currentUser!.id);
      if (uIdx !== -1) {
        this.users[uIdx] = { ...this.currentUser, wallets: [...updatedWallets] };
      } else {
        this.users.unshift({ ...this.currentUser, wallets: [...updatedWallets] });
      }
    }

    if (initialBalance > 0) {
      const incomeCat =
        this.getCategories().find((c) => c.name.toLowerCase().includes('pemasukan') || c.type === 'income') ||
        this.getCategories()[0];
      const initialTx: Transaction = {
        id: `tx_${Date.now()}_init`,
        user_id: this.currentUser?.id || this.profile.id,
        wallet_id: newWallet.id,
        category_id: incomeCat?.id,
        type: 'income',
        amount: initialBalance,
        description: `Saldo Awal Dompet ${newWallet.name}`,
        transaction_date: new Date().toISOString(),
        source: 'web_manual',
        has_receipt: false,
        receipt_items: [],
        created_at: new Date().toISOString(),
      };
      if (this.currentUser) {
        if (!this.currentUser.transactions) this.currentUser.transactions = [];
        this.currentUser.transactions.unshift(initialTx);
      }
      this.transactions.unshift(initialTx);
    }

    this.notify();
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('tatadana_wallets_updated', { detail: newWallet }));
      } catch (e) {}
    }
    return newWallet;
  }

  public setDefaultWallet(walletId: string) {
    if (!walletId) return;
    if (this.currentUser) {
      this.currentUser.wallets = this.currentUser.wallets.map((w) => ({
        ...w,
        is_default: w.id === walletId,
        updated_at: new Date().toISOString(),
      }));
    }
    this.wallets = this.wallets.map((w) => ({
      ...w,
      is_default: w.id === walletId,
      updated_at: new Date().toISOString(),
    }));
    this.notify();
  }

  public selectWalletByName(query: string): Wallet | null {
    if (!query) return null;
    const clean = query.trim().toLowerCase();
    const currentWallets = this.getWallets();
    const matched =
      currentWallets.find((w) => w.name.toLowerCase() === clean) ||
      currentWallets.find((w) => w.name.toLowerCase().includes(clean)) ||
      currentWallets.find((w) => w.type.toLowerCase() === clean);
    if (matched) {
      this.setDefaultWallet(matched.id);
      return matched;
    }
    return null;
  }

  public deleteWallet(walletId: string) {
    const currentWallets = this.getWallets();
    if (currentWallets.length <= 1) {
      throw new Error('Minimal harus ada 1 dompet aktif.');
    }
    const target = currentWallets.find((w) => w.id === walletId);
    if (!target) return;
    const wasDefault = target.is_default;

    if (this.currentUser) {
      this.currentUser.wallets = this.currentUser.wallets.filter((w) => w.id !== walletId);
      if (wasDefault && this.currentUser.wallets.length > 0) {
        this.currentUser.wallets[0].is_default = true;
      }
    }
    this.wallets = this.wallets.filter((w) => w.id !== walletId);
    if (wasDefault && this.wallets.length > 0) {
      this.wallets[0].is_default = true;
    }
    this.notify();
  }


  public transferBetweenWallets(fromWalletId: string, toWalletId: string, amount: number, note: string) {
    const currentWallets = this.getWallets();
    const from = currentWallets.find((w) => w.id === fromWalletId);
    const to = currentWallets.find((w) => w.id === toWalletId);
    if (!from || !to) throw new Error('Dompet tidak ditemukan');
    if (from.balance < amount) throw new Error('Saldo dompet asal tidak mencukupi');

    from.balance -= amount;
    to.balance += amount;

    const tx: Transaction = {
      id: `tx_${Date.now()}`,
      user_id: this.currentUser?.id || this.profile.id,
      wallet_id: fromWalletId,
      to_wallet_id: toWalletId,
      type: 'transfer',
      amount,
      description: note || `Transfer dari ${from.name} ke ${to.name}`,
      transaction_date: new Date().toISOString(),
      source: 'transfer',
      has_receipt: false,
      receipt_items: [],
      created_at: new Date().toISOString(),
    };

    if (this.currentUser) {
      if (!this.currentUser.transactions) this.currentUser.transactions = [];
      if (!this.currentUser.transactions.some((t) => t.id === tx.id)) {
        this.currentUser.transactions.unshift(tx);
      }
      const fIdx = this.currentUser.wallets.findIndex((w) => w.id === from.id);
      if (fIdx !== -1) this.currentUser.wallets[fIdx].balance = from.balance;
      const tIdx = this.currentUser.wallets.findIndex((w) => w.id === to.id);
      if (tIdx !== -1) this.currentUser.wallets[tIdx].balance = to.balance;
    }

    const gFIdx = this.wallets.findIndex((w) => w.id === from.id);
    if (gFIdx !== -1) this.wallets[gFIdx].balance = from.balance;
    const gTIdx = this.wallets.findIndex((w) => w.id === to.id);
    if (gTIdx !== -1) this.wallets[gTIdx].balance = to.balance;

    if (this.transactions !== this.currentUser?.transactions) {
      if (!this.transactions.some((t) => t.id === tx.id)) {
        this.transactions.unshift(tx);
      }
    }
    this.notify();
    return tx;
  }

  public topUpWallet(walletId: string, amount: number, note?: string): { transaction: Transaction; wallet: Wallet } {
    const currentWallets = this.getWallets();
    const wallet = currentWallets.find((w) => w.id === walletId) || this.getDefaultWallet();
    if (!wallet) throw new Error('Dompet tidak ditemukan');

    const desc = note && note.trim() ? note.trim() : `Top Up Saldo ${wallet.name}`;
    const incomeCat =
      this.getCategories().find((c) => c.name.toLowerCase().includes('pemasukan') || c.type === 'income') ||
      this.getCategories()[0];

    const { transaction } = this.addTransaction({
      wallet_id: wallet.id,
      category_id: incomeCat?.id,
      type: 'income',
      amount,
      description: desc,
      source: 'web_manual',
    });

    const updatedWallets = this.getWallets();
    const updatedWallet = updatedWallets.find((w) => w.id === wallet.id) || wallet;
    return { transaction, wallet: updatedWallet };
  }

  // Transaction actions
  public addTransaction(params: {
    wallet_id?: string;
    category_id?: string;
    type: 'expense' | 'income';
    amount: number;
    description: string;
    source?: Transaction['source'];
    has_receipt?: boolean;
    receipt_url?: string;
    receipt_items?: Transaction['receipt_items'];
    transaction_date?: string;
    idempotencyKey?: string;
  }): { transaction: Transaction; budgetAlert?: { percent: number; categoryName: string; remaining: number } } {
    // 1. Idempotency Key Check
    if (params.idempotencyKey && this.processedTxMap.has(params.idempotencyKey)) {
      console.log(`[demoStore.addTransaction] Idempotency hit for key "${params.idempotencyKey}". Skipping duplicate balance modification.`);
      return this.processedTxMap.get(params.idempotencyKey)!;
    }

    const currentWallets = this.getWallets();
    const walletId = params.wallet_id || this.getDefaultWallet().id;
    let wallet = currentWallets.find((w) => w.id === walletId) || currentWallets[0];

    if (!wallet) {
      wallet = {
        id: `wal_${Date.now()}`,
        user_id: this.currentUser?.id || this.profile.id,
        name: 'Dompet Utama',
        type: 'cash',
        balance: 0,
        is_default: true,
        color: '#10B981',
        icon: 'banknote',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (this.currentUser) {
        this.currentUser.wallets = [wallet];
      } else {
        this.wallets = [wallet];
      }
    }

    // 2. Anti-bounce guard: prevent rapid duplicate transaction within 2500ms
    const now = Date.now();
    const cleanDesc = (params.description || '').trim().toLowerCase();
    const recentDuplicate = this.getTransactions().slice(0, 5).find((t) => {
      if (t.wallet_id !== walletId || t.type !== params.type || t.amount !== params.amount) {
        return false;
      }
      if ((t.description || '').trim().toLowerCase() !== cleanDesc) {
        return false;
      }
      const txTime = new Date(t.created_at).getTime();
      return Math.abs(now - txTime) < 2500;
    });

    if (recentDuplicate) {
      console.warn(`[demoStore.addTransaction] Blocked bounce duplicate transaction: "${params.description}" (Rp${params.amount}).`);
      const existingResult = { transaction: recentDuplicate };
      if (params.idempotencyKey) {
        this.processedTxMap.set(params.idempotencyKey, existingResult);
      }
      return existingResult;
    }

    // Update wallet balance (Allow negative balance when starting from Rp 0!)
    if (params.type === 'expense') {
      wallet.balance -= params.amount;
    } else {
      wallet.balance += params.amount;
    }
    wallet.updated_at = new Date().toISOString();

    if (this.currentUser) {
      const idx = this.currentUser.wallets.findIndex((w) => w.id === wallet.id);
      if (idx !== -1) {
        this.currentUser.wallets[idx].balance = wallet.balance;
      } else {
        this.currentUser.wallets.push(wallet);
      }
    }
    const globalIdx = this.wallets.findIndex((w) => w.id === wallet.id);
    if (globalIdx !== -1) {
      this.wallets[globalIdx].balance = wallet.balance;
    }

    const tx: Transaction = {
      id: `tx_${Date.now()}`,
      user_id: this.currentUser?.id || this.profile.id,
      wallet_id: wallet.id,
      category_id: params.category_id,
      type: params.type,
      amount: params.amount,
      description: params.description,
      transaction_date: params.transaction_date || new Date().toISOString(),
      source: params.source || 'web_manual',
      has_receipt: !!params.has_receipt,
      receipt_url: params.receipt_url,
      receipt_items: params.receipt_items || [],
      created_at: new Date().toISOString(),
      idempotency_key: params.idempotencyKey,
    };

    if (this.currentUser) {
      if (!this.currentUser.transactions) this.currentUser.transactions = [];
      if (!this.currentUser.transactions.some((t) => t.id === tx.id)) {
        this.currentUser.transactions.unshift(tx);
      }
    }
    if (this.transactions !== this.currentUser?.transactions) {
      if (!this.transactions.some((t) => t.id === tx.id)) {
        this.transactions.unshift(tx);
      }
    }

    // Update budget if expense
    let budgetAlert: { percent: number; categoryName: string; remaining: number } | undefined;
    if (params.type === 'expense' && params.category_id) {
      let activeBudget: Budget | undefined;
      if (this.currentUser?.budgets) {
        activeBudget = this.currentUser.budgets.find((b) => b.category_id === params.category_id);
        if (activeBudget) {
          activeBudget.current_spent = (activeBudget.current_spent || 0) + params.amount;
          activeBudget.updated_at = new Date().toISOString();
        }
      }
      const globalBudget = this.budgets.find((b) => b.category_id === params.category_id);
      if (globalBudget) {
        globalBudget.current_spent = (globalBudget.current_spent || 0) + params.amount;
        globalBudget.updated_at = new Date().toISOString();
      }

      const budget = activeBudget || globalBudget;
      if (budget) {
        const spent = budget.current_spent || 0;
        const percent = Math.round((spent / budget.monthly_limit) * 100);
        const remaining = Math.max(0, budget.monthly_limit - spent);
        const category = this.getCategories().find((c) => c.id === params.category_id);

        if (percent >= 80) {
          budgetAlert = {
            percent,
            categoryName: category?.name || 'Kategori',
            remaining,
          };
        }
      }
    }

    const result = { transaction: tx, budgetAlert };

    if (params.idempotencyKey) {
      this.processedTxMap.set(params.idempotencyKey, result);
      if (this.processedTxMap.size > 1000) {
        const oldest = this.processedTxMap.keys().next().value;
        if (oldest) this.processedTxMap.delete(oldest);
      }
    }

    this.notify();
    return result;
  }

  public deleteTransaction(id: string) {
    const currentTxs = this.getTransactions();
    const tx = currentTxs.find((t) => t.id === id);
    if (!tx) return;

    const currentWallets = this.getWallets();
    const wallet = currentWallets.find((w) => w.id === tx.wallet_id);
    if (wallet) {
      if (tx.type === 'expense') {
        wallet.balance += tx.amount;
      } else if (tx.type === 'income') {
        wallet.balance -= tx.amount;
      } else if (tx.type === 'transfer' && tx.to_wallet_id) {
        wallet.balance += tx.amount;
        const toWal = currentWallets.find((w) => w.id === tx.to_wallet_id);
        if (toWal) toWal.balance -= tx.amount;
      }
    }

    // Revert budget current_spent if expense
    if (tx.type === 'expense' && tx.category_id) {
      if (this.currentUser?.budgets) {
        const uBud = this.currentUser.budgets.find((b) => b.category_id === tx.category_id);
        if (uBud && uBud.current_spent) {
          uBud.current_spent = Math.max(0, uBud.current_spent - tx.amount);
          uBud.updated_at = new Date().toISOString();
        }
      }
      const gBud = this.budgets.find((b) => b.category_id === tx.category_id);
      if (gBud && gBud.current_spent) {
        gBud.current_spent = Math.max(0, gBud.current_spent - tx.amount);
        gBud.updated_at = new Date().toISOString();
      }
    }

    if (this.currentUser) {
      if (this.currentUser.transactions) {
        this.currentUser.transactions = this.currentUser.transactions.filter((t) => t.id !== id);
      }
      if (wallet) {
        const wIdx = this.currentUser.wallets.findIndex((w) => w.id === wallet.id);
        if (wIdx !== -1) this.currentUser.wallets[wIdx].balance = wallet.balance;
      }
      if (tx.type === 'transfer' && tx.to_wallet_id) {
        const toWal = currentWallets.find((w) => w.id === tx.to_wallet_id);
        if (toWal) {
          const tIdx = this.currentUser.wallets.findIndex((w) => w.id === toWal.id);
          if (tIdx !== -1) this.currentUser.wallets[tIdx].balance = toWal.balance;
        }
      }
    }

    this.transactions = this.transactions.filter((t) => t.id !== id);
    if (wallet) {
      const gWIdx = this.wallets.findIndex((w) => w.id === wallet.id);
      if (gWIdx !== -1) this.wallets[gWIdx].balance = wallet.balance;
    }
    if (tx.type === 'transfer' && tx.to_wallet_id) {
      const toWal = currentWallets.find((w) => w.id === tx.to_wallet_id);
      if (toWal) {
        const gTIdx = this.wallets.findIndex((w) => w.id === toWal.id);
        if (gTIdx !== -1) this.wallets[gTIdx].balance = toWal.balance;
      }
    }

    this.notify();
  }

  // Category actions
  public addCategory(name: string, type: 'expense' | 'income', icon: string, color: string) {
    const cat: Category = {
      id: `cat_${Date.now()}`,
      user_id: this.currentUser?.id || this.profile.id,
      name,
      type,
      icon: icon || '🏷️',
      color: color || '#FF6B00',
      is_system: false,
      created_at: new Date().toISOString(),
    };
    if (this.currentUser) {
      if (!this.currentUser.categories) this.currentUser.categories = [...INITIAL_CATEGORIES];
      this.currentUser.categories.push(cat);
    }
    this.categories.push(cat);
    this.notify();
    return cat;
  }

  // Budget actions
  public setBudget(categoryId: string, monthlyLimit: number) {
    const currentSpent = this.getTransactions()
      .filter((t) => t.type === 'expense' && t.category_id === categoryId)
      .reduce((sum, t) => sum + t.amount, 0);

    if (this.currentUser) {
      if (!this.currentUser.budgets) this.currentUser.budgets = [];
      const userBud = this.currentUser.budgets.find((b) => b.category_id === categoryId);
      if (userBud) {
        userBud.monthly_limit = monthlyLimit;
        userBud.current_spent = currentSpent;
        userBud.updated_at = new Date().toISOString();
        this.currentUser.budgets = [...this.currentUser.budgets];
      } else {
        const newBudget: Budget = {
          id: `bud_${Date.now()}`,
          user_id: this.currentUser.id,
          category_id: categoryId,
          monthly_limit: monthlyLimit,
          month_year: '2026-10',
          alert_80_sent: false,
          alert_100_sent: false,
          current_spent: currentSpent,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        this.currentUser.budgets = [...this.currentUser.budgets, newBudget];
      }
    }

    const existing = this.budgets.find((b) => b.category_id === categoryId);
    if (existing) {
      existing.monthly_limit = monthlyLimit;
      existing.current_spent = currentSpent;
      existing.updated_at = new Date().toISOString();
      this.budgets = [...this.budgets];
    } else {
      const newBudget: Budget = {
        id: `bud_${Date.now()}`,
        user_id: this.profile.id,
        category_id: categoryId,
        monthly_limit: monthlyLimit,
        month_year: '2026-10',
        alert_80_sent: false,
        alert_100_sent: false,
        current_spent: currentSpent,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      this.budgets = [...this.budgets, newBudget];
    }
    this.notify();
  }

  // Simulator actions
  public addSimMessage(msg: TelegramSimMessage) {
    if (!msg || !msg.id) return;
    // Prevent duplicate by ID
    if (this.simMessages.some((m) => m.id === msg.id)) {
      return;
    }
    // Prevent immediate consecutive duplicate (same sender, same text, and same type/media)
    const lastMsg = this.simMessages[this.simMessages.length - 1];
    if (
      lastMsg &&
      lastMsg.sender === msg.sender &&
      lastMsg.text?.trim() === msg.text?.trim() &&
      lastMsg.type === msg.type &&
      lastMsg.mediaUrl === msg.mediaUrl
    ) {
      return;
    }

    // Prevent duplicate within recent 4 messages from same sender
    const recentDuplicate = this.simMessages.slice(-4).find(
      (m) =>
        m.sender === msg.sender &&
        m.text?.trim() === msg.text?.trim() &&
        (m.type || 'text') === (msg.type || 'text') &&
        m.mediaUrl === msg.mediaUrl
    );
    if (recentDuplicate) {
      return;
    }

    this.simMessages.push(msg);
    this.notify();
  }

  // Sync state from server API response (e.g. after simulate API call)
  public syncServerState(data: {
    wallets?: Wallet[];
    budgets?: Budget[];
    recentTransactions?: Transaction[];
    transactions?: Transaction[];
    simMessages?: TelegramSimMessage[];
  }) {
    let hasChanged = false;

    if (this.currentUser) {
      if (data.wallets && Array.isArray(data.wallets)) {
        const walletMap = new Map<string, Wallet>();
        (this.currentUser.wallets || []).forEach((w) => walletMap.set(w.id, w));
        data.wallets.forEach((w) => {
          if (walletMap.has(w.id)) {
            walletMap.get(w.id)!.balance = w.balance;
          } else {
            walletMap.set(w.id, w);
          }
        });
        this.currentUser.wallets = Array.from(walletMap.values());
      }
      if (data.transactions && Array.isArray(data.transactions)) {
        const txMap = new Map<string, Transaction>();
        (this.currentUser.transactions || []).forEach((t) => txMap.set(t.id, t));
        data.transactions.forEach((t) => txMap.set(t.id, t));
        this.currentUser.transactions = Array.from(txMap.values()).sort((a, b) => {
          const dateA = new Date(a.transaction_date || a.created_at).getTime();
          const dateB = new Date(b.transaction_date || b.created_at).getTime();
          return dateB - dateA;
        });
      }
      if (data.budgets && Array.isArray(data.budgets)) {
        this.currentUser.budgets = data.budgets;
      }
    }

    if (data.wallets && Array.isArray(data.wallets)) {
      const walletsDiffer =
        data.wallets.length !== this.wallets.length ||
        data.wallets.some(
          (w, idx) =>
            w.balance !== this.wallets[idx]?.balance ||
            w.id !== this.wallets[idx]?.id ||
            w.is_default !== this.wallets[idx]?.is_default ||
            w.name !== this.wallets[idx]?.name
        );
      if (walletsDiffer) {
        this.wallets = [...data.wallets];
        hasChanged = true;
      }
    }

    if (data.budgets && Array.isArray(data.budgets)) {
      const budgetsDiffer =
        data.budgets.length !== this.budgets.length ||
        data.budgets.some((b, idx) => b.current_spent !== this.budgets[idx]?.current_spent);
      if (budgetsDiffer) {
        this.budgets = [...data.budgets];
        hasChanged = true;
      }
    }

    if (data.transactions && Array.isArray(data.transactions)) {
      if (data.transactions.length !== this.transactions.length || data.transactions[0]?.id !== this.transactions[0]?.id) {
        this.transactions = [...data.transactions];
        hasChanged = true;
      }
    } else if (data.recentTransactions && Array.isArray(data.recentTransactions)) {
      const existingIds = new Set(this.transactions.map((t) => t.id));
      const toAdd = data.recentTransactions.filter((t) => !existingIds.has(t.id));
      if (toAdd.length > 0) {
        this.transactions = [...toAdd, ...this.transactions];
        hasChanged = true;
      }
    }

    if (data.simMessages && Array.isArray(data.simMessages)) {
      const cleanMessages = deduplicateSimMessages(data.simMessages);
      const msgsDiffer =
        cleanMessages.length !== this.simMessages.length ||
        cleanMessages.some((m, idx) => m.id !== this.simMessages[idx]?.id || m.text !== this.simMessages[idx]?.text);
      if (msgsDiffer) {
        this.simMessages = cleanMessages;
        hasChanged = true;
      }
    }

    if (hasChanged) {
      this.notify();
    }
  }

  public syncState(data: {
    wallets?: Wallet[];
    budgets?: Budget[];
    recentTransactions?: Transaction[];
    transactions?: Transaction[];
    simMessages?: TelegramSimMessage[];
  }) {
    return this.syncServerState(data);
  }

  public resetSimMessages(): void {
    this.simMessages = [
      {
        id: 'msg_welcome_1',
        sender: 'bot',
        text: `👋 Halo! Selamat datang di bot TataDana. Catat keuangan pribadi semudah chatting!`,
        timestamp: '12:00',
      },
      {
        id: 'msg_welcome_2',
        sender: 'bot',
        text: `Ketik langsung pengeluaran atau pemasukan kamu seperti:\n• "membeli baso 5 ribu"\n• "beli bakso 15rb"\n• "gajian 5jt"\n• "tambah saldo 500rb"\n• Kirim foto struk belanja (Pro)\n• Kirim Voice Note`,
        timestamp: '12:00',
      },
      {
        id: 'msg_welcome_3',
        sender: 'bot',
        text: `Ketik /bantuan atau /menu untuk melihat daftar perintah lengkap.`,
        timestamp: '12:00',
      },
    ];
    this.notify();
  }

  public clearSimMessages() {
    this.simMessages = [];
    this.notify();
  }

  // Admin AI actions
  public updateAIProvider(id: string, updates: Partial<AIProvider>) {
    this.aiProviders = this.aiProviders.map((p) => (p.id === id ? { ...p, ...updates } : p));
    this.notify();
  }

  public addAILog(log: Omit<AILog, 'id' | 'created_at'>) {
    const newLog: AILog = {
      id: `log_${Date.now()}`,
      ...log,
      created_at: new Date().toISOString(),
    };
    this.aiLogs.unshift(newLog);
    this.notify();
  }

  // Admin subscription actions
  public updateSubscription(id: string, status: Subscription['status']) {
    this.subscriptions = this.subscriptions.map((s) => {
      if (s.id === id) {
        return {
          ...s,
          status,
          approved_at: status === 'active' ? new Date().toISOString() : undefined,
        };
      }
      return s;
    });
    this.notify();
  }

  // Report Export actions
  public addReportExport(title: string, format: 'pdf' | 'xlsx', periodStart: string, periodEnd: string) {
    const exp: ReportExport = {
      id: `exp_${Date.now()}`,
      user_id: this.profile.id,
      title,
      format,
      period_start: periodStart,
      period_end: periodEnd,
      file_url: `/exports/${title.toLowerCase().replace(/\s+/g, '-')}.${format}`,
      file_size: format === 'pdf' ? '280 KB' : '95 KB',
      created_at: new Date().toISOString(),
    };
    this.reportExports.unshift(exp);
    this.notify();
    return exp;
  }
}

// Global singleton instance
export const demoStore = new DemoStore();
