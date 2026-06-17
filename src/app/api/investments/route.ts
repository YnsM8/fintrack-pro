import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const CRYPTO_MAP: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  ADA: 'cardano',
  DOT: 'polkadot',
  XRP: 'ripple',
  DOGE: 'dogecoin',
  LTC: 'litecoin',
  LINK: 'chainlink'
};

async function getLivePrice(symbol: string, type: 'stock' | 'crypto'): Promise<number> {
  try {
    if (type === 'crypto') {
      const coinId = CRYPTO_MAP[symbol.toUpperCase()] || symbol.toLowerCase();
      const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`);
      if (!res.ok) throw new Error(`CoinGecko HTTP error: ${res.status}`);
      const data = await res.json();
      return data[coinId]?.usd || 0;
    } else {
      const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol.toUpperCase()}`);
      if (!res.ok) throw new Error(`Yahoo Finance HTTP error: ${res.status}`);
      const data = await res.json();
      return data?.chart?.result?.[0]?.meta?.regularMarketPrice || 0;
    }
  } catch (e) {
    console.error(`Error fetching live price for ${symbol}:`, e);
    return 0;
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch user transactions
    const { data: txs, error: txError } = await supabase
      .from('investment_transactions')
      .select('*, investment_assets(*)')
      .eq('user_id', user.id);

    if (txError) {
      return NextResponse.json({ error: txError.message }, { status: 500 });
    }

    if (!txs || txs.length === 0) {
      return NextResponse.json({ portfolio: [] });
    }

    // Identify assets
    const uniqueAssetsMap = new Map<string, any>();
    txs.forEach((tx: any) => {
      const asset = tx.investment_assets;
      if (asset && !uniqueAssetsMap.has(asset.id)) {
        uniqueAssetsMap.set(asset.id, { ...asset });
      }
    });

    const now = new Date();
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

    // Refresh prices if stale concurrently
    const refreshPromises = Array.from(uniqueAssetsMap.entries()).map(async ([assetId, asset]) => {
      const lastFetched = new Date(asset.last_fetched_at);
      if (lastFetched < tenMinutesAgo || asset.current_price === 0) {
        const newPrice = await getLivePrice(asset.symbol, asset.type as 'stock' | 'crypto');
        if (newPrice > 0) {
          asset.current_price = newPrice;
          asset.last_fetched_at = now.toISOString();

          // Save refreshed price to DB
          await supabase
            .from('investment_assets')
            .update({
              current_price: newPrice,
              last_fetched_at: now.toISOString()
            })
            .eq('id', asset.id);
        }
      }
    });

    await Promise.all(refreshPromises);

    // Portfolio metrics computation
    const portfolio: Record<string, any> = {};

    txs.forEach((tx: any) => {
      const asset = uniqueAssetsMap.get(tx.asset_id);
      if (!asset) return;

      if (!portfolio[asset.id]) {
        portfolio[asset.id] = {
          assetId: asset.id,
          symbol: asset.symbol,
          name: asset.name,
          type: asset.type,
          currentPrice: Number(asset.current_price),
          totalQuantity: 0,
          totalInvested: 0,
          buysCount: 0,
          buysValue: 0
        };
      }

      const p = portfolio[asset.id];
      const shares = Number(tx.shares_quantity);
      const price = Number(tx.price_per_share);
      const fee = Number(tx.fee);

      if (tx.type === 'buy') {
        p.totalQuantity += shares;
        p.totalInvested += (shares * price) + fee;
        p.buysCount += shares;
        p.buysValue += (shares * price) + fee;
      } else if (tx.type === 'sell') {
        p.totalQuantity -= shares;
        const avgCost = p.buysCount > 0 ? p.buysValue / p.buysCount : 0;
        p.totalInvested -= (shares * avgCost);
      }
    });

    const portfolioList = Object.values(portfolio)
      .map((p: any) => {
        const avgCost = p.buysCount > 0 ? p.buysValue / p.buysCount : 0;
        const currentValue = p.totalQuantity * p.currentPrice;
        const unrealizedPL = currentValue - (p.totalQuantity * avgCost);
        const unrealizedPLPercent = avgCost > 0 ? (unrealizedPL / (p.totalQuantity * avgCost)) * 100 : 0;

        return {
          ...p,
          avgCost,
          currentValue,
          unrealizedPL,
          unrealizedPLPercent
        };
      })
      .filter((p: any) => p.totalQuantity > 0);

    return NextResponse.json({ portfolio: portfolioList });
  } catch (error: any) {
    console.error('BFF GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { symbol, name, type, txType, shares, price, fee } = body;

    if (!symbol || !name || !type || !txType || !shares || !price) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    // Check if asset exists, create if not
    let { data: asset, error: assetFetchErr } = await supabase
      .from('investment_assets')
      .select('*')
      .eq('symbol', symbol.toUpperCase())
      .maybeSingle();

    if (!asset) {
      const livePrice = await getLivePrice(symbol, type as 'stock' | 'crypto');
      const { data: newAsset, error: assetErr } = await supabase
        .from('investment_assets')
        .insert({
          symbol: symbol.toUpperCase(),
          name,
          type,
          current_price: livePrice > 0 ? livePrice : Number(price),
          last_fetched_at: new Date().toISOString()
        })
        .select()
        .single();

      if (assetErr) {
        return NextResponse.json({ error: assetErr.message }, { status: 400 });
      }
      asset = newAsset;
    }

    // Insert transaction
    const { error: txErr } = await supabase
      .from('investment_transactions')
      .insert({
        user_id: user.id,
        asset_id: asset.id,
        type: txType,
        shares_quantity: Number(shares),
        price_per_share: Number(price),
        fee: Number(fee || 0),
        transaction_date: new Date().toISOString()
      });

    if (txErr) {
      return NextResponse.json({ error: txErr.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('BFF POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
