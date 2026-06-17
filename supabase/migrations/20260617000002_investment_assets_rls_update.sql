CREATE POLICY "Allow update of assets for authenticated" 
ON public.investment_assets 
FOR UPDATE TO authenticated 
USING (true);
