CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS smes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    business_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sme_id UUID REFERENCES smes(id) NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    amount INTEGER NOT NULL,
    currency TEXT DEFAULT 'XAF',
    interval_days INTEGER DEFAULT 30,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscribers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sme_id UUID REFERENCES smes(id) NOT NULL,
    plan_id UUID REFERENCES subscription_plans(id) NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payment_cycles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    subscriber_id UUID REFERENCES subscribers(id) NOT NULL,
    plan_id UUID REFERENCES subscription_plans(id) NOT NULL,
    amount INTEGER NOT NULL,
    currency TEXT DEFAULT 'XAF',
    due_date DATE NOT NULL,
    status TEXT DEFAULT 'pending',
    retry_count INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sme_id UUID REFERENCES smes(id) NOT NULL,
    cycle_id UUID REFERENCES payment_cycles(id),
    subscriber_id UUID REFERENCES subscribers(id) NOT NULL,
    plan_id UUID REFERENCES subscription_plans(id),
    pawapay_deposit_id TEXT,
    amount INTEGER NOT NULL,
    currency TEXT DEFAULT 'XAF',
    provider TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    pawapay_status TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS webhook_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pawapay_event_id TEXT UNIQUE,
    deposit_id TEXT,
    event_type TEXT,
    status TEXT,
    raw_body JSONB,
    received_at TIMESTAMPTZ DEFAULT now(),
    processed BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_subscribers_sme_id ON subscribers(sme_id);
CREATE INDEX IF NOT EXISTS idx_subscribers_plan_id ON subscribers(plan_id);
CREATE INDEX IF NOT EXISTS idx_payment_cycles_subscriber_id ON payment_cycles(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_payment_cycles_status ON payment_cycles(status);
CREATE INDEX IF NOT EXISTS idx_transactions_sme_id ON transactions(sme_id);
CREATE INDEX IF NOT EXISTS idx_transactions_pawapay_deposit_id ON transactions(pawapay_deposit_id);
