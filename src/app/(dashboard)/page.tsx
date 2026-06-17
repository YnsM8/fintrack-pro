'use client';
import { useRealtimeState } from '@/hooks/useRealtimeState';
import { useEffect, useRef, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { Bell } from 'lucide-react';

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  base_amount: number;
  currency: string;
  description: string;
  transaction_date: string;
}

interface Alert {
  id: string;
  message: string;
  is_read: boolean;
}

export default function Dashboard() {
  const [transactions] = useRealtimeState<Transaction>('transactions');
  const [alerts] = useRealtimeState<Alert>('budget_alerts');
  const balanceRef = useRef<HTMLDivElement>(null);
  const incomeRef = useRef<HTMLDivElement>(null);
  const expenseRef = useRef<HTMLDivElement>(null);

  const [totals, setTotals] = useState({ balance: 0, income: 0, expense: 0 });

  useEffect(() => {
    const inc = transactions.filter(t => t.type === 'income').reduce((acc, c) => acc + Number(c.base_amount), 0);
    const exp = transactions.filter(t => t.type === 'expense').reduce((acc, c) => acc + Number(c.base_amount), 0);
    setTotals({ balance: inc - exp, income: inc, expense: exp });
  }, [transactions]);

  useGSAP(() => {
    const animateCount = (ref: HTMLDivElement | null, targetVal: number) => {
      if (!ref) return;
      const obj = { val: 0 };
      gsap.to(obj, {
        val: targetVal,
        duration: 1.2,
        ease: 'power2.out',
        onUpdate: () => {
          if (ref) {
            ref.innerText = `$${obj.val.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          }
        }
      });
    };

    animateCount(balanceRef.current, totals.balance);
    animateCount(incomeRef.current, totals.income);
    animateCount(expenseRef.current, totals.expense);
  }, [totals]);

  const pieData = [
    { name: 'Ingresos', value: totals.income },
    { name: 'Gastos', value: totals.expense }
  ];
  const COLORS = ['#10b981', '#ef4444'];

  const monthlyTrends = [
    { name: 'Consolidado', Ingresos: totals.income, Gastos: totals.expense }
  ];

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">Dashboard Financiero</h2>
        {/* Alerts Feed */}
        {alerts.length > 0 && (
          <div className="flex items-center space-x-2 bg-yellow-50 dark:bg-yellow-950/40 border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300 px-4 py-2 rounded-xl max-w-sm animate-pulse shadow-sm">
            <Bell size={18} />
            <span className="text-sm font-medium truncate">{alerts[alerts.length - 1].message}</span>
          </div>
        )}
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
          <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-2">Balance General (USD Base)</h3>
          <div ref={balanceRef} className="text-4xl font-black text-blue-600 dark:text-blue-400">$0.00</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
          <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-2">Total Ingresos</h3>
          <div ref={incomeRef} className="text-4xl font-black text-emerald-600 dark:text-emerald-400">$0.00</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
          <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-2">Total Gastos</h3>
          <div ref={expenseRef} className="text-4xl font-black text-red-600 dark:text-red-400">$0.00</div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
          <h3 className="text-slate-900 dark:text-white text-lg font-bold mb-4">Ingresos vs Gastos</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTrends}>
                <XAxis dataKey="name" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', color: '#fff' }} />
                <Legend />
                <Bar dataKey="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex flex-col justify-between">
          <h3 className="text-slate-900 dark:text-white text-lg font-bold mb-4">Distribución del Saldo</h3>
          <div className="h-64 flex justify-center items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', color: '#fff' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recents list */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
        <h3 className="text-slate-900 dark:text-white text-lg font-bold mb-4">Transacciones Recientes</h3>
        <div className="space-y-3">
          {transactions.length === 0 ? (
            <p className="text-slate-500 text-sm">No hay transacciones aún.</p>
          ) : (
            transactions.slice(0, 5).map(t => (
              <div key={t.id} className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                <div>
                  <div className="font-semibold text-slate-800 dark:text-white">{t.description || 'Sin descripción'}</div>
                  <div className="text-xs text-slate-500">{t.transaction_date}</div>
                </div>
                <div className={`font-bold ${t.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {t.type === 'income' ? '+' : '-'}${Number(t.amount).toFixed(2)} {t.currency}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
