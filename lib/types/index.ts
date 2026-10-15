export type UserRole = 'user' | 'admin';
export type UserApprovalStatus = 'pending_approval' | 'approved' | 'rejected';
export type PlanType = 'starter' | 'pro';
export type WalletType = 'cash' | 'bank' | 'ewallet' | 'investment';
export type TransactionType = 'expense' | 'income' | 'transfer';
export type TransactionSource = 'telegram_text' | 'telegram_photo' | 'telegram_voice' | 'web_manual' | 'transfer';
export type AIProviderName = 'gemini' | 'openai' | 'deepseek';
export type AIExecutionMode = 'single' | 'parallel';
export type SubscriptionStatus = 'pending' | 'active' | 'rejected' | 'expired';

export interface UserAccount {
  id: string;
  email: string;
  phone?: string;
  full_name: string;
  password?: string;
  avatar_url?: string;
  role: UserRole;
  plan: PlanType;
  status: UserApprovalStatus;
  verification_code?: string;
  is_verified: boolean;
  telegram_username?: string;
  telegram_chat_id?: number;
  wallets: Wallet[];
  transactions: Transaction[];
  budgets: Budget[];
  categories: Category[];
  created_at: string;
  approved_at?: string;
}

export interface Profile {
  id: string;
  email: string;
  phone?: string;
  full_name: string;
  avatar_url?: string;
  role: UserRole;
  plan: PlanType;
  default_currency: string;
  telegram_chat_id?: number;
  telegram_username?: string;
  is_bot_active: boolean;
  reminder_enabled: boolean;
  reminder_frequency: number; // 1 or 2
  reminder_time_1: string; // e.g. "08:00"
  reminder_time_2: string; // e.g. "20:00"
  created_at: string;
  updated_at: string;
}

export interface Wallet {
  id: string;
  user_id: string;
  name: string;
  type: WalletType;
  balance: number;
  is_default: boolean;
  color: string;
  icon: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  user_id?: string | null;
  name: string;
  type: 'expense' | 'income';
  icon: string;
  color: string;
  is_system: boolean;
  created_at: string;
}

export interface Budget {
  id: string;
  user_id: string;
  category_id: string;
  monthly_limit: number;
  month_year: string; // "YYYY-MM"
  alert_80_sent: boolean;
  alert_100_sent: boolean;
  category?: Category;
  current_spent?: number;
  created_at: string;
  updated_at: string;
}

export interface ReceiptItem {
  name: string;
  price: number;
  qty: number;
}

export interface Transaction {
  id: string;
  user_id: string;
  wallet_id: string;
  category_id?: string | null;
  type: TransactionType;
  amount: number;
  description: string;
  transaction_date: string;
  source: TransactionSource;
  has_receipt: boolean;
  receipt_url?: string;
  receipt_items: ReceiptItem[];
  to_wallet_id?: string | null;
  created_at: string;
  wallet?: Wallet;
  to_wallet?: Wallet;
  category?: Category;
  idempotency_key?: string;
}

export interface AIProvider {
  id: string;
  provider: AIProviderName;
  model_name: string;
  api_key_encrypted: string;
  is_active: boolean;
  priority: number;
  mode: 'primary' | 'fallback';
  created_at: string;
  updated_at: string;
}

export interface AILog {
  id: string;
  user_id?: string;
  provider: string;
  input_type: 'text' | 'photo' | 'voice' | 'advisor';
  prompt?: string;
  response?: string;
  latency_ms: number;
  status: 'success' | 'error';
  error_message?: string;
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan: PlanType;
  status: SubscriptionStatus;
  amount: number;
  payment_method: string;
  payment_proof_url?: string;
  midtrans_order_id?: string;
  midtrans_response?: any;
  approved_by?: string;
  approved_at?: string;
  expires_at?: string;
  created_at: string;
  user?: Profile;
}

export interface ReportExport {
  id: string;
  user_id: string;
  title: string;
  format: 'pdf' | 'xlsx';
  period_start: string;
  period_end: string;
  file_url: string;
  file_size?: string;
  created_at: string;
}

export interface ParsedTransaction {
  type: 'expense' | 'income';
  amount: number;
  categoryName: string;
  description: string;
  rawInput: string;
  confidence?: number;
  items?: ReceiptItem[];
}
