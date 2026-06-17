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
    
    // Register the user with full_name metadata so the DB trigger populates public.profiles automatically
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });
    
    if (signUpError) {
      setError(signUpError.message);
    } else {
      router.push('/');
      router.refresh();
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
            <input id="register-name" type="text" value={fullName} onChange={e => setFullName(e.target.value)} required className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-slate-400 mb-1">Correo Electrónico</label>
            <input id="register-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-slate-400 mb-1">Contraseña</label>
            <input id="register-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500" />
          </div>
          <button id="btn-register" type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold p-2.5 rounded-lg transition-colors cursor-pointer">Crear Cuenta</button>
        </form>
        <p className="text-center text-slate-500 text-sm mt-4">
          ¿Ya tienes cuenta? <a href="/login" className="text-blue-500 hover:underline">Ingresa aquí</a>
        </p>
      </div>
    </div>
  );
}
