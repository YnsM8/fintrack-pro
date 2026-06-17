# FinTrack Pro — Especificación de Diseño: Módulo de Inversiones y Portafolio

- **Fecha**: 2026-06-17
- **Estado**: Aprobado por el usuario
- **Tema**: Módulo de Transacciones de Compra/Venta y Seguimiento de Portafolio en Tiempo Real (Stocks & Crypto)

---

## 1. Descripción del Módulo

El Módulo de Inversiones y Portafolio añade soporte para registrar transacciones de compra y venta de activos (acciones, ETFs y criptomonedas). Integra APIs públicas y gratuitas para obtener cotizaciones en tiempo real, implementando una arquitectura de caché perezosa (Lazy-Caching) de 10 minutos en base de datos para evitar la saturación de cuotas de API. El frontend muestra KPIs clave de rendimiento, un gráfico de asignación interactivo, un registro detallado de transacciones, y un visualizador personalizado de costo promedio.

---

## 2. Esquema de Base de Datos (SQL)

Se crearán las siguientes tablas y políticas de seguridad RLS en PostgreSQL:

```sql
-- 1. TABLA: investment_assets (Activos registrados y su precio actual)
CREATE TABLE public.investment_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol TEXT NOT NULL UNIQUE,          -- p. ej. 'BTC', 'AAPL', 'ETH', 'TSLA'
    name TEXT NOT NULL,                  -- p. ej. 'Bitcoin', 'Apple Inc.'
    type TEXT NOT NULL CHECK (type IN ('stock', 'crypto')),
    current_price NUMERIC(16, 6) NOT NULL DEFAULT 0.0,
    last_fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. TABLA: investment_transactions (Ledger de compra y venta por usuario)
CREATE TABLE public.investment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES public.investment_assets(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('buy', 'sell')),
    shares_quantity NUMERIC(16, 8) NOT NULL CHECK (shares_quantity > 0),
    price_per_share NUMERIC(16, 6) NOT NULL CHECK (price_per_share > 0),
    fee NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
    transaction_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.investment_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investment_transactions ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
CREATE POLICY "Investment Assets - Lectura Autenticados" ON public.investment_assets
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Investment Transactions - Select" ON public.investment_transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Investment Transactions - Insert" ON public.investment_transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Investment Transactions - Delete" ON public.investment_transactions
    FOR DELETE USING (auth.uid() = user_id);
```

---

## 3. Integración de APIs Externas

Para obtener cotizaciones sin requerir claves de API del usuario ni incurrir en costes:
1. **Acciones / ETFs**: Se consume la API pública de gráficos de Yahoo Finance:
   `https://query1.finance.yahoo.com/v8/finance/chart/{symbol}`
   *Retorna el precio actual en `chart.result[0].meta.regularMarketPrice`*.
2. **Criptomonedas**: Se consume la API Simple de CoinGecko:
   `https://api.coingecko.com/api/v3/simple/price?ids={coin_id}&vs_currencies=usd`
   *Mapeo de símbolos a IDs en el backend (ej. BTC -> bitcoin, ETH -> ethereum, SOL -> solana)*.

---

## 4. Lógica de Negocio y Algoritmos (BFF API `/api/investments`)

El endpoint resolverá las siguientes métricas para el portafolio del usuario:

### Algoritmo de Cálculo por Activo
Para cada activo en posesión del usuario:
1. **Cantidad Total Poseída**:
   $$Q = \sum Q_{\text{compra}} - \sum Q_{\text{venta}}$$
2. **Costo Promedio (Average Cost Basis)**:
   $$\text{Avg Cost} = \frac{\sum (Q_{\text{compra}} \times P_{\text{compra}}) + \sum \text{Fees}}{\sum Q_{\text{compra}}}$$
3. **Valor de Mercado Actual**:
   $$\text{Current Value} = Q \times P_{\text{actual}}$$
4. **Rendimiento Latente (Unrealized P/L)**:
   $$\text{Gain/Loss} = \text{Current Value} - (Q \times \text{Avg Cost})$$

### Lógica de Caché en Base de Datos (BFF)
Cuando se solicita el portafolio, el backend:
1. Identifica los activos únicos con saldo mayor a cero.
2. Si `last_fetched_at` es menor a hace 10 minutos, realiza una llamada a la API externa respectiva.
3. Actualiza `current_price` y `last_fetched_at` en `investment_assets`.
4. Si la API falla, usa el precio en caché y registra un aviso.

---

## 5. Diseño de Interfaz y Experiencia (UX/UI)

### Componentes Visuales (Inter)
* **Barra de Cotizaciones Activas (Ticker Tape)**: Cinta superior minimalista con los símbolos de los activos en el portafolio del usuario que muestra variaciones porcentuales de las últimas 24h.
* **Métricas Clave (KPI Grid)**:
  * Valor de Mercado Total (JetBrains Mono, animado con GSAP).
  * Costo Total Invertido.
  * Margen de Ganancia / Pérdida total con colores semánticos (`text-emerald-500` / `text-rose-500`).
* **Visualizador de Costo Promedio (Signature)**:
  * Barra horizontal con el precio de compra promedio posicionado visualmente en relación con el precio más bajo y más alto del día actual de mercado.
* **Formulario de Transacciones (Modal)**:
  * Selección intuitiva de Activo, Dirección (Compra/Venta), Cantidad, Precio y Comisión.

### Animaciones GSAP
* **Contador de Rendimiento**: Ticker dinámico en el KPI de Valor de Mercado que incrementa en milisegundos al cargar la vista.
* **Staggered Cards**: Las secciones de la pantalla se despliegan secuencialmente utilizando el hook `useGSAP` de GreenSock.

---

## 6. Autoevaluación y Verificación

1. **Variables y Modelos Completos**: El esquema SQL cubre todas las propiedades del portafolio (fees, quantities, types).
2. **Consistencia**: El costo promedio es independiente de las ventas parciales (método contable estándar).
3. **Resiliencia**: Si la API está caída o el mercado está cerrado, se utiliza el último valor almacenado en caché.
