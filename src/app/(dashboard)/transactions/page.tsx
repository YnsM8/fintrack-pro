'use client';
import { useRealtimeState } from '@/hooks/useRealtimeState';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
}

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  currency: 'USD' | 'COP' | 'MXN' | 'EUR';
  description: string;
  category_id: string;
  transaction_date: string;
}

export default function TransactionsPage() {
  const [transactions] = useRealtimeState<Transaction>('transactions');
  const [categories, setCategories] = useState<Category[]>([]);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'USD' | 'COP' | 'MXN' | 'EUR'>('USD');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const supabase = createClient();

  useEffect(() => {
    const getCats = async () => {
      const { data } = await supabase.from('categories').select('*');
      if (data) {
        setCategories(data);
        if (data.length > 0) setCategoryId(data[0].id);
      }
    };
    getCats();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('transactions').insert({
      user_id: user.id,
      category_id: categoryId || undefined,
      type,
      amount: parseFloat(amount),
      currency,
      description,
      transaction_date: date || undefined
    });

    if (!error) {
      setAmount('');
      setDescription('');
    }
  };

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">Transacciones</h2>
      
      {/* Create Transaction form */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-slate-600 dark:text-slate-400 text-sm font-medium mb-1">Monto</label>
          <input id="tx-amount" type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-slate-600 dark:text-slate-400 text-sm font-medium mb-1">Divisa</label>
          <select id="tx-currency" value={currency} onChange={e => setCurrency(e.target.value as any)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="USD">USD</option>
            <option value="COP">COP</option>
            <option value="MXN">MXN</option>
            <option value="EUR">EUR</option>
          </select>
        </div>
        <div>
          <label className="block text-slate-600 dark:text-slate-400 text-sm font-medium mb-1">Tipo</label>
          <select id="tx-type" value={type} onChange={e => setType(e.target.value as any)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="expense">Gasto</option>
            <option value="income">Ingreso</option>
          </select>
        </div>
        <div>
          <label className="block text-slate-600 dark:text-slate-400 text-sm font-medium mb-1">Categoría</label>
          <select id="tx-category" value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-slate-600 dark:text-slate-400 text-sm font-medium mb-1">Descripción</label>
          <input id="tx-desc" type="text" value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-slate-600 dark:text-slate-400 text-sm font-medium mb-1">Fecha</label>
          <input id="tx-date" type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <button id="btn-add-tx" type="submit" className="md:col-span-3 bg-blue-600 hover:bg-blue-700 text-white font-bold p-3 rounded-xl transition-colors shadow-sm">Registrar Transacción</button>
      </form>

      {/* Transactions Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-sm">
              <th className="p-4 font-semibold">Fecha</th>
              <th className="p-4 font-semibold">Descripción</th>
              <th className="p-4 font-semibold">Tipo</th>
              <th className="p-4 font-semibold">Monto</th>
              <th className="p-4 font-semibold">Divisa</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
            {transactions.map(t => (
              <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                <td className="p-4">{t.transaction_date}</td>
                <td className="p-4">{t.description || 'Sin descripción'}</td>
                <td className="p-4 font-semibold capitalize">{t.type === 'income' ? 'Ingreso' : 'Gasto'}</td>
                <td className={`p-4 font-bold ${t.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  ${Number(t.amount).toFixed(2)}
                </td>
                <td className="p-4">{t.currency}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
