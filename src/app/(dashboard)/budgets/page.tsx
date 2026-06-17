'use client';
import { useRealtimeState } from '@/hooks/useRealtimeState';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { TrendingUp, Trash2, PiggyBank, Plus, CheckCircle } from 'lucide-react';

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
  const [showSuccess, setShowSuccess] = useState(false);
  const supabase = createClient();

  useEffect(() => {
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

    const { error } = await supabase.from('budgets').upsert({
      user_id: user.id,
      category_id: categoryId,
      limit_amount: parseFloat(limitAmount),
      month: Number(month),
      year: Number(year)
    }, { onConflict: 'user_id,category_id,month,year' });

    if (!error) {
      setLimitAmount('');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar este presupuesto?')) {
      await supabase.from('budgets').delete().eq('id', id);
    }
  };

  const getSpentAmount = (catId: string, bMonth: number, bYear: number) => {
    return transactions
      .filter(t => {
        if (t.category_id !== catId || t.type !== 'expense') return false;
        const parts = t.transaction_date.split('-');
        if (parts.length === 3) {
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10);
          return y === bYear && m === bMonth;
        }
        const d = new Date(t.transaction_date);
        return d.getFullYear() === bYear && (d.getMonth() + 1) === bMonth;
      })
      .reduce((acc, curr) => acc + Number(curr.base_amount || curr.amount), 0);
  };

  const expenseCategories = categories.filter(c => c.type === 'expense');

  return (
    <div className="space-y-8 relative">
      {/* Background radial blurs */}
      <div className="absolute top-0 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="flex justify-between items-center relative z-10">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Presupuestos Mensuales</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Controla tus gastos estableciendo límites máximos de consumo</p>
        </div>
      </div>

      {/* Form Card */}
      <div className="bg-white/80 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 p-6 rounded-3xl shadow-xs backdrop-blur-xl relative z-10">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
          <div className="space-y-2">
            <label className="block text-slate-600 dark:text-slate-400 text-sm font-semibold">Categoría de Gasto</label>
            <select 
              id="budget-category" 
              value={categoryId} 
              onChange={e => setCategoryId(e.target.value)} 
              required 
              className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            >
              <option value="" disabled>Seleccionar categoría...</option>
              {expenseCategories.map(c => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-slate-600 dark:text-slate-400 text-sm font-semibold">Límite Mensual (USD Base)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">$</span>
              <input 
                id="budget-limit" 
                type="number" 
                step="0.01" 
                value={limitAmount} 
                onChange={e => setLimitAmount(e.target.value)} 
                required 
                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl p-3 pl-8 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                placeholder="0.00" 
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-slate-600 dark:text-slate-400 text-sm font-semibold">Período (Mes / Año)</label>
            <div className="grid grid-cols-2 gap-2">
              <select 
                id="budget-month" 
                value={month} 
                onChange={e => setMonth(Number(e.target.value))} 
                className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-center"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
                ))}
              </select>
              <input 
                id="budget-year" 
                type="number" 
                value={year} 
                onChange={e => setYear(Number(e.target.value))} 
                required 
                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-center"
              />
            </div>
          </div>

          <button 
            id="btn-add-budget" 
            type="submit" 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold p-3.5 rounded-xl transition-all shadow-lg hover:shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus size={18} />
            <span>Establecer Límite</span>
          </button>
        </form>

        {showSuccess && (
          <div className="mt-4 flex items-center gap-2 text-emerald-500 font-semibold text-sm animate-fade-in">
            <CheckCircle size={16} />
            <span>Presupuesto guardado correctamente.</span>
          </div>
        )}
      </div>

      {/* Budgets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
        {budgets.map(b => {
          const cat = categories.find(c => c.id === b.category_id);
          if (!cat) return null;
          const spent = getSpentAmount(b.category_id, b.month, b.year);
          const pct = Math.min((spent / b.limit_amount) * 100, 100);
          const isOver = spent > b.limit_amount;

          return (
            <div 
              key={b.id} 
              className={`bg-white/80 dark:bg-slate-900/40 border p-6 rounded-3xl shadow-xs backdrop-blur-xl space-y-4 relative overflow-hidden transition-all duration-300 hover:scale-[1.01] ${
                isOver ? 'border-rose-500/50 shadow-rose-500/5' : 'border-slate-200 dark:border-slate-800/80 hover:border-blue-500/50'
              }`}
            >
              {isOver && (
                <div className="absolute top-0 right-0 bg-gradient-to-l from-rose-500 to-red-600 text-white text-[10px] uppercase tracking-wider font-extrabold px-3.5 py-1.5 rounded-bl-xl shadow-md">
                  Límite Excedido
                </div>
              )}
              <div className="flex justify-between items-start">
                <div className="flex items-center space-x-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-3xl">
                    {cat.icon || '💸'}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{cat.name}</h3>
                    <p className="text-slate-400 text-xs font-semibold">Período: {b.month.toString().padStart(2, '0')}/{b.year}</p>
                  </div>
                </div>
                <button 
                  onClick={() => handleDelete(b.id)} 
                  className="text-slate-400 hover:text-rose-500 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all cursor-pointer"
                  title="Eliminar presupuesto"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Gastado</span>
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Límite</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className={`text-2xl font-black font-mono tracking-tight ${isOver ? 'text-rose-500' : 'text-slate-900 dark:text-white'}`}>
                    ${spent.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-slate-400 font-mono font-semibold">
                    / ${b.limit_amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Advanced progress track */}
              <div className="space-y-1">
                <div className="w-full bg-slate-100 dark:bg-slate-800/80 rounded-full h-3.5 overflow-hidden p-0.5">
                  <div 
                    className={`h-2.5 rounded-full transition-all duration-700 ease-out bg-gradient-to-r ${
                      isOver ? 'from-rose-500 to-red-600 shadow-lg shadow-rose-500/20' : 'from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20'
                    }`}
                    style={{ width: `${pct}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-[11px] font-mono text-slate-400">
                  <span>{pct.toFixed(0)}% del límite</span>
                  <span>
                    {isOver 
                      ? `Excedido por $${(spent - b.limit_amount).toLocaleString('es-ES', { maximumFractionDigits: 0 })}` 
                      : `Disponible: $${(b.limit_amount - spent).toLocaleString('es-ES', { maximumFractionDigits: 0 })}`
                    }
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        {budgets.length === 0 && (
          <div className="md:col-span-2 text-center py-12 bg-white/80 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-3xl backdrop-blur-xl">
            <PiggyBank size={48} className="mx-auto text-slate-400 mb-3" />
            <p className="text-slate-500 text-sm font-medium">No has establecido límites de presupuesto para ningún mes.</p>
          </div>
        )}
      </div>
    </div>
  );
}
