'use client';
import { useRealtimeState } from '@/hooks/useRealtimeState';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  icon: string;
}

interface Budget {
  id: string;
  category_id: string;
  limit_amount: number;
  month: number;
  year: number;
}

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  base_amount: number;
  category_id: string;
  currency: string;
  transaction_date: string;
}

export default function BudgetsPage() {
  const [budgets] = useRealtimeState<Budget>('budgets');
  const [categories] = useRealtimeState<Category>('categories');
  const [transactions] = useRealtimeState<Transaction>('transactions');
  
  const [categoryId, setCategoryId] = useState('');
  const [limitAmount, setLimitAmount] = useState('');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const supabase = createClient();

  useEffect(() => {
    // Select first expense category as default if available
    const expenseCats = categories.filter(c => c.type === 'expense');
    if (expenseCats.length > 0 && !categoryId) {
      setCategoryId(expenseCats[0].id);
    }
  }, [categories, categoryId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Use upsert to match /api/budgets/route.ts upsert criteria
    const { error } = await supabase.from('budgets').upsert({
      user_id: user.id,
      category_id: categoryId,
      limit_amount: parseFloat(limitAmount),
      month: Number(month),
      year: Number(year)
    }, { onConflict: 'user_id,category_id,month,year' });

    if (!error) {
      setLimitAmount('');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar este presupuesto?')) {
      await supabase.from('budgets').delete().eq('id', id);
    }
  };

  // Helper to calculate total spent in a specific category during month/year
  const getSpentAmount = (catId: string, bMonth: number, bYear: number) => {
    return transactions
      .filter(t => {
        if (t.category_id !== catId || t.type !== 'expense') return false;
        const d = new Date(t.transaction_date);
        // Date strings can be parsed in UTC or local, let's normalize or read split string
        // standard format is YYYY-MM-DD
        const parts = t.transaction_date.split('-');
        if (parts.length === 3) {
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10);
          return y === bYear && m === bMonth;
        }
        return d.getFullYear() === bYear && (d.getMonth() + 1) === bMonth;
      })
      .reduce((acc, curr) => acc + Number(curr.base_amount || curr.amount), 0);
  };

  const expenseCategories = categories.filter(c => c.type === 'expense');

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">Presupuestos Mensuales</h2>

      {/* Create / Edit Budget form */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div>
          <label className="block text-slate-600 dark:text-slate-400 text-sm font-medium mb-1">Categoría</label>
          <select id="budget-category" value={categoryId} onChange={e => setCategoryId(e.target.value)} required className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="" disabled>Seleccionar categoría...</option>
            {expenseCategories.map(c => (
              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-slate-600 dark:text-slate-400 text-sm font-medium mb-1">Límite Mensual (USD Base)</label>
          <input id="budget-limit" type="number" step="0.01" value={limitAmount} onChange={e => setLimitAmount(e.target.value)} required className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ej. 500" />
        </div>
        <div>
          <label className="block text-slate-600 dark:text-slate-400 text-sm font-medium mb-1">Mes / Año</label>
          <div className="grid grid-cols-2 gap-2">
            <select id="budget-month" value={month} onChange={e => setMonth(Number(e.target.value))} className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <input id="budget-year" type="number" value={year} onChange={e => setYear(Number(e.target.value))} required className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <button id="btn-add-budget" type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold p-3 rounded-xl transition-colors shadow-sm w-full">Establecer Límite</button>
      </form>

      {/* Budgets List with Progress */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {budgets.map(b => {
          const cat = categories.find(c => c.id === b.category_id);
          if (!cat) return null;
          const spent = getSpentAmount(b.category_id, b.month, b.year);
          const pct = Math.min((spent / b.limit_amount) * 100, 100);
          const isOver = spent > b.limit_amount;

          return (
            <div key={b.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-4 relative overflow-hidden">
              {isOver && (
                <div className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                  Límite Excedido
                </div>
              )}
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{cat.icon || '💸'}</span>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{cat.name}</h3>
                    <p className="text-slate-500 text-xs">Período: {b.month}/{b.year}</p>
                  </div>
                </div>
                <button onClick={() => handleDelete(b.id)} className="text-red-500 hover:text-red-700 text-sm font-semibold transition-colors">
                  Eliminar
                </button>
              </div>

              <div className="flex justify-between text-sm text-slate-600 dark:text-slate-300">
                <span>Gastado: <strong className={isOver ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'}>${spent.toFixed(2)}</strong> / ${b.limit_amount.toFixed(2)}</span>
                <span className="font-semibold">{pct.toFixed(1)}%</span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
                <div className={`${isOver ? 'bg-red-500' : 'bg-blue-500'} h-3 transition-all duration-500`} style={{ width: `${pct}%` }}></div>
              </div>
            </div>
          );
        })}
        {budgets.length === 0 && (
          <p className="text-slate-500 text-sm md:col-span-2">No has establecido límites de presupuesto para ningún mes.</p>
        )}
      </div>
    </div>
  );
}
