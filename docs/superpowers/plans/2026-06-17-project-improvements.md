# FinTrack Pro — Plan de Implementación de Mejoras

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement critical security fixes (RLS), align with Next.js 16 conventions (proxy.ts), optimize browser client performance (singleton), secure public cron endpoints, and resolve performance waterfalls inside the investments module.

**Architecture:** Use PostgreSQL migrations to enable missing RLS update policies, apply singleton caching on the client browser instantiation, rename and restructure Next.js middleware using the v16 proxy convention, add header-based token authorization for CRON routines, and use concurrent promises to parallelize external API price fetches.

**Tech Stack:** Next.js 16.2.9, React 19.2.4, Supabase (with `@supabase/ssr`), PostgreSQL.

## Global Constraints
- Next.js 16 proxy convention requires `proxy.ts` exporting `proxy()` and `proxyConfig`.
- Do not bypass RLS policies; always define the least-privilege security settings.
- Avoid introducing any TS errors or compile failures.

---

### Task 1: Add RLS Update Policy on `investment_assets`

**Files:**
- Create: `supabase/migrations/20260617000002_investment_assets_rls_update.sql`

**Interfaces:**
- Consumes: `public.investment_assets` database table.
- Produces: Allow authenticated users to update cached prices and timestamp fields on assets in the database.

- [ ] **Step 1: Write migration query**
  Create the migration file `supabase/migrations/20260617000002_investment_assets_rls_update.sql` with:
  ```sql
  CREATE POLICY "Allow update of assets for authenticated" 
  ON public.investment_assets 
  FOR UPDATE TO authenticated 
  USING (true);
  ```

- [ ] **Step 2: Apply the migration using supabase MCP or CLI**
  Run the migration on the project's Supabase instance.
  
- [ ] **Step 3: Verify policies are active**
  Select active policies from `pg_policies` to verify that "Allow update of assets for authenticated" is registered on table `investment_assets`.

- [ ] **Step 4: Commit changes**
  ```bash
  git add supabase/migrations/20260617000002_investment_assets_rls_update.sql
  git commit -m "db: add RLS update policy for investment_assets"
  ```

---

### Task 2: Migrate Next.js Middleware to Proxy (Next.js 16 Convention)

**Files:**
- Delete: `src/middleware.ts`
- Create: `src/proxy.ts`

**Interfaces:**
- Consumes: Next.js Request/Response flow.
- Produces: Session refreshes and routing security guards under v16 specification.

- [ ] **Step 1: Create `src/proxy.ts`**
  Move the logic from `src/middleware.ts` to `src/proxy.ts` and rename the functions and exports:
  - Rename `middleware` function to `proxy`.
  - Rename `config` matcher object to `proxyConfig`.
  ```typescript
  import { createServerClient } from '@supabase/ssr';
  import { NextResponse, type NextRequest } from 'next/server';

  export async function proxy(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
      request,
    });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            supabaseResponse = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();

    const isAuthPage = request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/register');
    const isApiRoute = request.nextUrl.pathname.startsWith('/api');
    const isRootPath = request.nextUrl.pathname === '/';

    if (!user && !isAuthPage && !isRootPath && !isApiRoute) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    if (user && isAuthPage) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return supabaseResponse;
  }

  export const proxyConfig = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
  };
  ```

- [ ] **Step 2: Delete the old `src/middleware.ts`**
  Remove the obsolete `src/middleware.ts` file from the repository.

- [ ] **Step 3: Run typescript check to verify compile safety**
  Run: `pnpm exec tsc --noEmit`
  Expected: PASS with no compile errors.

- [ ] **Step 4: Commit changes**
  ```bash
  git rm src/middleware.ts
  git add src/proxy.ts
  git commit -m "refactor: migrate middleware to Next.js 16 proxy convention"
  ```

---

### Task 3: Cache Supabase Browser Client (Singleton Pattern)

**Files:**
- Modify: `src/lib/supabase/client.ts`

**Interfaces:**
- Consumes: Supabase `@supabase/ssr` library.
- Produces: Single reusable browser client instance to avoid multiple concurrent websocket channels.

- [ ] **Step 1: Implement singleton browser client caching**
  Update `src/lib/supabase/client.ts` to cache and reuse the client:
  ```typescript
  import { createBrowserClient } from '@supabase/ssr';

  let supabaseBrowserClient: ReturnType<typeof createBrowserClient> | null = null;

  export function createClient() {
    if (!supabaseBrowserClient) {
      supabaseBrowserClient = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
    }
    return supabaseBrowserClient;
  }
  ```

- [ ] **Step 2: Verify typescript compiler safety**
  Run: `pnpm exec tsc --noEmit`
  Expected: PASS

- [ ] **Step 3: Commit changes**
  ```bash
  git add src/lib/supabase/client.ts
  git commit -m "perf: cache browser Supabase client using singleton pattern"
  ```

---

### Task 4: Secure Cron Route Handler

**Files:**
- Modify: `src/app/api/cron/fetch-rates/route.ts`
- Modify: `.env.local`

**Interfaces:**
- Consumes: `process.env.CRON_SECRET` variable, request authorization headers.
- Produces: Reject unauthorized requests to the public exchange rate updater.

- [ ] **Step 1: Update `.env.local` to define a CRON_SECRET**
  Add `CRON_SECRET=sb_cron_secret_key_2026` to `.env.local`.

- [ ] **Step 2: Implement authorization validation in Route Handler**
  Update `src/app/api/cron/fetch-rates/route.ts` to gating requests:
  ```typescript
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
  ```

- [ ] **Step 3: Commit changes**
  ```bash
  git add src/app/api/cron/fetch-rates/route.ts .env.local
  git commit -m "security: protect fetch-rates cron route handler with CRON_SECRET"
  ```

---

### Task 5: Eliminate API Performance Waterfalls in Investments Route GET

**Files:**
- Modify: `src/app/api/investments/route.ts`

**Interfaces:**
- Consumes: Outdated or stale cache entries from `investment_assets`.
- Produces: Concurrent live price checks and updates via `Promise.all`.

- [ ] **Step 1: Refactor price fetching and database updates with Promise.all**
  Update the GET request block inside `src/app/api/investments/route.ts` around line 70-89:
  ```typescript
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
  ```

- [ ] **Step 2: Verify compile status**
  Run: `pnpm exec tsc --noEmit`
  Expected: PASS

- [ ] **Step 3: Commit changes**
  ```bash
  git add src/app/api/investments/route.ts
  git commit -m "perf: fetch stale prices in parallel using Promise.all"
  ```

---

### Task 6: Add Backend Transaction Consistency Validation (API POST)

**Files:**
- Modify: `src/app/api/investments/route.ts`

**Interfaces:**
- Consumes: Investment buy/sell transactions data.
- Produces: Prevent selling more shares of an asset than the user currently possesses.

- [ ] **Step 1: Check existing balance on sell transactions**
  Add balance verification logic right before inserting the new transaction inside the `POST` route in `src/app/api/investments/route.ts` (before line 196):
  ```typescript
      // If it is a sell transaction, validate user balance
      if (txType === 'sell') {
        const { data: userTxs, error: fetchTxErr } = await supabase
          .from('investment_transactions')
          .select('shares_quantity, type')
          .eq('user_id', user.id)
          .eq('asset_id', asset.id);

        if (fetchTxErr) {
          return NextResponse.json({ error: fetchTxErr.message }, { status: 400 });
        }

        let ownedShares = 0;
        if (userTxs) {
          userTxs.forEach((tx: any) => {
            if (tx.type === 'buy') {
              ownedShares += Number(tx.shares_quantity);
            } else if (tx.type === 'sell') {
              ownedShares -= Number(tx.shares_quantity);
            }
          });
        }

        if (ownedShares < Number(shares)) {
          return NextResponse.json({ 
            error: `Fondos/acciones insuficientes para realizar la venta. Posee: ${ownedShares}, intenta vender: ${shares}` 
          }, { status: 400 });
        }
      }
  ```

- [ ] **Step 2: Verify compile status**
  Run: `pnpm exec tsc --noEmit`
  Expected: PASS

- [ ] **Step 3: Commit changes**
  ```bash
  git add src/app/api/investments/route.ts
  git commit -m "feat: validate asset balance before inserting sell transactions"
  ```
