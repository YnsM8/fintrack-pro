# FinTrack Pro — Documento de Diseño Arquitectónico y Especificaciones

- **Fecha**: 2026-06-16
- **Estado**: Aprobado por el usuario
- **Arquitectura**: Cliente-Servidor Reactiva en Tiempo Real

---

## 1. Descripción General

FinTrack Pro es un sistema web premium de gestión de finanzas personales. Su arquitectura destaca por ser **reactiva y en tiempo real** (a través de suscripciones WebSockets de Supabase) y por incorporar soporte **multidivisa dinámico** (usando tipos de cambio actualizados diariamente mediante API). La interfaz de usuario es altamente estética, con soporte nativo para **temas duales (Light/Dark)** y micro-animaciones fluidas controladas por **GSAP**.

---

## 2. Arquitectura General y Flujo Reactivo

La aplicación utiliza un flujo basado en suscripciones de replicación en base de datos en tiempo real (CDC) y procesamiento asíncrono delegado en PostgreSQL.

### Componentes de la Arquitectura
1. **Frontend (Next.js 14+ App Router & Tailwind v4)**:
   - Componentes del servidor de React (RSC) para cargas iniciales optimizadas.
   - Componentes del cliente de React (RCC) para gráficos (Recharts) y animaciones fluidas (GSAP).
   - Suscripción directa del cliente al canal de WebSockets de Supabase.
2. **Backend (API REST & BFF)**:
   - Next.js Route Handlers para endpoints de escritura (`/api/transactions`, `/api/budgets`, `/api/goals`, `/api/categories`).
   - Endpoint `/api/cron/fetch-rates` para programar la actualización de divisas mediante una API externa.
3. **Persistencia y Motor de Reglas (Supabase / PostgreSQL)**:
   - Base de datos PostgreSQL con RLS (Row Level Security) activado en todas las tablas.
   - Triggers de base de datos para la conversión automática de divisas al insertar transacciones y la generación automática de alertas cuando se excede un presupuesto.

---

## 3. Modelo de Datos y Esquema SQL

A continuación se presenta el esquema detallado de la base de datos a crear mediante migraciones:

```sql
-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABLA: profiles (extiende auth.users de Supabase)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    base_currency TEXT NOT NULL DEFAULT 'USD' CHECK (base_currency IN ('USD', 'COP', 'MXN', 'EUR')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. TABLA: categories
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    icon TEXT NOT NULL DEFAULT '📁',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. TABLA: transactions
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

-- 4. TABLA: saving_goals
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

-- 5. TABLA: budgets (Presupuestos mensuales por categoría)
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

-- 6. TABLA: budget_alerts
CREATE TABLE public.budget_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    budget_id UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. TABLA: exchange_rates (Tipos de cambio respecto a USD como base)
CREATE TABLE public.exchange_rates (
    base_currency TEXT NOT NULL DEFAULT 'USD',
    target_currency TEXT NOT NULL,
    rate NUMERIC(12, 6) NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (base_currency, target_currency)
);
```

---

## 4. Políticas de Seguridad (RLS)

Habilitaremos RLS en cada una de las tablas del esquema para proteger los datos:

```sql
-- Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saving_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

-- Políticas para profiles
CREATE POLICY "Profiles - Select propio" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Profiles - Update propio" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Políticas para categorías
CREATE POLICY "Categories - Select" ON public.categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Categories - Insert" ON public.categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Categories - Update" ON public.categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Categories - Delete" ON public.categories FOR DELETE USING (auth.uid() = user_id);

-- Políticas para transacciones
CREATE POLICY "Transactions - Select" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Transactions - Insert" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Transactions - Update" ON public.transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Transactions - Delete" ON public.transactions FOR DELETE USING (auth.uid() = user_id);

-- Políticas para metas de ahorro
CREATE POLICY "Saving Goals - Select" ON public.saving_goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Saving Goals - Insert" ON public.saving_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Saving Goals - Update" ON public.saving_goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Saving Goals - Delete" ON public.saving_goals FOR DELETE USING (auth.uid() = user_id);

-- Políticas para presupuestos
CREATE POLICY "Budgets - Select" ON public.budgets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Budgets - Insert" ON public.budgets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Budgets - Update" ON public.budgets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Budgets - Delete" ON public.budgets FOR DELETE USING (auth.uid() = user_id);

-- Políticas para alertas
CREATE POLICY "Budget Alerts - Select" ON public.budget_alerts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Budget Alerts - Update" ON public.budget_alerts FOR UPDATE USING (auth.uid() = user_id);

-- Políticas para exchange_rates
CREATE POLICY "Exchange Rates - Lectura pública" ON public.exchange_rates FOR SELECT USING (auth.role() = 'authenticated');
```

---

## 5. Automatización de Base de Datos (Triggers)

### Conversión de Divisa de Transacciones
Este trigger se ejecuta antes de guardar una transacción. Busca el tipo de cambio respectivo a la divisa configurada en el perfil del usuario para convertir el monto a la divisa base.

```sql
CREATE OR REPLACE FUNCTION public.fn_convert_transaction_currency()
RETURNS TRIGGER AS $$
DECLARE
    u_base_currency TEXT;
    c_rate NUMERIC;
BEGIN
    -- Obtener la divisa base del usuario
    SELECT base_currency INTO u_base_currency FROM public.profiles WHERE id = NEW.user_id;
    
    IF NEW.currency = u_base_currency THEN
        NEW.base_amount := NEW.amount;
        NEW.exchange_rate := 1.0;
    ELSE
        -- Buscar la tasa en exchange_rates (asumiendo USD como base común de la API)
        -- Si NEW.currency = COP y u_base_currency = USD, la conversión se hace con la tasa directa
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
```

### Monitoreo de Presupuestos y Generación de Alertas
Controla de forma mensual los límites de gastos y emite alertas automáticamente.

```sql
CREATE OR REPLACE FUNCTION public.fn_check_budget_limits()
RETURNS TRIGGER AS $$
DECLARE
    b_limit NUMERIC;
    b_id UUID;
    total_spent NUMERIC;
    t_month INT;
    t_year INT;
BEGIN
    -- Solo procesar gastos
    IF NEW.type = 'expense' THEN
        t_month := EXTRACT(MONTH FROM NEW.transaction_date);
        t_year := EXTRACT(YEAR FROM NEW.transaction_date);
        
        -- Buscar presupuesto configurado
        SELECT id, limit_amount INTO b_id, b_limit 
        FROM public.budgets 
        WHERE user_id = NEW.user_id AND category_id = NEW.category_id AND month = t_month AND year = t_year;
        
        IF b_id IS NOT NULL THEN
            -- Sumar gastos en la misma categoría, mes y año convertidos a base_currency
            SELECT COALESCE(SUM(base_amount), 0) INTO total_spent 
            FROM public.transactions 
            WHERE user_id = NEW.user_id AND category_id = NEW.category_id 
              AND type = 'expense'
              AND EXTRACT(MONTH FROM transaction_date) = t_month 
              AND EXTRACT(YEAR FROM transaction_date) = t_year;
            
            -- Verificar si excede el 90%
            IF total_spent >= b_limit THEN
                INSERT INTO public.budget_alerts (user_id, budget_id, message)
                VALUES (
                    NEW.user_id, 
                    b_id, 
                    'Has superado el límite de presupuesto para la categoría. Límite: ' || b_limit || ', Gastado: ' || total_spent
                );
            ELSIF total_spent >= (b_limit * 0.9) THEN
                INSERT INTO public.budget_alerts (user_id, budget_id, message)
                VALUES (
                    NEW.user_id, 
                    b_id, 
                    'Has consumido más del 90% de tu presupuesto en esta categoría. Límite: ' || b_limit || ', Gastado: ' || total_spent
                );
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_check_budget_limits
AFTER INSERT OR UPDATE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.fn_check_budget_limits();
```

---

## 6. Animaciones GSAP (GreenSock)

Para lograr el efecto visual premium solicitado, se estructurará la animación de la siguiente manera:

1. **Instalación**: `@gsap/react` y `gsap` se instalarán en el proyecto.
2. **Patrón de Animación (useGSAP)**:
   - Se creará una animación de contador dinámico en los componentes de KPI Card para simular el incremento del dinero.
   - Las barras de progreso de metas y presupuestos se animarán al cargar (`from` con un ancho de `0%` a su porcentaje real).
   - Animación staggered de las tarjetas del dashboard.

Ejemplo de Hook de Animación de Balance:
```typescript
import { useEffect, useRef } from "react";
import gsap from "gsap";

export function useAnimatedCounter(value: number, duration: number = 1.5) {
  const ref = useRef<HTMLSpanElement>(null);
  
  useEffect(() => {
    if (!ref.current) return;
    const obj = { val: 0 };
    gsap.to(obj, {
      val: value,
      duration,
      ease: "power2.out",
      onUpdate: () => {
        if (ref.current) {
          ref.current.innerText = new Intl.NumberFormat("es-ES", {
            style: "currency",
            currency: "USD",
          }).format(obj.val);
        }
      },
    });
  }, [value, duration]);

  return ref;
}
```

---

## 7. Plan de Exportación de Reportes

1. **PDF Export**:
   - Librería: `jspdf` y `jspdf-autotable`.
   - Generará un diseño en hoja tamaño carta con membrete azul/grisáceo, tabla con transacciones ordenadas por fecha, y KPIs consolidados del mes.
2. **Excel Export**:
   - Librería: `xlsx`.
   - Exportará un archivo `.xlsx` limpio y estructurado con el desglose de transacciones (incluyendo tasa de cambio, moneda original y consolidada).

---

## 8. Autoevaluación y Verificación del Spec

1. **Campos vacíos o placeholders**: No hay secciones incompletas o "TBD".
2. **Consistencia Interna**: Las divisas de transacciones y metas se asocian de forma coherente mediante la divisa base del perfil de usuario y la tabla de `exchange_rates`.
3. **Control del Scope**: El alcance abarca todo (MVP + Tiempo Real + Multidivisa + Alertas de Presupuesto + Exportaciones) y está segmentado adecuadamente para su ejecución en fases mediante migraciones y componentes específicos.
