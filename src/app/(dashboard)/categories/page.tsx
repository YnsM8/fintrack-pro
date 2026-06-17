'use client';
import { useRealtimeState } from '@/hooks/useRealtimeState';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Plus, Trash2, FolderHeart, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  icon: string;
}

const AVAILABLE_EMOJIS = ['🍔', '🛒', '🚗', '🏠', '💵', '💼', '📈', '🎮', '🏥', '🎓', '✈️', '🛍️', '🔌', '🍿', '🏋️', '🧼', '🍽️', '🍿', '💡', '🐾'];

export default function CategoriesPage() {
  const [categories] = useRealtimeState<Category>('categories');
  const [name, setName] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [icon, setIcon] = useState(AVAILABLE_EMOJIS[0]);
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('categories').insert({
      user_id: user.id,
      name,
      type,
      icon
    });

    if (!error) {
      setName('');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar esta categoría?')) {
      await supabase.from('categories').delete().eq('id', id);
    }
  };

  return (
    <div className="space-y-8 relative">
      {/* Background blurs */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-rose-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10">
        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Categorías de Cuenta</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Administra las etiquetas de tus ingresos y gastos</p>
      </div>

      {/* Creation Form */}
      <div className="bg-white/80 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 p-6 rounded-3xl shadow-xs backdrop-blur-xl relative z-10">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
          <div className="space-y-2">
            <label className="block text-slate-600 dark:text-slate-400 text-sm font-semibold">Nombre de Categoría</label>
            <input 
              id="cat-name" 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              required 
              className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium" 
              placeholder="Ej. Comida, Sueldo" 
            />
          </div>

          <div className="space-y-2">
            <label className="block text-slate-600 dark:text-slate-400 text-sm font-semibold">Tipo</label>
            <select 
              id="cat-type" 
              value={type} 
              onChange={e => setType(e.target.value as any)} 
              className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
            >
              <option value="expense">Gasto</option>
              <option value="income">Ingreso</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-slate-600 dark:text-slate-400 text-sm font-semibold">Emoji / Icono</label>
            <select 
              id="cat-icon" 
              value={icon} 
              onChange={e => setIcon(e.target.value)} 
              className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xl text-center font-bold"
            >
              {AVAILABLE_EMOJIS.map(emoji => (
                <option key={emoji} value={emoji}>{emoji}</option>
              ))}
            </select>
          </div>

          <button 
            id="btn-add-cat" 
            type="submit" 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold p-3.5 rounded-xl transition-all shadow-lg hover:shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus size={18} />
            <span>Crear Categoría</span>
          </button>
        </form>
      </div>

      {/* Grid displays */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
        {/* Expenses Card */}
        <div className="bg-white/80 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 p-6 rounded-3xl shadow-xs backdrop-blur-xl space-y-6">
          <h3 className="text-xl font-bold text-rose-500 flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800/80">
            <ArrowDownRight size={22} className="p-1 rounded-lg bg-rose-500/10" />
            <span>Categorías de Gastos</span>
          </h3>
          <div className="space-y-3">
            {categories.filter(c => c.type === 'expense').map(c => (
              <div 
                key={c.id} 
                className="flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800/60 p-3 rounded-2xl transition-all hover:bg-slate-50 dark:hover:bg-slate-800/40"
              >
                <div className="flex items-center space-x-3.5">
                  <span className="text-2xl w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center shadow-xs">
                    {c.icon || '📦'}
                  </span>
                  <span className="font-bold text-slate-800 dark:text-white">{c.name}</span>
                </div>
                <button 
                  onClick={() => handleDelete(c.id)} 
                  className="text-slate-400 hover:text-rose-500 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-all cursor-pointer"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            {categories.filter(c => c.type === 'expense').length === 0 && (
              <div className="text-center py-8 text-slate-500">
                <FolderHeart size={32} className="mx-auto text-slate-400 mb-2 opacity-50" />
                <p className="text-sm">No hay categorías de gastos.</p>
              </div>
            )}
          </div>
        </div>

        {/* Income Card */}
        <div className="bg-white/80 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 p-6 rounded-3xl shadow-xs backdrop-blur-xl space-y-6">
          <h3 className="text-xl font-bold text-emerald-500 flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800/80">
            <ArrowUpRight size={22} className="p-1 rounded-lg bg-emerald-500/10" />
            <span>Categorías de Ingresos</span>
          </h3>
          <div className="space-y-3">
            {categories.filter(c => c.type === 'income').map(c => (
              <div 
                key={c.id} 
                className="flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800/60 p-3 rounded-2xl transition-all hover:bg-slate-50 dark:hover:bg-slate-800/40"
              >
                <div className="flex items-center space-x-3.5">
                  <span className="text-2xl w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center shadow-xs">
                    {c.icon || '💼'}
                  </span>
                  <span className="font-bold text-slate-800 dark:text-white">{c.name}</span>
                </div>
                <button 
                  onClick={() => handleDelete(c.id)} 
                  className="text-slate-400 hover:text-rose-500 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-all cursor-pointer"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            {categories.filter(c => c.type === 'income').length === 0 && (
              <div className="text-center py-8 text-slate-500">
                <FolderHeart size={32} className="mx-auto text-slate-400 mb-2 opacity-50" />
                <p className="text-sm">No hay categorías de ingresos.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
