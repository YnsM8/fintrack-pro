# FinTrack Pro Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build FinTrack Pro, a real-time, multi-currency personal finance tracker with automated budget alerts, interactive dashboards, and PDF/Excel report exports.

**Architecture:** Client-Server Reactiva en Tiempo Real with Next.js App Router, Tailwind CSS v4, and GSAP animations. Database, Auth, and Real-time syncing are handled by Supabase (PostgreSQL), utilizing DB Triggers to process currency conversion and budget threshold calculations automatically.

**Tech Stack:** Next.js 14+, TypeScript, Tailwind CSS v4, GSAP (@gsap/react), Recharts, Supabase Client SDK, jsPDF, SheetJS (xlsx), Lucide React.

## Global Constraints
- All backend calculations must occur in PostgreSQL via Triggers to guarantee consistency.
- Next.js must run using the App Router with the `src/` directory layout.
- Styling must use Tailwind CSS v4 (configured via CSS imports with PostCSS).
- Every interactive component must have unique, descriptive IDs for visual and functional testing.
- RLS must be active on every database table, filtering by `auth.uid() = user_id`.

---

### Task 1: Scaffolding and Dependencies

**Files:**
- Create: `postcss.config.mjs`
- Modify: `src/app/globals.css`, `package.json`

**Interfaces:**
- Consumes: None (Initialization task)
- Produces: Base project structure and installed dependencies.

- [ ] **Step 1: Bootstrap Next.js App in temporary directory**
  Run: `npx -y create-next-app@latest tmp-app --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes`
  Expected: Next.js project scaffolded in `tmp-app/`.

- [ ] **Step 2: Move files to root workspace**
  Run in PowerShell:
  ```powershell
  Move-Item -Path .\tmp-app\* -Destination .\ -Force
  Move-Item -Path .\tmp-app\.* -Destination .\ -Force
  Remove-Item -Path .\tmp-app -Recurse -Force
  ```
  Expected: Next.js boilerplate files now reside at the root of `c:\Semana14`.

- [ ] **Step 3: Install required dependencies**
  Run: `npm install @supabase/supabase-js @supabase/ssr gsap @gsap/react recharts jspdf jspdf-autotable xlsx lucide-react`
  Expected: Dependencies added to `package.json`.

- [ ] **Step 4: Install Tailwind CSS v4 and PostCSS support**
  Run: `npm install tailwindcss@4 @tailwindcss/postcss@4 postcss@8`
  Expected: TailwindCSS v4 installed.

- [ ] **Step 5: Write PostCSS Configuration**
  Write to `postcss.config.mjs`:
  ```javascript
  export default {
    plugins: {
      '@tailwindcss/postcss': {},
    },
  };
  ```

- [ ] **Step 6: Update `globals.css` for Tailwind v4**
  Replace contents of `src/app/globals.css` with:
  ```css
  @import "tailwindcss";

  @theme {
    --color-primary: #1e40af;
    --color-secondary: #0f172a;
    --color-accent: #3b82f6;
  }

  body {
    background-color: var(--color-secondary);
    color: #f8fafc;
    font-family: 'Inter', sans-serif;
  }
  ```

- [ ] **Step 7: Run dev server to verify setup**
  Run: `npm run dev`
  Expected: Server starts without compiling errors on port 3000.

- [ ] **Step 8: Commit**
  Run:
  ```bash
  git add .
  git commit -m "chore: scaffold project with nextjs 14, tailwind v4, and dependencies"
  ```

---

### Task 2: Supabase Migrations and DB Triggers

**Files:**
- Create: `supabase/migrations/20260616000000_init_fintrackpro.sql`

**Interfaces:**
- Consumes: Supabase database connection.
- Produces: Complete database schema with profiles, categories, transactions, budgets, alerts, and triggers.

- [ ] **Step 1: Write SQL migration file**
  Write to `supabase/migrations/20260616000000_init_fintrackpro.sql`:
  ```sql
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
  ```

- [ ] **Step 2: Apply migration to Supabase Project**
  Use `mcp_supabase_apply_migration` to run the above DDL against the new project.
  Expected: Schema, RLS, triggers and base rates successfully deployed to Supabase.

- [ ] **Step 3: Commit**
  Run:
  ```bash
  git add supabase/
  git commit -m "db: apply database schema, RLS policies, and PostgreSQL triggers"
  ```

---

### Task 3: Supabase Clients and Route protection Middleware

**Files:**
- Create: `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/middleware.ts`

**Interfaces:**
- Consumes: `process.env.NEXT_PUBLIC_SUPABASE_URL`, `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Produces: Supabase clients for both browser and server runtime, and automatic route guarding.

- [ ] **Step 1: Write Browser client**
  Write to `src/lib/supabase/client.ts`:
  ```typescript
  import { createBrowserClient } from '@supabase/ssr';

  export function createClient() {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  ```

- [ ] **Step 2: Write Server client**
  Write to `src/lib/supabase/server.ts`:
  ```typescript
  import { createServerClient } from '@supabase/ssr';
  import { cookies } from 'next/headers';

  export function createClient() {
    const cookieStore = cookies();
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    );
  }
  ```

- [ ] **Step 3: Write Route protection middleware**
  Write to `src/middleware.ts`:
  ```typescript
  import { createServerClient } from '@supabase/ssr';
  import { NextResponse, type NextRequest } from 'next/server';

  export async function middleware(request: NextRequest) {
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
            cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
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

    if (!user && !isAuthPage && !isApiRoute) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    if (user && isAuthPage) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    return supabaseResponse;
  }

  export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
  };
  ```

- [ ] **Step 4: Commit**
  Run:
  ```bash
  git add src/lib/supabase src/middleware.ts
  git commit -m "feat: add supabase browser/server clients and session protection middleware"
  ```

---

### Task 4: Auth UI with GSAP animations

**Files:**
- Create: `src/app/(auth)/login/page.tsx`, `src/app/(auth)/register/page.tsx`

**Interfaces:**
- Consumes: Supabase auth client methods (`signInWithPassword`, `signUp`).
- Produces: Visual login/register forms with animated entrances.

- [ ] **Step 1: Write Login Page with GSAP fade-in**
  Write to `src/app/(auth)/login/page.tsx`:
  ```tsx
  'use client';
  import { useState, useRef } from 'react';
  import { useRouter } from 'next/navigation';
  import { createClient } from '@/lib/supabase/client';
  import { useGSAP } from '@gsap/react';
  import gsap from 'gsap';

  export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const supabase = createClient();

    useGSAP(() => {
      gsap.from(containerRef.current, {
        opacity: 0,
        y: 40,
        duration: 1,
        ease: 'power3.out',
      });
    }, { scope: containerRef });

    const handleLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
      } else {
        router.push('/');
        router.refresh();
      }
    };

    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
        <div ref={containerRef} className="w-full max-w-md rounded-2xl bg-slate-900 p-8 shadow-2xl border border-slate-800">
          <h2 className="text-3xl font-bold text-center text-white mb-6">FinTrack Pro</h2>
          {error && <div className="mb-4 text-red-500 text-sm">{error}</div>}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-slate-400 mb-1">Correo Electrónico</label>
              <input id="login-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white" />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Contraseña</label>
              <input id="login-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white" />
            </div>
            <button id="btn-login" type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold p-2.5 rounded-lg transition-colors">Iniciar Sesión</button>
          </form>
          <p className="text-center text-slate-500 text-sm mt-4">
            ¿No tienes cuenta? <a href="/register" className="text-blue-500 hover:underline">Regístrate</a>
          </p>
        </div>
      </div>
    );
  }
  ```

- [ ] **Step 2: Write Register Page**
  Write to `src/app/(auth)/register/page.tsx` incorporating a profile creation mechanism upon successful sign up.
  ```tsx
  'use client';
  import { useState, useRef } from 'react';
  import { useRouter } from 'next/navigation';
  import { createClient } from '@/lib/supabase/client';
  import { useGSAP } from '@gsap/react';
  import gsap from 'gsap';

  export default function RegisterPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [error, setError] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const supabase = createClient();

    useGSAP(() => {
      gsap.from(containerRef.current, {
        opacity: 0,
        y: 40,
        duration: 1,
        ease: 'power3.out',
      });
    }, { scope: containerRef });

    const handleRegister = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
      
      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (data.user) {
        // Insert custom profile data
        const { error: profileError } = await supabase.from('profiles').insert({
          id: data.user.id,
          email,
          full_name: fullName,
          base_currency: 'USD'
        });
        
        if (profileError) {
          setError(profileError.message);
        } else {
          router.push('/');
          router.refresh();
        }
      }
    };

    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
        <div ref={containerRef} className="w-full max-w-md rounded-2xl bg-slate-900 p-8 shadow-2xl border border-slate-800">
          <h2 className="text-3xl font-bold text-center text-white mb-6">Registro FinTrack Pro</h2>
          {error && <div className="mb-4 text-red-500 text-sm">{error}</div>}
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-slate-400 mb-1">Nombre Completo</label>
              <input id="register-name" type="text" value={fullName} onChange={e => setFullName(e.target.value)} required className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white" />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Correo Electrónico</label>
              <input id="register-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white" />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Contraseña</label>
              <input id="register-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white" />
            </div>
            <button id="btn-register" type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold p-2.5 rounded-lg transition-colors">Crear Cuenta</button>
          </form>
          <p className="text-center text-slate-500 text-sm mt-4">
            ¿Ya tienes cuenta? <a href="/login" className="text-blue-500 hover:underline">Ingresa aquí</a>
          </p>
        </div>
      </div>
    );
  }
  ```

- [ ] **Step 3: Commit**
  Run:
  ```bash
  git add src/app/\(auth\)
  git commit -m "feat: implement login and registration pages with gsap entrance animations"
  ```

---

### Task 5: Backend API Route Handlers

**Files:**
- Create: `src/app/api/categories/route.ts`, `src/app/api/transactions/route.ts`, `src/app/api/budgets/route.ts`, `src/app/api/cron/fetch-rates/route.ts`

**Interfaces:**
- Consumes: Database client libraries, incoming JSON payloads, external ExchangeRate API.
- Produces: JSON response format matching the project specs.

- [ ] **Step 1: Write API categories route handler**
  Write to `src/app/api/categories/route.ts`:
  ```typescript
  import { createClient } from '@/lib/supabase/server';
  import { NextResponse } from 'next/server';

  export async function GET() {
    const supabase = createClient();
    const { data, error } = await supabase.from('categories').select('*');
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    return NextResponse.json({ success: true, data });
  }

  export async function POST(request: Request) {
    const supabase = createClient();
    const body = await request.json();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabase.from('categories').insert({
      user_id: user.id,
      name: body.name,
      type: body.type,
      icon: body.icon
    }).select().single();

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    return NextResponse.json({ success: true, data });
  }
  ```

- [ ] **Step 2: Write API transactions route handler**
  Write to `src/app/api/transactions/route.ts`:
  ```typescript
  import { createClient } from '@/lib/supabase/server';
  import { NextResponse } from 'next/server';

  export async function GET() {
    const supabase = createClient();
    const { data, error } = await supabase.from('transactions').select('*, category_id(*)').order('transaction_date', { ascending: false });
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    return NextResponse.json({ success: true, data });
  }

  export async function POST(request: Request) {
    const supabase = createClient();
    const body = await request.json();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabase.from('transactions').insert({
      user_id: user.id,
      category_id: body.category_id,
      type: body.type,
      amount: body.amount,
      currency: body.currency,
      description: body.description,
      transaction_date: body.transaction_date
    }).select().single();

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    return NextResponse.json({ success: true, data });
  }
  ```

- [ ] **Step 3: Write API budgets route handler**
  Write to `src/app/api/budgets/route.ts`:
  ```typescript
  import { createClient } from '@/lib/supabase/server';
  import { NextResponse } from 'next/server';

  export async function GET() {
    const supabase = createClient();
    const { data, error } = await supabase.from('budgets').select('*, category_id(*)');
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    return NextResponse.json({ success: true, data });
  }

  export async function POST(request: Request) {
    const supabase = createClient();
    const body = await request.json();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabase.from('budgets').upsert({
      user_id: user.id,
      category_id: body.category_id,
      limit_amount: body.limit_amount,
      month: body.month,
      year: body.year
    }, { onConflict: 'user_id,category_id,month,year' }).select().single();

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    return NextResponse.json({ success: true, data });
  }
  ```

- [ ] **Step 4: Write Exchange Rate Updater API**
  Write to `src/app/api/cron/fetch-rates/route.ts` using fetch to access `https://open.er-api.com/v6/latest/USD` and saving target rates dynamically:
  ```typescript
  import { createClient } from '@supabase/supabase-js';
  import { NextResponse } from 'next/server';

  // Direct service role client to bypass user restrictions for script updating
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  export async function GET() {
    try {
      const res = await fetch('https://open.er-api.com/v6/latest/USD');
      const data = await res.json();
      if (!data || !data.rates) {
        throw new Error('Could not pull exchange rates.');
      }

      const ratesToStore = [
        { base_currency: 'USD', target_currency: 'COP', rate: data.rates.COP },
        { base_currency: 'USD', target_currency: 'MXN', rate: data.rates.MXN },
        { base_currency: 'USD', target_currency: 'EUR', rate: data.rates.EUR }
      ];

      for (const item of ratesToStore) {
        await supabase.from('exchange_rates').upsert(item, { onConflict: 'base_currency,target_currency' });
      }

      return NextResponse.json({ success: true, updated: ratesToStore });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  }
  ```

- [ ] **Step 5: Commit**
  Run:
  ```bash
  git add src/app/api
  git commit -m "feat: add api route handlers for categories, transactions, budgets and cron exchange rates"
  ```

---

### Task 5.5: Save Goals API Route Handlers

**Files:**
- Create: `src/app/api/goals/route.ts`

**Interfaces:**
- Consumes: Supabase database connection and JSON payload representing saving goals
- Produces: API response for creating and fetching goals

- [ ] **Step 1: Write API goals route handler**
  Write to `src/app/api/goals/route.ts`:
  ```typescript
  import { createClient } from '@/lib/supabase/server';
  import { NextResponse } from 'next/server';

  export async function GET() {
    const supabase = createClient();
    const { data, error } = await supabase.from('saving_goals').select('*');
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    return NextResponse.json({ success: true, data });
  }

  export async function POST(request: Request) {
    const supabase = createClient();
    const body = await request.json();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabase.from('saving_goals').insert({
      user_id: user.id,
      title: body.title,
      target_amount: body.target_amount,
      current_amount: body.current_amount || 0.0,
      currency: body.currency,
      deadline: body.deadline
    }).select().single();

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    return NextResponse.json({ success: true, data });
  }
  ```

- [ ] **Step 2: Commit**
  Run:
  ```bash
  git add src/app/api/goals
  git commit -m "feat: add api route handler for saving goals"
  ```

---

### Task 6: Custom Hook for Real-time WebSocket Synchronization

**Files:**
- Create: `src/hooks/useRealtimeState.ts`

**Interfaces:**
- Consumes: A table name and initial state array.
- Produces: State variable synced in real-time with insertions, updates, and deletions on that table.

- [ ] **Step 1: Create Real-time React Hook**
  Write to `src/hooks/useRealtimeState.ts`:
  ```typescript
  import { useEffect, useState } from 'react';
  import { createClient } from '@/lib/supabase/client';

  export function useRealtimeState<T extends { id: string }>(
    tableName: string,
    initialState: T[] = []
  ) {
    const [state, setState] = useState<T[]>(initialState);
    const supabase = createClient();

    useEffect(() => {
      // Load initial values
      const fetchInitial = async () => {
        const { data } = await supabase.from(tableName).select('*');
        if (data) setState(data as T[]);
      };
      fetchInitial();

      // Subscribe to real-time events
      const channel = supabase
        .channel(`realtime-changes-${tableName}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: tableName },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              setState((prev) => [...prev, payload.new as T]);
            } else if (payload.eventType === 'UPDATE') {
              setState((prev) =>
                prev.map((item) => (item.id === payload.new.id ? (payload.new as T) : item))
              );
            } else if (payload.eventType === 'DELETE') {
              setState((prev) => prev.filter((item) => item.id === payload.old.id));
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }, [tableName]);

    return [state, setState] as const;
  }
  ```

- [ ] **Step 2: Commit**
  Run:
  ```bash
  git add src/hooks
  git commit -m "feat: add useRealtimeState hook for real-time synchronization via web sockets"
  ```

---

### Task 7: Theme Context and Main Dashboard Layout

**Files:**
- Create: `src/app/(dashboard)/layout.tsx`

**Interfaces:**
- Consumes: React node children.
- Produces: Premium HTML wrapper containing the sidebar navigation, dark mode toggler, and custom layout.

- [ ] **Step 1: Write layout layout page**
  Write to `src/app/(dashboard)/layout.tsx`:
  ```tsx
  'use client';
  import { useEffect, useState } from 'react';
  import { useRouter } from 'next/navigation';
  import { createClient } from '@/lib/supabase/client';
  import { LayoutDashboard, Receipt, PiggyBank, FolderHeart, Lightbulb, LogOut, Sun, Moon } from 'lucide-react';
  import Link from 'next/link';

  export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const [darkMode, setDarkMode] = useState(true);
    const [email, setEmail] = useState('');
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
      const getProfile = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) setEmail(user.email || '');
      };
      getProfile();
    }, []);

    useEffect(() => {
      const root = window.document.documentElement;
      if (darkMode) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }, [darkMode]);

    const handleLogout = async () => {
      await supabase.auth.signOut();
      router.push('/login');
      router.refresh();
    };

    return (
      <div className="flex min-h-screen bg-slate-950 text-slate-100 dark:bg-slate-950 dark:text-slate-100 light:bg-slate-50 light:text-slate-900 transition-colors duration-200">
        {/* Sidebar */}
        <aside className="w-64 bg-slate-900 border-r border-slate-800 p-6 flex flex-col justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white mb-8">FinTrack Pro</h1>
            <nav className="space-y-2">
              <Link id="nav-dashboard" href="/" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-slate-800 transition-colors text-slate-300 hover:text-white">
                <LayoutDashboard size={20} />
                <span>Dashboard</span>
              </Link>
              <Link id="nav-transactions" href="/transactions" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-slate-800 transition-colors text-slate-300 hover:text-white">
                <Receipt size={20} />
                <span>Transacciones</span>
              </Link>
              <Link id="nav-categories" href="/categories" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-slate-800 transition-colors text-slate-300 hover:text-white">
                <FolderHeart size={20} />
                <span>Categorías</span>
              </Link>
              <Link id="nav-goals" href="/goals" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-slate-800 transition-colors text-slate-300 hover:text-white">
                <PiggyBank size={20} />
                <span>Metas</span>
              </Link>
              <Link id="nav-budgets" href="/budgets" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-slate-800 transition-colors text-slate-300 hover:text-white">
                <Lightbulb size={20} />
                <span>Presupuestos</span>
              </Link>
            </nav>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between border-t border-slate-800 pt-4">
              <span className="text-xs text-slate-500 truncate max-w-[120px]">{email}</span>
              <button id="btn-theme-toggle" onClick={() => setDarkMode(!darkMode)} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white">
                {darkMode ? <Sun size={16} /> : <Moon size={16} />}
              </button>
            </div>
            <button id="btn-logout" onClick={handleLogout} className="flex items-center space-x-3 p-3 rounded-lg w-full text-left text-red-400 hover:bg-red-950/30 hover:text-red-300 transition-colors">
              <LogOut size={20} />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </aside>
        
        {/* Main Workspace */}
        <main className="flex-1 p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    );
  }
  ```

- [ ] **Step 2: Commit**
  Run:
  ```bash
  git add src/app/\(dashboard\)/layout.tsx
  git commit -m "feat: design visual dashboard layout, navigation sidebar, and theme toggle selector"
  ```

---

### Task 8: Dashboard with GSAP Counters and Recharts

**Files:**
- Create: `src/app/(dashboard)/page.tsx`

**Interfaces:**
- Consumes: `useRealtimeState` hook for table updates.
- Produces: Dynamic Dashboard page with animated charts, budget warnings, and running numeric counters.

- [ ] **Step 1: Create Dashboard UI**
  Write to `src/app/(dashboard)/page.tsx`:
  ```tsx
  'use client';
  import { useRealtimeState } from '@/hooks/useRealtimeState';
  import { useEffect, useRef, useState } from 'react';
  import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
  import { useGSAP } from '@gsap/react';
  import gsap from 'gsap';
  import { Bell } from 'lucide-react';

  interface Transaction {
    id: string;
    type: 'income' | 'expense';
    amount: number;
    base_amount: number;
    currency: string;
    description: string;
    transaction_date: string;
  }

  interface Alert {
    id: string;
    message: string;
    is_read: boolean;
  }

  export default function Dashboard() {
    const [transactions] = useRealtimeState<Transaction>('transactions');
    const [alerts] = useRealtimeState<Alert>('budget_alerts');
    const balanceRef = useRef<HTMLDivElement>(null);
    const incomeRef = useRef<HTMLDivElement>(null);
    const expenseRef = useRef<HTMLDivElement>(null);

    const [totals, setTotals] = useState({ balance: 0, income: 0, expense: 0 });

    useEffect(() => {
      const inc = transactions.filter(t => t.type === 'income').reduce((acc, c) => acc + Number(c.base_amount), 0);
      const exp = transactions.filter(t => t.type === 'expense').reduce((acc, c) => acc + Number(c.base_amount), 0);
      setTotals({ balance: inc - exp, income: inc, expense: exp });
    }, [transactions]);

    useGSAP(() => {
      // Counter Animation
      const animateCount = (ref: HTMLDivElement | null, targetVal: number) => {
        if (!ref) return;
        const obj = { val: 0 };
        gsap.to(obj, {
          val: targetVal,
          duration: 1.2,
          ease: 'power2.out',
          onUpdate: () => {
            if (ref) {
              ref.innerText = `$${obj.val.toFixed(2)}`;
            }
          }
        });
      };

      animateCount(balanceRef.current, totals.balance);
      animateCount(incomeRef.current, totals.income);
      animateCount(expenseRef.current, totals.expense);
    }, [totals]);

    // Format charts data
    const pieData = [
      { name: 'Ingresos', value: totals.income },
      { name: 'Gastos', value: totals.expense }
    ];
    const COLORS = ['#10b981', '#ef4444'];

    const monthlyTrends = [
      { name: 'Consolidado', Ingresos: totals.income, Gastos: totals.expense }
    ];

    return (
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold text-white">Dashboard Financiero</h2>
          {/* Alerts Feed */}
          {alerts.length > 0 && (
            <div className="flex items-center space-x-2 bg-yellow-950/40 border border-yellow-800 text-yellow-300 px-4 py-2 rounded-lg max-w-sm animate-pulse">
              <Bell size={18} />
              <span className="text-sm truncate">{alerts[alerts.length - 1].message}</span>
            </div>
          )}
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <h3 className="text-slate-400 text-sm mb-2">Balance General (USD Base)</h3>
            <div ref={balanceRef} className="text-4xl font-extrabold text-blue-400">$0.00</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <h3 className="text-slate-400 text-sm mb-2">Total Ingresos</h3>
            <div ref={incomeRef} className="text-4xl font-extrabold text-emerald-400">$0.00</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <h3 className="text-slate-400 text-sm mb-2">Total Gastos</h3>
            <div ref={expenseRef} className="text-4xl font-extrabold text-red-400">$0.00</div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <h3 className="text-white text-lg font-bold mb-4">Ingresos vs Gastos</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTrends}>
                  <XAxis dataKey="name" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none' }} />
                  <Legend />
                  <Bar dataKey="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between">
            <h3 className="text-white text-lg font-bold mb-4">Distribución del Saldo</h3>
            <div className="h-64 flex justify-center items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none' }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Recents list */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <h3 className="text-white text-lg font-bold mb-4">Transacciones Recientes</h3>
          <div className="space-y-3">
            {transactions.slice(0, 5).map(t => (
              <div key={t.id} className="flex justify-between items-center border-b border-slate-800 pb-2">
                <div>
                  <div className="font-semibold text-white">{t.description || 'Sin descripción'}</div>
                  <div className="text-xs text-slate-500">{t.transaction_date}</div>
                </div>
                <div className={`font-bold ${t.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {t.type === 'income' ? '+' : '-'}${Number(t.amount).toFixed(2)} {t.currency}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  ```

- [ ] **Step 2: Commit**
  Run:
  ```bash
  git add src/app/\(dashboard\)/page.tsx
  git commit -m "feat: develop dashboard components, dynamic graphs and running gsap counter animations"
  ```

---

### Task 9: CRUD Pages for Transactions and Goals

**Files:**
- Create: `src/app/(dashboard)/transactions/page.tsx`, `src/app/(dashboard)/goals/page.tsx`

**Interfaces:**
- Consumes: `useRealtimeState` hook for reactive updates, Supabase browser client for POST/DELETE operations.
- Produces: Visual tables, filters, and transaction/saving goal registration triggers.

- [ ] **Step 1: Write Transactions Management Page**
  Write to `src/app/(dashboard)/transactions/page.tsx`:
  ```tsx
  'use client';
  import { useRealtimeState } from '@/hooks/useRealtimeState';
  import { useState, useEffect } from 'react';
  import { createClient } from '@/lib/supabase/client';

  interface Category {
    id: string;
    name: string;
    type: 'income' | 'expense';
  }

  interface Transaction {
    id: string;
    type: 'income' | 'expense';
    amount: number;
    currency: 'USD' | 'COP' | 'MXN' | 'EUR';
    description: string;
    category_id: string;
    transaction_date: string;
  }

  export default function TransactionsPage() {
    const [transactions] = useRealtimeState<Transaction>('transactions');
    const [categories, setCategories] = useState<Category[]>([]);
    const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState<'USD' | 'COP' | 'MXN' | 'EUR'>('USD');
    const [type, setType] = useState<'income' | 'expense'>('expense');
    const [categoryId, setCategoryId] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState('');
    const supabase = createClient();

    useEffect(() => {
      const getCats = async () => {
        const { data } = await supabase.from('categories').select('*');
        if (data) {
          setCategories(data);
          if (data.length > 0) setCategoryId(data[0].id);
        }
      };
      getCats();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('transactions').insert({
        user_id: user.id,
        category_id: categoryId,
        type,
        amount: parseFloat(amount),
        currency,
        description,
        transaction_date: date || undefined
      });

      setAmount('');
      setDescription('');
    };

    return (
      <div className="space-y-8">
        <h2 className="text-3xl font-bold text-white">Transacciones</h2>
        
        {/* Create Transaction form */}
        <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-slate-400 text-sm mb-1">Monto</label>
            <input id="tx-amount" type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white" />
          </div>
          <div>
            <label className="block text-slate-400 text-sm mb-1">Divisa</label>
            <select id="tx-currency" value={currency} onChange={e => setCurrency(e.target.value as any)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white">
              <option value="USD">USD</option>
              <option value="COP">COP</option>
              <option value="MXN">MXN</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
          <div>
            <label className="block text-slate-400 text-sm mb-1">Tipo</label>
            <select id="tx-type" value={type} onChange={e => setType(e.target.value as any)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white">
              <option value="expense">Gasto</option>
              <option value="income">Ingreso</option>
            </select>
          </div>
          <div>
            <label className="block text-slate-400 text-sm mb-1">Categoría</label>
            <select id="tx-category" value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white">
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-slate-400 text-sm mb-1">Descripción</label>
            <input id="tx-desc" type="text" value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white" />
          </div>
          <div>
            <label className="block text-slate-400 text-sm mb-1">Fecha</label>
            <input id="tx-date" type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white" />
          </div>
          <button id="btn-add-tx" type="submit" className="md:col-span-3 bg-blue-600 hover:bg-blue-700 text-white font-bold p-2.5 rounded-lg transition-colors">Registrar Transacción</button>
        </form>

        {/* Transactions Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-800 border-b border-slate-700 text-slate-400 text-sm">
                <th className="p-4">Fecha</th>
                <th className="p-4">Descripción</th>
                <th className="p-4">Tipo</th>
                <th className="p-4">Monto</th>
                <th className="p-4">Divisa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {transactions.map(t => (
                <tr key={t.id} className="hover:bg-slate-800/40">
                  <td className="p-4">{t.transaction_date}</td>
                  <td className="p-4">{t.description || 'Sin descripción'}</td>
                  <td className="p-4 font-semibold capitalize">{t.type === 'income' ? 'Ingreso' : 'Gasto'}</td>
                  <td className={`p-4 font-bold ${t.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                    ${Number(t.amount).toFixed(2)}
                  </td>
                  <td className="p-4">{t.currency}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
  ```

- [ ] **Step 2: Write Goals Management Page**
  Write to `src/app/(dashboard)/goals/page.tsx`:
  ```tsx
  'use client';
  import { useRealtimeState } from '@/hooks/useRealtimeState';
  import { useState } from 'react';
  import { createClient } from '@/lib/supabase/client';

  interface Goal {
    id: string;
    title: string;
    target_amount: number;
    current_amount: number;
    currency: string;
    deadline: string;
  }

  export default function GoalsPage() {
    const [goals] = useRealtimeState<Goal>('saving_goals');
    const [title, setTitle] = useState('');
    const [targetAmount, setTargetAmount] = useState('');
    const [currency, setCurrency] = useState('USD');
    const [deadline, setDeadline] = useState('');
    const supabase = createClient();

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('saving_goals').insert({
        user_id: user.id,
        title,
        target_amount: parseFloat(targetAmount),
        current_amount: 0,
        currency,
        deadline: deadline || undefined
      });

      setTitle('');
      setTargetAmount('');
    };

    return (
      <div className="space-y-8">
        <h2 className="text-3xl font-bold text-white">Metas de Ahorro</h2>

        {/* Create goal form */}
        <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-slate-400 text-sm mb-1">Nombre de la Meta</label>
            <input id="goal-title" type="text" value={title} onChange={e => setTitle(e.target.value)} required className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white" />
          </div>
          <div>
            <label className="block text-slate-400 text-sm mb-1">Monto Objetivo</label>
            <input id="goal-target" type="number" step="0.01" value={targetAmount} onChange={e => setTargetAmount(e.target.value)} required className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white" />
          </div>
          <div>
            <label className="block text-slate-400 text-sm mb-1">Divisa</label>
            <select id="goal-currency" value={currency} onChange={e => setCurrency(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white">
              <option value="USD">USD</option>
              <option value="COP">COP</option>
              <option value="MXN">MXN</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
          <div>
            <label className="block text-slate-400 text-sm mb-1">Fecha Límite</label>
            <input id="goal-date" type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white" />
          </div>
          <button id="btn-add-goal" type="submit" className="md:col-span-4 bg-blue-600 hover:bg-blue-700 text-white font-bold p-2.5 rounded-lg transition-colors">Crear Meta</button>
        </form>

        {/* Goals Progress Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {goals.map(g => {
            const pct = Math.min((g.current_amount / g.target_amount) * 100, 100);
            return (
              <div key={g.id} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-white">{g.title}</h3>
                  <span className="text-slate-400 text-sm">Fecha límite: {g.deadline || 'Sin fecha'}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-300">
                  <span>${g.current_amount} / ${g.target_amount} {g.currency}</span>
                  <span>{pct.toFixed(1)}%</span>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
                  <div className="bg-blue-500 h-3 transition-all duration-500" style={{ width: `${pct}%` }}></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  ```

- [ ] **Step 3: Commit**
  Run:
  ```bash
  git add src/app/\(dashboard\)/transactions src/app/\(dashboard\)/goals
  git commit -m "feat: add management pages for transactions and saving goals with progress trackers"
  ```

---

### Task 10: PDF and Excel Export Actions

**Files:**
- Create: `src/lib/export/pdf.ts`, `src/lib/export/excel.ts`
- Modify: `src/app/(dashboard)/transactions/page.tsx`

**Interfaces:**
- Consumes: Arrays of Transaction data records.
- Produces: Prompts client downloads for PDF invoices and Excel files.

- [ ] **Step 1: Write PDF generation library**
  Write to `src/lib/export/pdf.ts`:
  ```typescript
  import jsPDF from 'jspdf';
  import 'jspdf-autotable';

  export function exportTransactionsToPDF(transactions: any[]) {
    const doc = new jsPDF() as any;
    doc.setFont('helvetica', 'normal');
    doc.text('FinTrack Pro - Reporte Financiero', 14, 20);

    const columns = ['Fecha', 'Descripción', 'Tipo', 'Monto', 'Divisa'];
    const rows = transactions.map((t) => [
      t.transaction_date,
      t.description || 'Sin descripción',
      t.type === 'income' ? 'Ingreso' : 'Gasto',
      `$${Number(t.amount).toFixed(2)}`,
      t.currency,
    ]);

    doc.autoTable({
      head: [columns],
      body: rows,
      startY: 28,
    });

    doc.save('FinTrackPro_Reporte.pdf');
  }
  ```

- [ ] **Step 2: Write Excel generation library**
  Write to `src/lib/export/excel.ts`:
  ```typescript
  import * as XLSX from 'xlsx';

  export function exportTransactionsToExcel(transactions: any[]) {
    const ws = XLSX.utils.json_to_sheet(
      transactions.map((t) => ({
        Fecha: t.transaction_date,
        Descripción: t.description || 'Sin descripción',
        Tipo: t.type === 'income' ? 'Ingreso' : 'Gasto',
        Monto: t.amount,
        Divisa: t.currency,
        'Monto Base (USD)': t.base_amount,
        'Tasa de Cambio': t.exchange_rate,
      }))
    );

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Transacciones');
    XLSX.writeFile(wb, 'FinTrackPro_Reporte.xlsx');
  }
  ```

- [ ] **Step 3: Add export buttons to Transactions UI**
  Insert export functions triggers inside `src/app/(dashboard)/transactions/page.tsx`.
  Modify `src/app/(dashboard)/transactions/page.tsx` using `replace_file_content` to add imports and export actions:
  ```typescript
  import { exportTransactionsToPDF } from '@/lib/export/pdf';
  import { exportTransactionsToExcel } from '@/lib/export/excel';
  ```
  And render buttons in the markup:
  ```tsx
  <div className="flex space-x-2">
    <button id="btn-export-pdf" onClick={() => exportTransactionsToPDF(transactions)} className="bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors">Exportar PDF</button>
    <button id="btn-export-excel" onClick={() => exportTransactionsToExcel(transactions)} className="bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors">Exportar Excel</button>
  </div>
  ```

- [ ] **Step 4: Commit**
  Run:
  ```bash
  git add src/lib/export/ src/app/\(dashboard\)/transactions/page.tsx
  git commit -m "feat: incorporate client side pdf and excel document exporting functionality"
  ```
