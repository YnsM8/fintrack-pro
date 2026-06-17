-- Create investment_assets table
CREATE TABLE IF NOT EXISTS public.investment_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('stock', 'crypto')),
    current_price NUMERIC(16, 6) NOT NULL DEFAULT 0.0,
    last_fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create investment_transactions table
CREATE TABLE IF NOT EXISTS public.investment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES public.investment_assets(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('buy', 'sell')),
    shares_quantity NUMERIC(16, 8) NOT NULL CHECK (shares_quantity > 0),
    price_per_share NUMERIC(16, 6) NOT NULL CHECK (price_per_share > 0),
    fee NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
    transaction_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.investment_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investment_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY "Allow public read of assets" ON public.investment_assets
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow insert of assets for authenticated" ON public.investment_assets
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can only read own transactions" ON public.investment_transactions
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert own transactions" ON public.investment_transactions
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only delete own transactions" ON public.investment_transactions
    FOR DELETE TO authenticated USING (auth.uid() = user_id);
