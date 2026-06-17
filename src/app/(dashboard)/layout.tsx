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
    <div className="flex min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-200">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-8">FinTrack Pro</h1>
          <nav className="space-y-2">
            <Link id="nav-dashboard" href="/" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">
              <LayoutDashboard size={20} />
              <span>Dashboard</span>
            </Link>
            <Link id="nav-transactions" href="/transactions" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">
              <Receipt size={20} />
              <span>Transacciones</span>
            </Link>
            <Link id="nav-categories" href="/categories" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">
              <FolderHeart size={20} />
              <span>Categorías</span>
            </Link>
            <Link id="nav-goals" href="/goals" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">
              <PiggyBank size={20} />
              <span>Metas</span>
            </Link>
            <Link id="nav-budgets" href="/budgets" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">
              <Lightbulb size={20} />
              <span>Presupuestos</span>
            </Link>
          </nav>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-4">
            <span className="text-xs text-slate-500 truncate max-w-[120px]">{email}</span>
            <button id="btn-theme-toggle" onClick={() => setDarkMode(!darkMode)} className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
          <button id="btn-logout" onClick={handleLogout} className="flex items-center space-x-3 p-3 rounded-lg w-full text-left text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-300 transition-colors">
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
