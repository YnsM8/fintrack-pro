'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  TrendingUp, 
  Plus, 
  Trash2, 
  Loader2, 
  ArrowUpRight, 
  ArrowDownRight, 
  Coins, 
  Briefcase, 
  RefreshCw,
  Info,
  Calendar,
  DollarSign
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  Legend 
} from 'recharts';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

interface PortfolioAsset {
  assetId: string;
  symbol: string;
  name: string;
  type: 'stock' | 'crypto';
  currentPrice: number;
  totalQuantity: number;
  totalInvested: number;
  avgCost: number;
  currentValue: number;
  unrealizedPL: number;
  unrealizedPLPercent: number;
}

export default function InvestmentsPage() {
  const [portfolio, setPortfolio] = useState<PortfolioAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  // Form State
  const [symbol, setSymbol] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<'stock' | 'crypto'>('stock');
  const [txType, setTxType] = useState<'buy' | 'sell'>('buy');
  const [shares, setShares] = useState('');
  const [price, setPrice] = useState('');
  const [fee, setFee] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const netValueRef = useRef<HTMLSpanElement>(null);

  const fetchPortfolio = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await fetch('/api/investments');
      const data = await res.json();
      if (data.portfolio) {
        setPortfolio(data.portfolio);
      }
    } catch (e) {
      console.error('Error fetching investments:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPortfolio();
  }, []);

  // GSAP Animations
  useGSAP(() => {
    if (loading) return;

    // Entrance Animation
    gsap.from('.gsap-item', {
      y: 30,
      opacity: 0,
      stagger: 0.15,
      duration: 0.8,
      ease: 'power3.out'
    });

    // Net value number counting ticker
    const totalVal = portfolio.reduce((acc, curr) => acc + curr.currentValue, 0);
    if (netValueRef.current) {
      const counter = { val: 0 };
      gsap.to(counter, {
        val: totalVal,
        duration: 1.5,
        ease: 'power2.out',
        onUpdate: () => {
          if (netValueRef.current) {
            netValueRef.current.textContent = `$${counter.val.toLocaleString('es-ES', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}`;
          }
        }
      });
    }
  }, [loading, portfolio.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');
    setFormSuccess(false);

    if (txType === 'sell') {
      const asset = portfolio.find(p => p.symbol === symbol.toUpperCase());
      const maxShares = asset ? asset.totalQuantity : 0;
      if (Number(shares) > maxShares) {
        setFormError(`No posees suficientes unidades de este activo para vender. Máximo disponible: ${maxShares}`);
        setSubmitting(false);
        return;
      }
    }

    try {
      const res = await fetch('/api/investments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: symbol.toUpperCase(),
          name,
          type,
          txType,
          shares: parseFloat(shares),
          price: parseFloat(price),
          fee: parseFloat(fee || '0')
        })
      });

      const data = await res.json();
      if (data.success) {
        setFormSuccess(true);
        setSymbol('');
        setName('');
        setShares('');
        setPrice('');
        setFee('');
        // Reload portfolio
        await fetchPortfolio(true);
        setTimeout(() => {
          setModalOpen(false);
          setFormSuccess(false);
        }, 1200);
      } else {
        setFormError(data.error || 'Ocurrió un error al guardar la transacción.');
      }
    } catch (err) {
      setFormError('Error de red al registrar transacción.');
    } finally {
      setSubmitting(false);
    }
  };

  // Calculations
  const totalVal = portfolio.reduce((acc, curr) => acc + curr.currentValue, 0);
  const totalCost = portfolio.reduce((acc, curr) => acc + curr.totalInvested, 0);
  const netPL = totalVal - totalCost;
  const netPLPercent = totalCost > 0 ? (netPL / totalCost) * 100 : 0;

  // Chart data
  const chartColors = [
    '#3b82f6', // blue
    '#06b6d4', // cyan
    '#10b981', // emerald
    '#eab308', // amber
    '#ec4899', // pink
    '#8b5cf6', // violet
    '#f97316'  // orange
  ];

  const chartData = portfolio.map(item => ({
    name: item.symbol,
    value: parseFloat(item.currentValue.toFixed(2))
  }));

  return (
    <div ref={containerRef} className="space-y-8 relative">
      {/* Background radial blurs */}
      <div className="absolute top-0 right-10 w-96 h-96 bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center relative z-10 gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Portafolio de Inversiones</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Monitorea tus posiciones financieras en acciones y criptomonedas en tiempo real</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => fetchPortfolio(true)} 
            disabled={refreshing}
            className="p-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900/50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl transition-all flex items-center justify-center text-slate-600 dark:text-slate-400 cursor-pointer disabled:opacity-50"
            title="Refrescar cotizaciones"
          >
            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <button 
            id="btn-open-tx-modal" 
            onClick={() => setModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-3 rounded-xl transition-all shadow-lg hover:shadow-blue-500/20 flex items-center gap-2 cursor-pointer text-sm"
          >
            <Plus size={18} />
            <span>Registrar Transacción</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 relative z-10">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Obteniendo cotizaciones en tiempo real...</p>
        </div>
      ) : (
        <>
          {/* KPI Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
            {/* Net Value Card */}
            <div className="gsap-item bg-white/80 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 p-6 rounded-3xl shadow-xs backdrop-blur-xl space-y-4">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Valor Total de Mercado</span>
              <div className="space-y-1">
                <span ref={netValueRef} className="text-3xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
                  $0.00
                </span>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-slate-400">Actualizado hace unos instantes</span>
                </div>
              </div>
            </div>

            {/* Total Cost Card */}
            <div className="gsap-item bg-white/80 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 p-6 rounded-3xl shadow-xs backdrop-blur-xl space-y-4">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Capital Total Invertido</span>
              <div className="space-y-1">
                <span className="text-3xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
                  ${totalCost.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <span>Costo de adquisición acumulado</span>
                </div>
              </div>
            </div>

            {/* Profits Card */}
            <div className="gsap-item bg-white/80 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 p-6 rounded-3xl shadow-xs backdrop-blur-xl space-y-4">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Rendimiento Neto (P/L Latente)</span>
              <div className="space-y-1">
                <div className="flex items-baseline gap-2">
                  <span className={`text-3xl font-black font-mono tracking-tight ${netPL >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {netPL >= 0 ? '+' : ''}${netPL.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {netPL >= 0 ? (
                    <span className="text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md text-xs font-bold flex items-center gap-0.5">
                      <ArrowUpRight size={12} />
                      {netPLPercent.toFixed(2)}%
                    </span>
                  ) : (
                    <span className="text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-md text-xs font-bold flex items-center gap-0.5">
                      <ArrowDownRight size={12} />
                      {netPLPercent.toFixed(2)}%
                    </span>
                  )}
                  <span className="text-slate-400 text-xs">de retorno absoluto</span>
                </div>
              </div>
            </div>
          </div>

          {portfolio.length === 0 ? (
            <div className="gsap-item text-center py-20 bg-white/80 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-3xl backdrop-blur-xl relative z-10">
              <Briefcase size={48} className="mx-auto text-slate-400 mb-3" />
              <p className="text-slate-500 text-sm font-medium">Aún no has registrado ningún activo en tu portafolio.</p>
              <button 
                onClick={() => setModalOpen(true)}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-xl transition-all shadow-lg hover:shadow-blue-500/20 text-xs inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus size={16} />
                <span>Agregar mi primer activo</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10 items-start">
              {/* Asset List Table */}
              <div className="gsap-item lg:col-span-2 bg-white/80 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-3xl shadow-xs backdrop-blur-xl overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Posiciones Activas</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 dark:bg-slate-900/40 text-[10px] uppercase font-bold text-slate-400 tracking-wider border-b border-slate-100 dark:border-slate-800">
                        <th className="p-4 pl-6">Activo</th>
                        <th className="p-4">Tipo</th>
                        <th className="p-4 text-right">Cantidad</th>
                        <th className="p-4 text-right">Costo Promedio</th>
                        <th className="p-4 text-right">Precio Actual</th>
                        <th className="p-4 text-right">Valor Mercado</th>
                        <th className="p-4 text-right pr-6">Rendimiento (P/L)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {portfolio.map(asset => {
                        const isGain = asset.unrealizedPL >= 0;
                        return (
                          <tr key={asset.assetId} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/20 transition-all">
                            <td className="p-4 pl-6">
                              <div className="flex flex-col">
                                <span className="font-extrabold text-sm text-slate-900 dark:text-white">{asset.symbol}</span>
                                <span className="text-xs text-slate-500 dark:text-slate-400">{asset.name}</span>
                              </div>
                            </td>
                            <td className="p-4">
                              {asset.type === 'crypto' ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-cyan-500 bg-cyan-500/10 px-2.5 py-0.5 rounded-full uppercase">
                                  <Coins size={10} />
                                  Crypto
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-500 bg-blue-500/10 px-2.5 py-0.5 rounded-full uppercase">
                                  <Briefcase size={10} />
                                  Acción
                                </span>
                              )}
                            </td>
                            <td className="p-4 text-right font-mono text-sm text-slate-700 dark:text-slate-300">
                              {asset.totalQuantity.toLocaleString('es-ES', { maximumFractionDigits: 8 })}
                            </td>
                            <td className="p-4 text-right font-mono text-sm text-slate-700 dark:text-slate-300">
                              ${asset.avgCost.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                            </td>
                            <td className="p-4 text-right font-mono text-sm text-slate-700 dark:text-slate-300">
                              ${asset.currentPrice.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                            </td>
                            <td className="p-4 text-right font-mono text-sm font-extrabold text-slate-900 dark:text-white">
                              ${asset.currentValue.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="p-4 text-right pr-6">
                              <div className="flex flex-col items-end">
                                <span className={`font-mono text-sm font-bold ${isGain ? 'text-emerald-500' : 'text-rose-500'}`}>
                                  {isGain ? '+' : ''}${asset.unrealizedPL.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                                <span className={`text-[10px] font-extrabold font-mono ${isGain ? 'text-emerald-500/80' : 'text-rose-500/80'}`}>
                                  {isGain ? '+' : ''}{asset.unrealizedPLPercent.toFixed(2)}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Allocation Donut Chart */}
              <div className="gsap-item bg-white/80 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 p-6 rounded-3xl shadow-xs backdrop-blur-xl space-y-4">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Distribución de Activos</h3>
                <div className="h-64 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#0f172a', 
                          border: '1px solid #1e293b', 
                          borderRadius: '12px',
                          color: '#fff' 
                        }}
                        formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Valor']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2.5">
                  {portfolio.map((asset, index) => {
                    const pct = (asset.currentValue / totalVal) * 100;
                    return (
                      <div key={asset.assetId} className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2">
                          <div 
                            className="w-3 h-3 rounded-md" 
                            style={{ backgroundColor: chartColors[index % chartColors.length] }} 
                          />
                          <span className="font-extrabold text-slate-800 dark:text-slate-200">{asset.symbol}</span>
                          <span className="text-slate-400">{asset.name}</span>
                        </div>
                        <span className="font-bold text-slate-900 dark:text-white font-mono">{pct.toFixed(1)}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Register Transaction Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div 
            className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 shadow-2xl relative space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">Registrar Transacción</h3>
                <p className="text-xs text-slate-400">Añade o retira activos de tu portafolio</p>
              </div>
              <button 
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-all text-sm font-semibold p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800/50 rounded-xl">
                <button
                  type="button"
                  onClick={() => setTxType('buy')}
                  className={`py-2 text-sm font-extrabold rounded-lg transition-all ${
                    txType === 'buy' 
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm' 
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                  }`}
                >
                  Compra (Buy)
                </button>
                <button
                  type="button"
                  onClick={() => setTxType('sell')}
                  className={`py-2 text-sm font-extrabold rounded-lg transition-all ${
                    txType === 'sell' 
                      ? 'bg-white dark:bg-slate-900 text-rose-500 shadow-sm' 
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                  }`}
                >
                  Venta (Sell)
                </button>
              </div>

              {/* Asset Class Switcher */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800/50 rounded-xl">
                <button
                  type="button"
                  onClick={() => setType('stock')}
                  className={`py-2 text-xs font-bold rounded-lg transition-all ${
                    type === 'stock' 
                      ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-sm' 
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                  }`}
                >
                  Acción / ETF
                </button>
                <button
                  type="button"
                  onClick={() => setType('crypto')}
                  className={`py-2 text-xs font-bold rounded-lg transition-all ${
                    type === 'crypto' 
                      ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-sm' 
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                  }`}
                >
                  Criptomoneda
                </button>
              </div>

              {/* Symbol & Name */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Símbolo (Ticker)</label>
                  <input
                    type="text"
                    required
                    placeholder="AAPL, BTC, TSLA"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-850 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase font-mono font-bold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Nombre Completo</label>
                  <input
                    type="text"
                    required
                    placeholder="Apple Inc., Bitcoin"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-850 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                  />
                </div>
              </div>

              {/* Shares & Price */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Cantidad (Unidades)</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="0.00"
                    value={shares}
                    onChange={(e) => setShares(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-850 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Precio por Unidad (USD)</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="0.00"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-850 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
              </div>

              {/* Fee */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Comisión / Fee (USD)</label>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={fee}
                  onChange={(e) => setFee(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-850 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              {formError && (
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-xs font-bold">
                  {formError}
                </div>
              )}

              {formSuccess && (
                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl text-xs font-bold">
                  Transacción registrada con éxito. Actualizando cotizaciones...
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold p-3.5 rounded-xl transition-all shadow-lg hover:shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span>Confirmar Registro</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
