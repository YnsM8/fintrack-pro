'use client';
import { useRealtimeState } from '@/hooks/useRealtimeState';
import { useEffect, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { Bell, TrendingUp, Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { scaleLinear, arc, pie as d3_pie } from 'd3';
import { createBlendy } from 'blendy';

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

// Custom RosenCharts: Double Vertical Bar Chart
function RosenDoubleBarChart({ income, expense }: { income: number; expense: number }) {
  const data = [
    { label: 'Ingresos', value: income, color: 'from-emerald-400 to-teal-500 shadow-emerald-500/20' },
    { label: 'Gastos', value: expense, color: 'from-rose-400 to-red-600 shadow-rose-500/20' }
  ];

  const maxValue = Math.max(income, expense, 100);
  const yScale = scaleLinear().domain([0, maxValue]).range([100, 0]);

  return (
    <div className="relative h-64 w-full flex items-end justify-around px-8 pt-4">
      {/* Grid lines */}
      <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pr-8 pl-16 pb-8">
        {[0, 25, 50, 75, 100].map((pct) => (
          <div key={pct} className="w-full flex items-center border-t border-slate-200/50 dark:border-slate-800/40 text-slate-400 text-[10px] font-mono select-none">
            <span className="w-14 -ml-16 text-right pr-2">${((maxValue * pct) / 100).toLocaleString('es-ES', { maximumFractionDigits: 0 })}</span>
            <div className="flex-1 border-t border-dashed border-slate-200/60 dark:border-slate-800/80"></div>
          </div>
        ))}
      </div>

      {/* Bars */}
      <div className="relative z-10 w-full h-[calc(100%-2rem)] flex justify-around items-end pl-12">
        {data.map((d, i) => {
          const heightPct = 100 - yScale(d.value);
          return (
            <div key={i} className="flex flex-col items-center group w-1/3">
              {/* Bar */}
              <div 
                className={`w-16 rounded-t-xl bg-gradient-to-t ${d.color} shadow-lg transition-all duration-500 relative flex items-center justify-center`}
                style={{ height: `${Math.max(heightPct, 6)}%` }}
              >
                {/* Tooltip on hover */}
                <div className="absolute -top-10 scale-0 group-hover:scale-100 transition-all duration-200 bg-slate-900 border border-slate-800 text-white text-xs px-2.5 py-1.5 rounded-lg shadow-xl font-mono whitespace-nowrap z-30">
                  ${d.value.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                </div>
              </div>
              {/* Label */}
              <span className="mt-3 text-xs font-semibold text-slate-500 dark:text-slate-400">{d.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Custom RosenCharts: Donut Chart
function RosenDonutChart({ income, expense }: { income: number; expense: number }) {
  const total = income + expense || 1;
  const data = [
    { name: 'Ingresos', value: income, color: '#10b981', gradient: 'url(#income-grad)' },
    { name: 'Gastos', value: expense, color: '#f43f5e', gradient: 'url(#expense-grad)' }
  ];

  const pieGenerator = d3_pie<any>().value(d => d.value).sort(null);
  const arcs = pieGenerator(data);

  const arcGenerator = arc()
    .innerRadius(65)
    .outerRadius(85)
    .cornerRadius(8);

  return (
    <div className="relative h-64 w-full flex flex-col justify-center items-center">
      <svg className="w-48 h-48 overflow-visible" viewBox="-100 -100 200 200">
        <defs>
          <linearGradient id="income-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <linearGradient id="expense-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f43f5e" />
            <stop offset="100%" stopColor="#e11d48" />
          </linearGradient>
        </defs>

        {arcs.map((slice, i) => {
          const path = arcGenerator(slice as any);
          return (
            <g key={i} className="group transition-all duration-300 hover:scale-105">
              <path
                d={path || ''}
                fill={data[i].gradient}
                className="transition-all duration-300 filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.15)] dark:drop-shadow-[0_4px_16px_rgba(0,0,0,0.4)]"
              />
            </g>
          );
        })}
      </svg>

      {/* Centered balance percentage */}
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="text-slate-400 text-[10px] tracking-wider uppercase font-semibold">Tasa de Ahorro</span>
        <span className="text-2xl font-black text-slate-800 dark:text-white font-mono">
          {income > 0 ? (((income - expense) / income) * 100).toFixed(0) : '0'}%
        </span>
      </div>

      {/* Custom legend beneath the donut */}
      <div className="flex gap-6 mt-4 text-xs">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }}></span>
            <span className="text-slate-500 dark:text-slate-400">{d.name} ({((d.value / total) * 100).toFixed(0)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [transactions] = useRealtimeState<Transaction>('transactions');
  const [alerts] = useRealtimeState<Alert>('budget_alerts');
  const balanceRef = useRef<HTMLDivElement>(null);
  const incomeRef = useRef<HTMLDivElement>(null);
  const expenseRef = useRef<HTMLDivElement>(null);
  const blendyRef = useRef<any>(null);

  const [totals, setTotals] = useState({ balance: 0, income: 0, expense: 0 });
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  useEffect(() => {
    const inc = transactions.filter(t => t.type === 'income').reduce((acc, c) => acc + Number(c.base_amount), 0);
    const exp = transactions.filter(t => t.type === 'expense').reduce((acc, c) => acc + Number(c.base_amount), 0);
    setTotals({ balance: inc - exp, income: inc, expense: exp });
  }, [transactions]);

  // Initialize Blendy on client
  useEffect(() => {
    blendyRef.current = createBlendy({ animation: 'dynamic' });
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

  const handleOpenTxDetail = (t: Transaction) => {
    setSelectedTx(t);
    setTimeout(() => {
      if (blendyRef.current) {
        blendyRef.current.toggle(`tx-${t.id}`);
      }
    }, 50);
  };

  const handleCloseTxDetail = () => {
    if (selectedTx && blendyRef.current) {
      blendyRef.current.untoggle(`tx-${selectedTx.id}`, () => {
        setSelectedTx(null);
      });
    } else {
      setSelectedTx(null);
    }
  };

  return (
    <div className="space-y-8 relative">
      {/* Background glowing effects */}
      <div className="absolute -top-40 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-20 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="flex justify-between items-center flex-wrap gap-4 relative z-10">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Dashboard Financiero</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Resumen y tendencias de tus activos</p>
        </div>
        {/* Alerts Feed */}
        {alerts.length > 0 && (
          <div className="flex items-center space-x-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-400 px-4 py-2.5 rounded-2xl max-w-sm animate-pulse shadow-sm">
            <Bell size={18} />
            <span className="text-sm font-semibold truncate">{alerts[alerts.length - 1].message}</span>
          </div>
        )}
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
        {/* Balance */}
        <div className="bg-white/80 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 p-6 rounded-2xl shadow-xs backdrop-blur-xl transition-all duration-300 hover:border-blue-500/50 flex items-center justify-between group">
          <div className="space-y-1">
            <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium">Balance General (USD Base)</h3>
            <div ref={balanceRef} className="text-4xl font-black text-blue-600 dark:text-blue-400 font-mono tracking-tight">$0.00</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
            <Wallet size={24} />
          </div>
        </div>

        {/* Income */}
        <div className="bg-white/80 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 p-6 rounded-2xl shadow-xs backdrop-blur-xl transition-all duration-300 hover:border-emerald-500/50 flex items-center justify-between group">
          <div className="space-y-1">
            <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium">Total Ingresos</h3>
            <div ref={incomeRef} className="text-4xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">$0.00</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
            <ArrowUpRight size={24} />
          </div>
        </div>

        {/* Expense */}
        <div className="bg-white/80 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 p-6 rounded-2xl shadow-xs backdrop-blur-xl transition-all duration-300 hover:border-rose-500/50 flex items-center justify-between group">
          <div className="space-y-1">
            <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium">Total Gastos</h3>
            <div ref={expenseRef} className="text-4xl font-black text-rose-600 dark:text-rose-400 font-mono tracking-tight">$0.00</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center text-rose-600 dark:text-rose-400 group-hover:scale-110 transition-transform">
            <ArrowDownRight size={24} />
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
        <div className="bg-white/80 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 p-6 rounded-2xl shadow-xs backdrop-blur-xl">
          <h3 className="text-slate-900 dark:text-white text-lg font-bold mb-6 flex items-center gap-2">
            <TrendingUp size={20} className="text-blue-500" />
            <span>Ingresos vs Gastos (RosenCharts)</span>
          </h3>
          <RosenDoubleBarChart income={totals.income} expense={totals.expense} />
        </div>

        <div className="bg-white/80 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 p-6 rounded-2xl shadow-xs backdrop-blur-xl flex flex-col justify-between">
          <h3 className="text-slate-900 dark:text-white text-lg font-bold mb-6">Distribución del Saldo (RosenCharts)</h3>
          <RosenDonutChart income={totals.income} expense={totals.expense} />
        </div>
      </div>

      {/* Recents list & Blendy container */}
      <div className="bg-white/80 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 p-6 rounded-2xl shadow-xs backdrop-blur-xl relative z-10">
        <h3 className="text-slate-900 dark:text-white text-lg font-bold mb-4">Transacciones Recientes (Click para detalle)</h3>
        <div className="space-y-3">
          {transactions.length === 0 ? (
            <p className="text-slate-500 text-sm">No hay transacciones aún.</p>
          ) : (
            transactions.slice(0, 5).map(t => (
              <div key={t.id} className="relative">
                {/* Blendy source element */}
                <div 
                  data-blendy-from={`tx-${t.id}`}
                  onClick={() => handleOpenTxDetail(t)}
                  className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800/80 pb-3 pt-2 hover:bg-slate-50 dark:hover:bg-slate-800/40 px-3 -mx-3 rounded-xl transition-all cursor-pointer group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-lg text-slate-700 dark:text-slate-300">
                      {t.type === 'income' ? '🟢' : '🔴'}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-white group-hover:text-blue-500 transition-colors">{t.description || 'Sin descripción'}</div>
                      <div className="text-xs text-slate-500">{t.transaction_date}</div>
                    </div>
                  </div>
                  <div className={`font-bold font-mono ${t.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {t.type === 'income' ? '+' : '-'}${Number(t.amount).toFixed(2)} {t.currency}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Blendy Target Modal Overlay */}
      {selectedTx && (
        <div 
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={handleCloseTxDetail}
        >
          {/* Blendy target element */}
          <div 
            data-blendy-to={`tx-${selectedTx.id}`}
            className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl relative space-y-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${selectedTx.type === 'income' ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-800/50' : 'bg-rose-950/50 text-rose-400 border border-rose-800/50'}`}>
                  {selectedTx.type === 'income' ? 'Ingreso' : 'Gasto'}
                </span>
                <h3 className="text-2xl font-black text-white pt-2">{selectedTx.description || 'Sin descripción'}</h3>
                <p className="text-slate-500 text-xs font-mono">{selectedTx.transaction_date}</p>
              </div>
              <button 
                onClick={handleCloseTxDetail}
                className="text-slate-400 hover:text-white hover:bg-slate-800 p-2 rounded-full transition-colors text-sm w-8 h-8 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="border-y border-slate-800/80 py-4 space-y-3 font-mono">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Monto Original:</span>
                <span className="text-white font-bold">${Number(selectedTx.amount).toFixed(2)} {selectedTx.currency}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Monto Base (USD):</span>
                <span className="text-emerald-400 font-bold">${Number(selectedTx.base_amount).toFixed(2)} USD</span>
              </div>
            </div>

            <button 
              onClick={handleCloseTxDetail}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold p-3 rounded-xl transition-colors cursor-pointer"
            >
              Cerrar Detalle
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
