'use client';
import { useRealtimeState } from '@/hooks/useRealtimeState';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Plus, Trash2, PiggyBank, Calendar, DollarSign } from 'lucide-react';

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

    const { error } = await supabase.from('saving_goals').insert({
      user_id: user.id,
      title,
      target_amount: parseFloat(targetAmount),
      current_amount: 0,
      currency,
      deadline: deadline || undefined
    });

    if (!error) {
      setTitle('');
      setTargetAmount('');
      setDeadline('');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar esta meta?')) {
      await supabase.from('saving_goals').delete().eq('id', id);
    }
  };

  return (
    <div className="space-y-8 relative">
      {/* Background radial glows */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10">
        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Metas de Ahorro</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Define tus objetivos financieros a corto y largo plazo</p>
      </div>

      {/* Goal creation Form */}
      <div className="bg-white/80 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 p-6 rounded-3xl shadow-xs backdrop-blur-xl relative z-10">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
          <div className="space-y-2">
            <label className="block text-slate-600 dark:text-slate-400 text-sm font-semibold">Nombre de la Meta</label>
            <input 
              id="goal-title" 
              type="text" 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              required 
              className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium" 
              placeholder="Ej. Auto Nuevo, Vacaciones"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-slate-600 dark:text-slate-400 text-sm font-semibold">Monto Objetivo</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">$</span>
              <input 
                id="goal-target" 
                type="number" 
                step="0.01" 
                value={targetAmount} 
                onChange={e => setTargetAmount(e.target.value)} 
                required 
                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl p-3 pl-8 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" 
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-slate-600 dark:text-slate-400 text-sm font-semibold">Divisa</label>
            <select 
              id="goal-currency" 
              value={currency} 
              onChange={e => setCurrency(e.target.value)} 
              className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
            >
              <option value="USD">USD</option>
              <option value="COP">COP</option>
              <option value="MXN">MXN</option>
              <option value="EUR">EUR</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-slate-600 dark:text-slate-400 text-sm font-semibold">Fecha Límite</label>
            <input 
              id="goal-date" 
              type="date" 
              value={deadline} 
              onChange={e => setDeadline(e.target.value)} 
              className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium" 
            />
          </div>

          <button 
            id="btn-add-goal" 
            type="submit" 
            className="md:col-span-4 bg-blue-600 hover:bg-blue-700 text-white font-bold p-3.5 rounded-xl transition-all shadow-lg hover:shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus size={18} />
            <span>Crear Meta de Ahorro</span>
          </button>
        </form>
      </div>

      {/* Goals Progress Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
        {goals.map(g => {
          const pct = Math.min((g.current_amount / g.target_amount) * 100, 100);
          return (
            <div 
              key={g.id} 
              className="bg-white/80 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 p-6 rounded-3xl shadow-xs backdrop-blur-xl space-y-4 hover:border-blue-500/50 transition-all duration-300 relative overflow-hidden"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <PiggyBank size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{g.title}</h3>
                    {g.deadline ? (
                      <div className="flex items-center space-x-1.5 text-xs text-slate-400 mt-0.5">
                        <Calendar size={12} />
                        <span>Fecha límite: {g.deadline}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 mt-0.5">Sin fecha límite</span>
                    )}
                  </div>
                </div>
                <button 
                  onClick={() => handleDelete(g.id)} 
                  className="text-slate-400 hover:text-rose-500 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all cursor-pointer"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400 font-semibold">
                  <span>Progreso de Ahorro</span>
                  <span className="font-bold font-mono">{pct.toFixed(0)}%</span>
                </div>
                
                <div className="flex items-baseline space-x-1">
                  <span className="text-3xl font-black font-mono tracking-tight text-blue-600 dark:text-blue-400">
                    ${g.current_amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-slate-400 font-semibold font-mono text-sm">
                    / ${g.target_amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })} {g.currency}
                  </span>
                </div>
              </div>

              {/* Progress track bar */}
              <div className="space-y-1">
                <div className="w-full bg-slate-100 dark:bg-slate-800/60 rounded-full h-3 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full shadow-md shadow-blue-500/20 transition-all duration-700 ease-out" 
                    style={{ width: `${pct}%` }}
                  ></div>
                </div>
              </div>
            </div>
          );
        })}
        {goals.length === 0 && (
          <div className="md:col-span-2 text-center py-12 bg-white/80 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-3xl backdrop-blur-xl">
            <PiggyBank size={48} className="mx-auto text-slate-400 mb-3" />
            <p className="text-slate-500 text-sm font-medium">No has creado metas de ahorro aún.</p>
          </div>
        )}
      </div>
    </div>
  );
}
