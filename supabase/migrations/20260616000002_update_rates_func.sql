CREATE OR REPLACE FUNCTION public.update_exchange_rates(
  p_base_currency TEXT,
  p_target_currency TEXT,
  p_rate NUMERIC
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.exchange_rates (base_currency, target_currency, rate, updated_at)
  VALUES (p_base_currency, p_target_currency, p_rate, now())
  ON CONFLICT (base_currency, target_currency)
  DO UPDATE SET rate = EXCLUDED.rate, updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
