'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { WebGLShader } from '@/components/web-gl-shader';
import { LiquidButton } from '@/components/liquid-glass-button';
import Link from 'next/link';
import { Logo } from '@/components/logo';
import { LayoutDashboard, LogIn, Sparkles, TrendingUp, ShieldCheck, HeartHandshake, Zap } from 'lucide-react';

export default function LandingPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);
      setLoading(false);
    };
    checkUser();
  }, []);

  return (
    <div className="relative min-h-screen text-slate-100 flex flex-col items-center justify-between overflow-hidden bg-black">
      {/* WebGL background shader */}
      <div className="absolute inset-0 z-0">
        <WebGLShader />
        {/* Dark vignette gradient overlay to make content perfectly readable */}
        <div className="absolute inset-0 bg-radial-gradient from-transparent via-black/40 to-black z-10" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/95 z-10" />
      </div>

      {/* Header bar */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex justify-between items-center relative z-20">
        <div className="flex items-center space-x-3">
          <Logo className="w-9 h-9" />
          <span className="text-2xl font-black tracking-tight text-white">FinTrack Pro</span>
        </div>

        <div className="flex items-center space-x-4">
          {!loading && (
            user ? (
              <Link href="/dashboard">
                <button className="bg-white/10 hover:bg-white/20 text-white font-bold py-2.5 px-5 rounded-2xl border border-white/20 transition-all backdrop-blur-md cursor-pointer flex items-center gap-2">
                  <LayoutDashboard size={16} />
                  <span>Dashboard</span>
                </button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <button className="text-slate-300 hover:text-white font-semibold py-2 px-4 transition-all cursor-pointer">
                    Iniciar Sesión
                  </button>
                </Link>
                <Link href="/register">
                  <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-2xl transition-all shadow-lg shadow-blue-500/20 cursor-pointer">
                    Comenzar Gratis
                  </button>
                </Link>
              </>
            )
          )}
        </div>
      </header>

      {/* Hero section */}
      <main className="w-full max-w-5xl mx-auto px-6 py-12 flex-1 flex flex-col items-center justify-center text-center relative z-20 space-y-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold uppercase tracking-widest animate-bounce">
          <Zap size={12} />
          <span>Gestión de Finanzas de Próxima Generación</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white max-w-4xl leading-tight">
          Toma el control absoluto de tu <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500 bg-clip-text text-transparent">futuro financiero</span>
        </h1>

        <p className="text-lg md:text-xl text-slate-400 max-w-2xl font-medium leading-relaxed">
          FinTrack Pro te ayuda a monitorear transacciones en tiempo real, proyectar presupuestos, definir metas de ahorro y visualizar tu patrimonio neto con gráficas RosenCharts interactivas de alta gama.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4 w-full sm:w-auto">
          {!loading && (
            user ? (
              <Link href="/dashboard" className="w-full sm:w-auto">
                <button className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-lg py-4 px-10 rounded-2xl transition-all shadow-xl shadow-blue-500/20 hover:scale-[1.02] cursor-pointer flex items-center justify-center gap-3">
                  <LayoutDashboard size={20} />
                  <span>Ir a mi Dashboard</span>
                </button>
              </Link>
            ) : (
              <>
                <Link href="/register" className="w-full sm:w-auto">
                  <button className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-lg py-4 px-10 rounded-2xl transition-all shadow-xl shadow-blue-500/20 hover:scale-[1.02] cursor-pointer flex items-center justify-center gap-2">
                    <span>Crear Cuenta Gratis</span>
                  </button>
                </Link>
                <Link href="/login" className="w-full sm:w-auto">
                  <button className="w-full sm:w-auto bg-white/5 hover:bg-white/10 text-white font-bold text-lg py-4 px-10 rounded-2xl border border-white/10 transition-all backdrop-blur-md cursor-pointer flex items-center justify-center gap-2">
                    <LogIn size={18} />
                    <span>Iniciar Sesión</span>
                  </button>
                </Link>
              </>
            )
          )}
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full pt-16 text-left">
          <div className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-3xl backdrop-blur-xl space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <TrendingUp size={20} />
            </div>
            <h3 className="text-lg font-bold text-white">RosenCharts de Alta Gama</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Analiza tus ingresos, egresos y el rendimiento de tus presupuestos a través de visualizaciones fluidas y optimizadas.
            </p>
          </div>

          <div className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-3xl backdrop-blur-xl space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Zap size={20} />
            </div>
            <h3 className="text-lg font-bold text-white">Multi-Moneda & Automatización</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Conversión automática del tipo de cambio utilizando tasas en tiempo real. Gestiona tus transacciones en USD, COP, MXN y EUR.
            </p>
          </div>

          <div className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-3xl backdrop-blur-xl space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ShieldCheck size={20} />
            </div>
            <h3 className="text-lg font-bold text-white">Seguridad de Nivel Financiero</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Tus datos están completamente encriptados y protegidos por las políticas de seguridad y autenticación seguras de Supabase.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-8 text-center text-xs text-slate-500 relative z-20 border-t border-slate-900 bg-black/60 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p>© {new Date().getFullYear()} FinTrack Pro. Todos los derechos reservados.</p>
          <div className="flex space-x-6">
            <span className="hover:text-slate-400 cursor-pointer">Privacidad</span>
            <span className="hover:text-slate-400 cursor-pointer">Términos</span>
            <span className="hover:text-slate-400 cursor-pointer">Soporte</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
