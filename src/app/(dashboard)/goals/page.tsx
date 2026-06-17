'use client';
import { useRealtimeState } from '@/hooks/useRealtimeState';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

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
    }
  };

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">Metas de Ahorro</h2>

      {/* Create goal form */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-slate-600 dark:text-slate-400 text-sm font-medium mb-1">Nombre de la Meta</label>
          <input id="goal-title" type="text" value={title} onChange={e => setTitle(e.target.value)} required className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-slate-600 dark:text-slate-400 text-sm font-medium mb-1">Monto Objetivo</label>
          <input id="goal-target" type="number" step="0.01" value={targetAmount} onChange={e => setTargetAmount(e.target.value)} required className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-slate-600 dark:text-slate-400 text-sm font-medium mb-1">Divisa</label>
          <select id="goal-currency" value={currency} onChange={e => setCurrency(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="USD">USD</option>
            <option value="COP">COP</option>
            <option value="MXN">MXN</option>
            <option value="EUR">EUR</option>
          </select>
        </div>
        <div>
          <label className="block text-slate-600 dark:text-slate-400 text-sm font-medium mb-1">Fecha Límite</label>
          <input id="goal-date" type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <button id="btn-add-goal" type="submit" className="md:col-span-4 bg-blue-600 hover:bg-blue-700 text-white font-bold p-3 rounded-xl transition-colors shadow-sm">Crear Meta</button>
      </form>

      {/* Goals Progress Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {goals.map(g => {
          const pct = Math.min((g.current_amount / g.target_amount) * 100, 100);
          return (
            <div key={g.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{g.title}</h3>
                <span className="text-slate-500 dark:text-slate-400 text-sm">Fecha límite: {g.deadline || 'Sin fecha'}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-600 dark:text-slate-300">
                <span>${g.current_amount} / ${g.target_amount} {g.currency}</span>
                <span className="font-semibold">{pct.toFixed(1)}%</span>
              </div>
              {/* Progress bar */}
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
                <div className="bg-blue-500 h-3 transition-all duration-500" style={{ width: `${pct}%` }}></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
