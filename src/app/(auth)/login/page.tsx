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
            <input id="login-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-slate-400 mb-1">Contraseña</label>
            <input id="login-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500" />
          </div>
          <button id="btn-login" type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold p-2.5 rounded-lg transition-colors cursor-pointer">Iniciar Sesión</button>
        </form>
        <p className="text-center text-slate-500 text-sm mt-4">
          ¿No tienes cuenta? <a href="/register" className="text-blue-500 hover:underline">Regístrate</a>
        </p>
      </div>
    </div>
  );
}
