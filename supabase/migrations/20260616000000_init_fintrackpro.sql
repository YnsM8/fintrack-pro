-- Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tables
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    base_currency TEXT NOT NULL DEFAULT 'USD' CHECK (base_currency IN ('USD', 'COP', 'MXN', 'EUR')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    icon TEXT NOT NULL DEFAULT '📁',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    currency TEXT NOT NULL CHECK (currency IN ('USD', 'COP', 'MXN', 'EUR')),
    base_amount NUMERIC(12, 2) NOT NULL CHECK (base_amount > 0),
    exchange_rate NUMERIC(12, 6) NOT NULL DEFAULT 1.0,
    description TEXT,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.saving_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    target_amount NUMERIC(12, 2) NOT NULL CHECK (target_amount > 0),
    current_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.0 CHECK (current_amount >= 0.0),
    currency TEXT NOT NULL CHECK (currency IN ('USD', 'COP', 'MXN', 'EUR')),
    deadline DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    limit_amount NUMERIC(12, 2) NOT NULL CHECK (limit_amount > 0),
    month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, category_id, month, year)
);

CREATE TABLE public.budget_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    budget_id UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.exchange_rates (
    base_currency TEXT NOT NULL DEFAULT 'USD',
    target_currency TEXT NOT NULL,
    rate NUMERIC(12, 6) NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (base_currency, target_currency)
);

-- RLS Enablement
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saving_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Profiles - Select propio" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Profiles - Update propio" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Categories - CRUD" ON public.categories FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Transactions - CRUD" ON public.transactions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Saving Goals - CRUD" ON public.saving_goals FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Budgets - CRUD" ON public.budgets FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Budget Alerts - Select" ON public.budget_alerts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Budget Alerts - Update" ON public.budget_alerts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Exchange Rates - Lectura pública" ON public.exchange_rates FOR SELECT USING (auth.role() = 'authenticated');

-- Currency Conversion Trigger Function
CREATE OR REPLACE FUNCTION public.fn_convert_transaction_currency()
RETURNS TRIGGER AS $$
DECLARE
    u_base_currency TEXT;
    c_rate NUMERIC;
BEGIN
    SELECT base_currency INTO u_base_currency FROM public.profiles WHERE id = NEW.user_id;
    IF NEW.currency = u_base_currency THEN
        NEW.base_amount := NEW.amount;
        NEW.exchange_rate := 1.0;
    ELSE
        SELECT rate INTO c_rate 
        FROM public.exchange_rates 
        WHERE base_currency = u_base_currency AND target_currency = NEW.currency;
        IF c_rate IS NULL OR c_rate = 0 THEN
            NEW.base_amount := NEW.amount;
            NEW.exchange_rate := 1.0;
        ELSE
            NEW.base_amount := NEW.amount / c_rate;
            NEW.exchange_rate := c_rate;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_convert_transaction_currency
BEFORE INSERT OR UPDATE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.fn_convert_transaction_currency();

-- Budget Check Trigger Function
CREATE OR REPLACE FUNCTION public.fn_check_budget_limits()
RETURNS TRIGGER AS $$
DECLARE
    b_limit NUMERIC;
    b_id UUID;
    total_spent NUMERIC;
    t_month INT;
    t_year INT;
BEGIN
    IF NEW.type = 'expense' THEN
        t_month := EXTRACT(MONTH FROM NEW.transaction_date);
        t_year := EXTRACT(YEAR FROM NEW.transaction_date);
        
        SELECT id, limit_amount INTO b_id, b_limit 
        FROM public.budgets 
        WHERE user_id = NEW.user_id AND category_id = NEW.category_id AND month = t_month AND year = t_year;
        
        IF b_id IS NOT NULL THEN
            SELECT COALESCE(SUM(base_amount), 0) INTO total_spent 
            FROM public.transactions 
            WHERE user_id = NEW.user_id AND category_id = NEW.category_id 
              AND type = 'expense'
              AND EXTRACT(MONTH FROM transaction_date) = t_month 
              AND EXTRACT(YEAR FROM transaction_date) = t_year;
            
            IF total_spent >= b_limit THEN
                INSERT INTO public.budget_alerts (user_id, budget_id, message)
                VALUES (NEW.user_id, b_id, 'Has superado el límite de presupuesto para la categoría. Límite: ' || b_limit || ', Gastado: ' || total_spent);
            ELSIF total_spent >= (b_limit * 0.9) THEN
                INSERT INTO public.budget_alerts (user_id, budget_id, message)
                VALUES (NEW.user_id, b_id, 'Has consumido más del 90% de tu presupuesto. Límite: ' || b_limit || ', Gastado: ' || total_spent);
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_check_budget_limits
AFTER INSERT OR UPDATE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.fn_check_budget_limits();

-- Seed base exchange rates
INSERT INTO public.exchange_rates (base_currency, target_currency, rate) VALUES
('USD', 'COP', 4000.0),
('USD', 'MXN', 18.0),
('USD', 'EUR', 0.92)
ON CONFLICT (base_currency, target_currency) DO UPDATE SET rate = EXCLUDED.rate;
