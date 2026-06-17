# Investments & Portfolio Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a comprehensive Stocks & Crypto portfolio tracker where users log buy/sell transactions, live quotes are lazy-cached in the database via external public APIs (CoinGecko and Yahoo Finance), and the UI displays returns alongside an interactive allocation chart and average-cost visualizers.

**Architecture:** Client-Server Reactiva BFF. Live market data is cached in `investment_assets` for 10 minutes. Buy/sell logs are summed dynamically to yield current holdings and average cost basis.

**Tech Stack:** Next.js Route Handlers (BFF), Supabase DB (RLS), Recharts (Asset allocation), GSAP (Micro-animations), Tailwind CSS.

## Global Constraints
- Target workspace must remain in local semantic directory contexts.
- No third-party API keys required; use public Yahoo Finance meta chart and CoinGecko simple prices.
- RLS policies must protect user transaction data.

---

### Task 1: SQL Database Migrations

**Files:**
- Create: `supabase/migrations/20260617000001_investments.sql`

**Interfaces:**
- Consumes: None
- Produces: PostgreSQL tables `public.investment_assets` and `public.investment_transactions` with Row-Level Security policies active.

- [ ] **Step 1: Write the migration file**
  Create the file `supabase/migrations/20260617000001_investments.sql` with:
  ```sql
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
  ```

- [ ] **Step 2: Apply SQL migration via Supabase tool**
  Run the `mcp_supabase_apply_migration` tool using the project ID and migration query.

- [ ] **Step 3: Verify table structures**
  Execute: `SELECT COUNT(*) FROM public.investment_assets;` via SQL runner.
  Expected: Returns `0` (Success, table exists and is empty).

- [ ] **Step 4: Commit**
  ```bash
  git add supabase/migrations/20260617000001_investments.sql
  git commit -m "db: create investments and assets tables with RLS"
  ```

---

### Task 2: API integration and Route Handler

**Files:**
- Create: `src/app/api/investments/route.ts`

**Interfaces:**
- Consumes: Database schema from Task 1.
- Produces: REST Endpoint `/api/investments` responding to `GET` (returns portfolio performance metrics) and `POST` (saves new transactions).

- [ ] **Step 1: Write the API endpoint logic**
  Create `src/app/api/investments/route.ts` with logic to:
  1. Map coin symbols to CoinGecko IDs (e.g. `btc` -> `bitcoin`, `eth` -> `ethereum`).
  2. Fetch Yahoo Finance / CoinGecko prices on demand.
  3. Lazy-cache them in `investment_assets` if cached value is older than 10 minutes.
  4. Perform mathematical calculations (Avg Cost Basis, Quantity Owned, Realized/Unrealized Gain/Loss).
  5. Save new transactions to `investment_transactions`.

  Code implementation snippet:
  ```typescript
  import { NextRequest, NextResponse } from "next/server";
  import { createClient } from "@/lib/supabase/server";

  const CRYPTO_MAP: Record<string, string> = {
    BTC: "bitcoin",
    ETH: "ethereum",
    SOL: "solana",
    ADA: "cardano",
    DOT: "polkadot",
  };

  async function getLivePrice(symbol: string, type: "stock" | "crypto"): Promise<number> {
    try {
      if (type === "crypto") {
        const coinId = CRYPTO_MAP[symbol.toUpperCase()] || symbol.toLowerCase();
        const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`);
        const data = await res.json();
        return data[coinId]?.usd || 0;
      } else {
        const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol.toUpperCase()}`);
        const data = await res.json();
        return data.chart?.result?.[0]?.meta?.regularMarketPrice || 0;
      }
    } catch (e) {
      console.error("Price fetch error:", e);
      return 0;
    }
  }

  export async function GET(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Fetch user transactions
    const { data: txs } = await supabase
      .from("investment_transactions")
      .select("*, investment_assets(*)")
      .eq("user_id", user.id);

    if (!txs) return NextResponse.json({ portfolio: [] });

    // Identify assets
    const uniqueAssetsMap = new Map<string, any>();
    txs.forEach((tx: any) => {
      const asset = tx.investment_assets;
      if (!uniqueAssetsMap.has(asset.id)) {
        uniqueAssetsMap.set(asset.id, asset);
      }
    });

    const now = new Date();
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

    for (const [assetId, asset] of uniqueAssetsMap.entries()) {
      const lastFetched = new Date(asset.last_fetched_at);
      if (lastFetched < tenMinutesAgo || asset.current_price === 0) {
        const newPrice = await getLivePrice(asset.symbol, asset.type as "stock" | "crypto");
        if (newPrice > 0) {
          asset.current_price = newPrice;
          asset.last_fetched_at = now.toISOString();
          await supabase
            .from("investment_assets")
            .update({ current_price: newPrice, last_fetched_at: now.toISOString() })
            .eq("id", asset.id);
        }
      }
    }

    // Portfolio computation
    const portfolio: Record<string, any> = {};
    txs.forEach((tx: any) => {
      const asset = uniqueAssetsMap.get(tx.asset_id);
      if (!portfolio[asset.id]) {
        portfolio[asset.id] = {
          assetId: asset.id,
          symbol: asset.symbol,
          name: asset.name,
          type: asset.type,
          currentPrice: asset.current_price,
          totalQuantity: 0,
          totalInvested: 0,
          buysCount: 0,
          buysValue: 0,
        };
      }

      const p = portfolio[asset.id];
      if (tx.type === "buy") {
        p.totalQuantity += Number(tx.shares_quantity);
        p.totalInvested += (Number(tx.shares_quantity) * Number(tx.price_per_share)) + Number(tx.fee);
        p.buysCount += Number(tx.shares_quantity);
        p.buysValue += (Number(tx.shares_quantity) * Number(tx.price_per_share)) + Number(tx.fee);
      } else if (tx.type === "sell") {
        p.totalQuantity -= Number(tx.shares_quantity);
        // Average cost remains unchanged, but net invested decreases proportionally
        const avgCost = p.buysCount > 0 ? p.buysValue / p.buysCount : 0;
        p.totalInvested -= (Number(tx.shares_quantity) * avgCost);
      }
    });

    const portfolioList = Object.values(portfolio).map((p: any) => {
      const avgCost = p.buysCount > 0 ? p.buysValue / p.buysCount : 0;
      const currentValue = p.totalQuantity * p.currentPrice;
      const unrealizedPL = currentValue - (p.totalQuantity * avgCost);
      const unrealizedPLPercent = avgCost > 0 ? (unrealizedPL / (p.totalQuantity * avgCost)) * 100 : 0;

      return {
        ...p,
        avgCost,
        currentValue,
        unrealizedPL,
        unrealizedPLPercent,
      };
    }).filter(p => p.totalQuantity > 0);

    return NextResponse.json({ portfolio: portfolioList });
  }

  export async function POST(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { symbol, name, type, txType, shares, price, fee } = body;

    // Check if asset exists, create if not
    let { data: asset } = await supabase
      .from("investment_assets")
      .select("*")
      .eq("symbol", symbol.toUpperCase())
      .single();

    if (!asset) {
      const livePrice = await getLivePrice(symbol, type);
      const { data: newAsset, error: assetErr } = await supabase
        .from("investment_assets")
        .insert({
          symbol: symbol.toUpperCase(),
          name,
          type,
          current_price: livePrice || price,
          last_fetched_at: new Date().toISOString()
        })
        .select()
        .single();
      if (assetErr) return NextResponse.json({ error: assetErr.message }, { status: 400 });
      asset = newAsset;
    }

    // Insert transaction
    const { error: txErr } = await supabase
      .from("investment_transactions")
      .insert({
        user_id: user.id,
        asset_id: asset.id,
        type: txType,
        shares_quantity: shares,
        price_per_share: price,
        fee: fee || 0
      });

    if (txErr) return NextResponse.json({ error: txErr.message }, { status: 400 });
    return NextResponse.json({ success: true });
  }
  ```

- [ ] **Step 2: Create a scratch script to test local API endpoint**
  Create `c:\Users\yonos\.gemini\antigravity\brain\f8b937fb-8a74-4a4c-b391-be3d13c3aa72/scratch/test_api.js` to trigger a simulated fetch request on `/api/investments` using mock database connections or verifying syntax checks.

- [ ] **Step 3: Run typescript check to verify typescript compiler passes**
  Run: `pnpm tsc --noEmit`
  Expected: Build check passes.

- [ ] **Step 4: Commit**
  ```bash
  git add src/app/api/investments/route.ts
  git commit -m "feat: implement investments route handler with lazy-caching"
  ```

---

### Task 3: Layout Sidebar Integration

**Files:**
- Modify: `src/app/(dashboard)/layout.tsx`

- [ ] **Step 1: Import TrendingUp from Lucide-React**
  Add `TrendingUp` to the imported items from 'lucide-react' at the top of layout.tsx.
  ```typescript
  import { LayoutDashboard, Receipt, PiggyBank, FolderHeart, Lightbulb, LogOut, Sun, Moon, TrendingUp } from 'lucide-react';
  ```

- [ ] **Step 2: Add Inversiones navigation link**
  Insert the Link under Budgets option:
  ```typescript
  <Link id="nav-investments" href="/investments" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">
    <TrendingUp size={20} />
    <span>Inversiones</span>
  </Link>
  ```

- [ ] **Step 3: Compile and verify layout integrity**
  Run build command: `pnpm build`
  Expected: Compiles with exit code 0.

- [ ] **Step 4: Commit**
  ```bash
  git add src/app/(dashboard)/layout.tsx
  git commit -m "feat: add investments navigation link to sidebar"
  ```

---

### Task 4: Frontend Investments Tab Dashboard

**Files:**
- Create: `src/app/(dashboard)/investments/page.tsx`

**Interfaces:**
- Consumes: GET/POST endpoints `/api/investments`.
- Produces: Fully interactive visual page mapping holdings, portfolio value counter, allocations donut chart, transaction recording drawer form, and cost basis average indicators.

- [ ] **Step 1: Write the frontend component**
  Create `src/app/(dashboard)/investments/page.tsx`. Use Recharts for the allocation chart, `@gsap/react` for counter values on load, and styling following Interface Design guides. Include fields for name, symbol, type (stock/crypto), transaction type (buy/sell), amount, price, and fee inside the add transaction modal.

- [ ] **Step 2: Audit compiler errors**
  Run: `pnpm build`
  Expected: Build runs and completes successfully.

- [ ] **Step 3: Commit**
  ```bash
  git add src/app/(dashboard)/investments/page.tsx
  git commit -m "feat: build investments UI dashboard page with Recharts and GSAP"
  ```
