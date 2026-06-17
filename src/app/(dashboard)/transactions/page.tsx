'use client';
import { useRealtimeState } from '@/hooks/useRealtimeState';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { exportTransactionsToPDF } from '@/lib/export/pdf';
import { exportTransactionsToExcel } from '@/lib/export/excel';
import { Plus, Download, Calendar, Tag, CreditCard, ChevronRight, FileSpreadsheet, FileText } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  icon: string;
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
    <div className="space-y-8 relative">
      {/* Background blurs */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 left-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="flex justify-between items-center flex-wrap gap-4 relative z-10">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Transacciones</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Historial y registro de movimientos monetarios</p>
        </div>
        <div className="flex space-x-3">
          <button 
            id="btn-export-pdf" 
            onClick={() => exportTransactionsToPDF(transactions)} 
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold py-2.5 px-4 rounded-xl transition-all shadow-xs cursor-pointer border border-slate-200 dark:border-slate-800"
          >
            <FileText size={18} className="text-rose-500" />
            <span>Exportar PDF</span>
          </button>
          <button 
            id="btn-export-excel" 
            onClick={() => exportTransactionsToExcel(transactions)} 
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold py-2.5 px-4 rounded-xl transition-all shadow-xs cursor-pointer border border-slate-200 dark:border-slate-800"
          >
            <FileSpreadsheet size={18} className="text-emerald-500" />
            <span>Exportar Excel</span>
          </button>
        </div>
      </div>
      
      {/* Creation form */}
      <div className="bg-white/80 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 p-6 rounded-3xl shadow-xs backdrop-blur-xl relative z-10">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="block text-slate-600 dark:text-slate-400 text-sm font-semibold">Monto</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">$</span>
              <input 
                id="tx-amount" 
                type="number" 
                step="0.01" 
                value={amount} 
                onChange={e => setAmount(e.target.value)} 
                required 
                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl p-3 pl-8 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" 
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-slate-600 dark:text-slate-400 text-sm font-semibold">Divisa</label>
            <select 
              id="tx-currency" 
              value={currency} 
              onChange={e => setCurrency(e.target.value as any)} 
              className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
            >
              <option value="USD">USD</option>
              <option value="COP">COP</option>
              <option value="MXN">MXN</option>
              <option value="EUR">EUR</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-slate-600 dark:text-slate-400 text-sm font-semibold">Tipo de Transacción</label>
            <select 
              id="tx-type" 
              value={type} 
              onChange={e => setType(e.target.value as any)} 
              className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
            >
              <option value="expense">Gasto</option>
              <option value="income">Ingreso</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-slate-600 dark:text-slate-400 text-sm font-semibold">Categoría</label>
            <select 
              id="tx-category" 
              value={categoryId} 
              onChange={e => setCategoryId(e.target.value)} 
              className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            >
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-slate-600 dark:text-slate-400 text-sm font-semibold">Descripción</label>
            <input 
              id="tx-desc" 
              type="text" 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium" 
              placeholder="Ej. Almuerzo, Salario"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-slate-600 dark:text-slate-400 text-sm font-semibold">Fecha</label>
            <input 
              id="tx-date" 
              type="date" 
              value={date} 
              onChange={e => setDate(e.target.value)} 
              className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium" 
            />
          </div>

          <button 
            id="btn-add-tx" 
            type="submit" 
            className="md:col-span-3 bg-blue-600 hover:bg-blue-700 text-white font-bold p-3.5 rounded-xl transition-all shadow-lg hover:shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus size={18} />
            <span>Registrar Transacción</span>
          </button>
        </form>
      </div>

      {/* History table */}
      <div className="bg-white/80 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-3xl shadow-xs backdrop-blur-xl overflow-hidden relative z-10">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-100/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-bold">
                <th className="p-4 pl-6">Fecha</th>
                <th className="p-4">Descripción</th>
                <th className="p-4">Categoría</th>
                <th className="p-4">Tipo</th>
                <th className="p-4 pr-6 text-right">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-700 dark:text-slate-300">
              {transactions.map(t => {
                const cat = categories.find(c => c.id === t.category_id);
                return (
                  <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                    <td className="p-4 pl-6 font-mono text-xs">{t.transaction_date}</td>
                    <td className="p-4 font-semibold text-slate-900 dark:text-white group-hover:text-blue-500 transition-colors">
                      {t.description || 'Sin descripción'}
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold">
                        <span>{cat?.icon || '🏷️'}</span>
                        <span>{cat?.name || 'General'}</span>
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                        t.type === 'income' 
                          ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/40' 
                          : 'bg-rose-950/40 text-rose-400 border border-rose-800/40'
                      }`}>
                        {t.type === 'income' ? 'Ingreso' : 'Gasto'}
                      </span>
                    </td>
                    <td className={`p-4 pr-6 text-right font-black font-mono tracking-tight ${
                      t.type === 'income' ? 'text-emerald-500' : 'text-rose-500'
                    }`}>
                      {t.type === 'income' ? '+' : '-'}${Number(t.amount).toFixed(2)} <span className="text-xs text-slate-400 font-semibold">{t.currency}</span>
                    </td>
                  </tr>
                );
              })}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    No hay transacciones registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
