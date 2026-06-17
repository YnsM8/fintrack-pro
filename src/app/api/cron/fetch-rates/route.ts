import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'sb_cron_secret_key_2026';
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    const data = await res.json();
    if (!data || !data.rates) {
      throw new Error('Could not pull exchange rates.');
    }

    const supabase = await createClient();

    const ratesToStore = [
      { base_currency: 'USD', target_currency: 'COP', rate: data.rates.COP },
      { base_currency: 'USD', target_currency: 'MXN', rate: data.rates.MXN },
      { base_currency: 'USD', target_currency: 'EUR', rate: data.rates.EUR }
    ];

    for (const item of ratesToStore) {
      const { error } = await supabase.rpc('update_exchange_rates', {
        p_base_currency: item.base_currency,
        p_target_currency: item.target_currency,
        p_rate: item.rate
      });
      if (error) throw new Error(error.message);
    }

    return NextResponse.json({ success: true, updated: ratesToStore });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
