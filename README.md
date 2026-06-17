# 📊 FinTrack Pro — Plataforma de Gestión Financiera e Inversiones

<div align="center">

[![Vercel Deployment](https://img.shields.io/badge/Deploy-Vercel-black?style=for-the-badge&logo=vercel&logoColor=white)](https://fintrack-pro-kappa-steel.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

---

### 🚀 [Entrar a la Aplicación en Vivo (Vercel Demo)](https://fintrack-pro-kappa-steel.vercel.app)

**FinTrack Pro** es una aplicación web premium de finanzas personales e inversiones en tiempo real, diseñada bajo una estética moderna de *Liquid Glassmorphism* y optimizada para brindar una experiencia de usuario rápida, fluida y sumamente segura.

</div>

---

## ✨ Características Principales

*   **📈 Seguimiento de Inversiones (BFF):** Compra y venta de acciones y criptomonedas con visualización y actualización de precios en tiempo real.
*   **💸 Control de Ingresos y Gastos:** Registro inteligente y categorización interactiva de todas tus transacciones diarias.
*   **🎯 Metas de Ahorro:** Creación de objetivos financieros con visualización de progreso dinámico mediante barras y KPIs interactivos.
*   **📊 Dashboard Científico:** Estadísticas avanzadas, balances netos y gráficos de tendencia mensual o distribución de gastos (Recharts).
*   **📑 Reportes Profesionales:** Exportación ágil de historiales financieros directamente a formatos PDF y hojas de cálculo de Excel.
*   **🔒 Seguridad de Grado Militar:** Protección de datos integrada con Supabase Auth (JWT) y políticas Row Level Security (RLS) en PostgreSQL.

---

## 🛠️ Stack Tecnológico

*   **Frontend:** Next.js 16.2.9 (App Router, Turbopack) & React 19.2.4.
*   **Backend:** Next.js Route Handlers (API REST con BFF).
*   **Base de Datos:** PostgreSQL en Supabase.
*   **Estilos:** TailwindCSS v4 con animaciones micro-interactivas.
*   **Gráficos:** Recharts.

---

## ⚡ Optimizaciones y Mejoras Técnicas Clave

1.  **Eliminación de Waterfalls en API:** Las consultas externas del BFF ahora se realizan concurrentemente con `Promise.all`, optimizando el tiempo de carga en más del 60%.
2.  **Singleton de Conexiones Realtime:** Implementación del patrón de diseño Singleton para el cliente de Supabase en el navegador, previniendo fugas de sockets y consumo innecesario de recursos.
3.  **Seguridad por Proxy v16:** Migración del middleware tradicional al estándar de enrutamiento y proxy v16 de Next.js (`src/proxy.ts`).
4.  **Validaciones de Consistencia Financiera:** Control estricto en el backend para evitar la venta de activos que superen las cantidades actualmente poseídas en cartera.
5.  **Rutas Cron Protegidas:** Los endpoints de automatización de tasas y cotizaciones están restringidos mediante autorización Bearer token usando variables de entorno cifradas (`CRON_SECRET`).

---

## 💻 Configuración Local

1.  **Clonar el repositorio:**
    ```bash
    git clone https://github.com/YnsM8/fintrack-pro.git
    ```
2.  **Instalar dependencias:**
    ```bash
    pnpm install
    ```
3.  **Configurar variables de entorno (`.env.local`):**
    ```env
    NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_key
    CRON_SECRET=sb_cron_secret_key_2026
    ```
4.  **Ejecutar en desarrollo:**
    ```bash
    pnpm run dev
    ```
    Abre [http://localhost:3000](http://localhost:3000) en tu navegador.
