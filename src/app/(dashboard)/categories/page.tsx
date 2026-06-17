'use client';
import { useRealtimeState } from '@/hooks/useRealtimeState';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  icon: string;
}

const AVAILABLE_EMOJIS = ['🍔', '🛒', '🚗', '🏠', '💵', '💼', '📈', '🎮', '🏥', '🎓', '✈️', '🛍️', '🔌', '🍿', '🏋️', '🧼'];

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
    <div className="space-y-8">
      <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">Categorías</h2>

      {/* Create Category form */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div>
          <label className="block text-slate-600 dark:text-slate-400 text-sm font-medium mb-1">Nombre</label>
          <input id="cat-name" type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ej. Comida, Sueldo" />
        </div>
        <div>
          <label className="block text-slate-600 dark:text-slate-400 text-sm font-medium mb-1">Tipo</label>
          <select id="cat-type" value={type} onChange={e => setType(e.target.value as any)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="expense">Gasto</option>
            <option value="income">Ingreso</option>
          </select>
        </div>
        <div>
          <label className="block text-slate-600 dark:text-slate-400 text-sm font-medium mb-1">Icono / Emoji</label>
          <select id="cat-icon" value={icon} onChange={e => setIcon(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            {AVAILABLE_EMOJIS.map(emoji => (
              <option key={emoji} value={emoji}>{emoji}</option>
            ))}
          </select>
        </div>
        <button id="btn-add-cat" type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold p-3 rounded-xl transition-colors shadow-sm w-full">Crear Categoría</button>
      </form>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Expenses */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-4">
          <h3 className="text-xl font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
            <span>🔴</span> Categorías de Gasto
          </h3>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {categories.filter(c => c.type === 'expense').map(c => (
              <div key={c.id} className="flex justify-between items-center py-3">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{c.icon || '📦'}</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{c.name}</span>
                </div>
                <button onClick={() => handleDelete(c.id)} className="text-red-500 hover:text-red-700 text-sm font-semibold transition-colors">
                  Eliminar
                </button>
              </div>
            ))}
            {categories.filter(c => c.type === 'expense').length === 0 && (
              <p className="text-slate-500 text-sm py-4">No hay categorías registradas.</p>
            )}
          </div>
        </div>

        {/* Income */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-4">
          <h3 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
            <span>🟢</span> Categorías de Ingreso
          </h3>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {categories.filter(c => c.type === 'income').map(c => (
              <div key={c.id} className="flex justify-between items-center py-3">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{c.icon || '💼'}</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{c.name}</span>
                </div>
                <button onClick={() => handleDelete(c.id)} className="text-red-500 hover:text-red-700 text-sm font-semibold transition-colors">
                  Eliminar
                </button>
              </div>
            ))}
            {categories.filter(c => c.type === 'income').length === 0 && (
              <p className="text-slate-500 text-sm py-4">No hay categorías registradas.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
