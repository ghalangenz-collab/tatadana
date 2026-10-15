-- ==============================================================================
-- TataDana Database Schema & Migrations
-- Catat keuangan semudah chat — langsung dari Telegram kamu
-- Timezone Asia/Jakarta (WIB)
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Set timezone default
SET timezone = 'Asia/Jakarta';

-- 1. PROFILES (Extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE,
    phone TEXT UNIQUE,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    plan TEXT NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter', 'pro')),
    default_currency TEXT NOT NULL DEFAULT 'IDR',
    telegram_chat_id BIGINT UNIQUE,
    telegram_username TEXT,
    is_bot_active BOOLEAN NOT NULL DEFAULT false,
    reminder_enabled BOOLEAN NOT NULL DEFAULT false,
    reminder_frequency INT NOT NULL DEFAULT 1 CHECK (reminder_frequency BETWEEN 1 AND 2),
    reminder_time_1 TIME NOT NULL DEFAULT '08:00:00',
    reminder_time_2 TIME NOT NULL DEFAULT '20:00:00',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta'::text, now())
);

-- 2. WALLETS (Multi-wallet: Cash, BCA, Mandiri, GoPay, OVO, etc.)
CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'bank' CHECK (type IN ('cash', 'bank', 'ewallet', 'investment')),
    balance NUMERIC(15, 2) NOT NULL DEFAULT 0,
    is_default BOOLEAN NOT NULL DEFAULT false,
    color TEXT NOT NULL DEFAULT '#FF6B00',
    icon TEXT NOT NULL DEFAULT 'wallet',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta'::text, now())
);

-- 3. CATEGORIES (System default + custom categories with emoji & color)
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'expense' CHECK (type IN ('expense', 'income')),
    icon TEXT NOT NULL DEFAULT '📦',
    color TEXT NOT NULL DEFAULT '#FF6B00',
    is_system BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta'::text, now())
);

-- 4. BUDGETS (Monthly category budget with 80% & 100% alert states)
CREATE TABLE IF NOT EXISTS public.budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    monthly_limit NUMERIC(15, 2) NOT NULL CHECK (monthly_limit > 0),
    month_year TEXT NOT NULL, -- e.g. "2026-10"
    alert_80_sent BOOLEAN NOT NULL DEFAULT false,
    alert_100_sent BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta'::text, now()),
    CONSTRAINT unique_user_category_month UNIQUE (user_id, category_id, month_year)
);

-- 5. TRANSACTIONS (Pemasukan, Pengeluaran, Transfer + Struk Multi-item)
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('expense', 'income', 'transfer')),
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    description TEXT NOT NULL,
    transaction_date TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta'::text, now()),
    source TEXT NOT NULL DEFAULT 'telegram_text' CHECK (source IN ('telegram_text', 'telegram_photo', 'telegram_voice', 'web_manual', 'transfer')),
    has_receipt BOOLEAN NOT NULL DEFAULT false,
    receipt_url TEXT,
    receipt_items JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{name: string, price: number, qty: number}]
    to_wallet_id UUID REFERENCES public.wallets(id) ON DELETE SET NULL, -- for transfer type
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta'::text, now())
);

-- 6. TELEGRAM_UPDATES (Idempotency table to prevent duplicate Telegram webhooks)
CREATE TABLE IF NOT EXISTS public.telegram_updates (
    update_id BIGINT PRIMARY KEY,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta'::text, now()),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    payload JSONB
);

-- 7. AI_PROVIDERS (Managed via Superadmin UI: Gemini, OpenAI, DeepSeek)
CREATE TABLE IF NOT EXISTS public.ai_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL CHECK (provider IN ('gemini', 'openai', 'deepseek')),
    model_name TEXT NOT NULL,
    api_key_encrypted TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    priority INT NOT NULL DEFAULT 1,
    mode TEXT NOT NULL DEFAULT 'primary' CHECK (mode IN ('primary', 'fallback')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta'::text, now())
);

-- 8. AI_LOGS (Audit & Performance of AI parsing)
CREATE TABLE IF NOT EXISTS public.ai_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    provider TEXT NOT NULL,
    input_type TEXT NOT NULL CHECK (input_type IN ('text', 'photo', 'voice', 'advisor')),
    prompt TEXT,
    response TEXT,
    latency_ms INT,
    status TEXT NOT NULL CHECK (status IN ('success', 'error')),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta'::text, now())
);

-- 9. SUBSCRIPTIONS (Midtrans & Manual Bank Transfer Approval)
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    plan TEXT NOT NULL CHECK (plan IN ('starter', 'pro')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'rejected', 'expired')),
    amount NUMERIC(15, 2) NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'midtrans',
    payment_proof_url TEXT,
    midtrans_order_id TEXT UNIQUE,
    midtrans_response JSONB,
    approved_by UUID REFERENCES public.profiles(id),
    approved_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta'::text, now())
);

-- 10. REPORT_EXPORTS (PDF / Excel download history)
CREATE TABLE IF NOT EXISTS public.report_exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    format TEXT NOT NULL CHECK (format IN ('pdf', 'xlsx')),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    file_url TEXT NOT NULL,
    file_size TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta'::text, now())
);

-- 11. AUDIT_LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    details JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Jakarta'::text, now())
);

-- ==============================================================================
-- INDEXES FOR PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions(user_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_wallet ON public.transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON public.transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_budgets_user_month ON public.budgets(user_id, month_year);
CREATE INDEX IF NOT EXISTS idx_wallets_user ON public.wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_telegram ON public.profiles(telegram_chat_id);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);

-- ==============================================================================
-- TRIGGERS & FUNCTIONS
-- ==============================================================================

-- 1. Ensure only 1 wallet has is_default = true per user
CREATE OR REPLACE FUNCTION public.handle_single_default_wallet()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default = true THEN
        UPDATE public.wallets
        SET is_default = false
        WHERE user_id = NEW.user_id AND id != NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_single_default_wallet ON public.wallets;
CREATE TRIGGER trg_single_default_wallet
BEFORE INSERT OR UPDATE ON public.wallets
FOR EACH ROW EXECUTE FUNCTION public.handle_single_default_wallet();

-- 2. Update wallet balance on transaction insert/update/delete
CREATE OR REPLACE FUNCTION public.sync_wallet_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        IF NEW.type = 'expense' THEN
            UPDATE public.wallets SET balance = balance - NEW.amount WHERE id = NEW.wallet_id;
        ELSIF NEW.type = 'income' THEN
            UPDATE public.wallets SET balance = balance + NEW.amount WHERE id = NEW.wallet_id;
        ELSIF NEW.type = 'transfer' THEN
            UPDATE public.wallets SET balance = balance - NEW.amount WHERE id = NEW.wallet_id;
            IF NEW.to_wallet_id IS NOT NULL THEN
                UPDATE public.wallets SET balance = balance + NEW.amount WHERE id = NEW.to_wallet_id;
            END IF;
        END IF;
    ELSIF (TG_OP = 'DELETE') THEN
        IF OLD.type = 'expense' THEN
            UPDATE public.wallets SET balance = balance + OLD.amount WHERE id = OLD.wallet_id;
        ELSIF OLD.type = 'income' THEN
            UPDATE public.wallets SET balance = balance - OLD.amount WHERE id = OLD.wallet_id;
        ELSIF OLD.type = 'transfer' THEN
            UPDATE public.wallets SET balance = balance + OLD.amount WHERE id = OLD.wallet_id;
            IF OLD.to_wallet_id IS NOT NULL THEN
                UPDATE public.wallets SET balance = balance - OLD.amount WHERE id = OLD.to_wallet_id;
            END IF;
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_wallet_balance ON public.transactions;
CREATE TRIGGER trg_sync_wallet_balance
AFTER INSERT OR DELETE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.sync_wallet_balance();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_logs ENABLE ROW LEVEL SECURITY;

-- Profiles: users can select and update their own profile, admin can select all
CREATE POLICY "Users can manage own profile" ON public.profiles
    FOR ALL USING (auth.uid() = id);

-- Wallets: user owns wallet
CREATE POLICY "Users can manage own wallets" ON public.wallets
    FOR ALL USING (auth.uid() = user_id);

-- Categories: user owns or system category
CREATE POLICY "Users can read system or own categories" ON public.categories
    FOR SELECT USING (is_system = true OR auth.uid() = user_id);
CREATE POLICY "Users can manage own categories" ON public.categories
    FOR ALL USING (auth.uid() = user_id);

-- Budgets: user owns budget
CREATE POLICY "Users can manage own budgets" ON public.budgets
    FOR ALL USING (auth.uid() = user_id);

-- Transactions: user owns transaction
CREATE POLICY "Users can manage own transactions" ON public.transactions
    FOR ALL USING (auth.uid() = user_id);

-- Report exports: user owns export
CREATE POLICY "Users can manage own report exports" ON public.report_exports
    FOR ALL USING (auth.uid() = user_id);

-- Subscriptions: user reads own, admins manage all
CREATE POLICY "Users can view own subscription" ON public.subscriptions
    FOR SELECT USING (auth.uid() = user_id);

-- ==============================================================================
-- SEED DATA (System Categories & Default AI Providers)
-- ==============================================================================
INSERT INTO public.categories (name, type, icon, color, is_system) VALUES
('Makanan & Minuman', 'expense', '🍜', '#FF6B00', true),
('Transportasi', 'expense', '🚗', '#3B82F6', true),
('Hiburan & Rekreasi', 'expense', '🎮', '#8B5CF6', true),
('Tagihan & Utilitas', 'expense', '🏠', '#EF4444', true),
('Kesehatan & Medis', 'expense', '💊', '#10B981', true),
('Belanja & Kebutuhan', 'expense', '👕', '#F59E0B', true),
('Pendidikan & Buku', 'expense', '📚', '#06B6D4', true),
('Gaji & Upah', 'income', '💼', '#10B981', true),
('Bonus & Freelance', 'income', '💻', '#3B82F6', true),
('Investasi & Dividen', 'income', '💰', '#F59E0B', true)
ON CONFLICT DO NOTHING;

INSERT INTO public.ai_providers (provider, model_name, api_key_encrypted, is_active, priority, mode) VALUES
('gemini', 'gemini-1.5-flash', 'ENCRYPTED_DEMO_KEY_GEMINI', true, 1, 'primary'),
('openai', 'gpt-4o-mini', 'ENCRYPTED_DEMO_KEY_OPENAI', true, 2, 'fallback'),
('deepseek', 'deepseek-chat', 'ENCRYPTED_DEMO_KEY_DEEPSEEK', true, 3, 'fallback')
ON CONFLICT DO NOTHING;
