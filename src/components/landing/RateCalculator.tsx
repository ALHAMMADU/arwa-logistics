'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { useI18n } from '@/lib/i18n/context';
import { apiFetch } from '@/lib/api';
import { PlaneIcon, ShipIcon, TruckIcon, CalculatorIcon, SearchIcon, CheckCircleIcon, ClockIcon, DollarIcon, AlertIcon } from '@/components/icons';
import { SHIPPING_METHOD_LABELS } from '@/lib/shipping';

const METHOD_ICONS: Record<string, React.ReactNode> = {
  AIR: <PlaneIcon className="w-5 h-5 text-sky-400" />,
  SEA: <ShipIcon className="w-5 h-5 text-blue-400" />,
  LAND: <TruckIcon className="w-5 h-5 text-amber-400" />,
};

const METHOD_COLORS: Record<string, string> = {
  AIR: 'from-sky-500/20 to-sky-600/10 border-sky-500/30',
  SEA: 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
  LAND: 'from-amber-500/20 to-amber-600/10 border-amber-500/30',
};

const METHOD_PROS: Record<string, { pros: string[]; cons: string[] }> = {
  AIR: {
    pros: ['Fastest delivery (3-7 days)', 'Global coverage', 'Ideal for time-sensitive cargo'],
    cons: ['Higher cost per kg', 'Weight limitations', 'Restricted items'],
  },
  SEA: {
    pros: ['Most cost-effective', 'Best for heavy cargo', 'Environmentally friendly'],
    cons: ['Longer transit (15-35 days)', 'Less flexible scheduling', 'Port dependency'],
  },
  LAND: {
    pros: ['Door-to-door potential', 'Good for regional routes', 'Flexible scheduling'],
    cons: ['Limited to connected regions', 'Border delays possible', 'Weather dependent'],
  },
};

// ─── Package Size Category ───────────────────────────────
function getPackageCategory(weight: number): { label: string; color: string; icon: string } {
  if (weight <= 5) return { label: 'Small', color: 'text-emerald-400', icon: '📦' };
  if (weight <= 30) return { label: 'Medium', color: 'text-sky-400', icon: '📦' };
  if (weight <= 100) return { label: 'Large', color: 'text-amber-400', icon: '📦' };
  return { label: 'Extra Large', color: 'text-rose-400', icon: '📦' };
}

export default function RateCalculator() {
  const { setCurrentPage } = useAppStore();
  const { t } = useI18n();
  const [countries, setCountries] = useState<any[]>([]);
  const [country, setCountry] = useState('');
  const [weight, setWeight] = useState('');
  const [method, setMethod] = useState('');
  const [type, setType] = useState('PARCEL');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    apiFetch('/countries').then(r => r.success && setCountries(r.data));
  }, []);

  const weightNum = parseFloat(weight) || 0;
  const packageCategory = useMemo(() => getPackageCategory(weightNum), [weightNum]);

  // Estimated delivery date based on method
  const getEstimatedDelivery = (minDays: number, maxDays: number): string => {
    const now = new Date();
    const avgDays = Math.ceil((minDays + maxDays) / 2);
    const delivery = new Date(now.getTime() + avgDays * 24 * 60 * 60 * 1000);
    return delivery.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleCalculate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!country || !weight) return;
    setLoading(true);
    setSearched(true);
    try {
      const params = new URLSearchParams({ country, weight, ...(method && { method }), ...(type && { type }) });
      const res = await apiFetch(`/calculate-rate?${params}`);
      if (res.success) setResults(res.data);
      else setResults([]);
    } catch { setResults([]); }
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Calculator Form */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8 backdrop-blur-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
            <CalculatorIcon className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">{t('calculator.title')}</h3>
            <p className="text-xs text-slate-400">{t('calculator.sub')}</p>
          </div>
        </div>

        <form onSubmit={handleCalculate} className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">{t('calculator.destination')} *</label>
              <select
                value={country}
                onChange={e => setCountry(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 appearance-none"
                required
              >
                <option value="" className="bg-slate-800">{t('calculator.selectCountry')}</option>
                {countries.map((c: any) => (
                  <option key={c.id} value={c.name} className="bg-slate-800">{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">{t('calculator.weight')} *</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={weight}
                onChange={e => setWeight(e.target.value)}
                placeholder="e.g., 25"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                required
              />
            </div>
          </div>

          {/* Weight Slider with Visual Indicator */}
          {weightNum > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Weight: {weightNum} kg</span>
                <span className={`font-medium ${packageCategory.color}`}>
                  {packageCategory.icon} {packageCategory.label} Package
                </span>
              </div>
              <input
                type="range"
                min="0.1"
                max="500"
                step="0.1"
                value={weightNum}
                onChange={e => setWeight(e.target.value)}
                className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-emerald-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-emerald-500/30"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>0.1 kg</span>
                <span>125 kg</span>
                <span>250 kg</span>
                <span>500 kg</span>
              </div>
              {/* Package size visual bar */}
              <div className="flex gap-1">
                {[
                  { label: 'S', range: '0-5 kg', active: weightNum <= 5, color: 'bg-emerald-500' },
                  { label: 'M', range: '5-30 kg', active: weightNum > 5 && weightNum <= 30, color: 'bg-sky-500' },
                  { label: 'L', range: '30-100 kg', active: weightNum > 30 && weightNum <= 100, color: 'bg-amber-500' },
                  { label: 'XL', range: '100+ kg', active: weightNum > 100, color: 'bg-rose-500' },
                ].map((cat) => (
                  <div key={cat.label} className={`flex-1 rounded-md py-1 text-center text-[10px] font-medium transition-all ${cat.active ? `${cat.color} text-white` : 'bg-white/5 text-slate-500'}`}>
                    {cat.label}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">{t('calculator.method')}</label>
              <select
                value={method}
                onChange={e => setMethod(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 appearance-none"
              >
                <option value="" className="bg-slate-800">{t('calculator.anyMethod')}</option>
                <option value="AIR" className="bg-slate-800">Air Freight</option>
                <option value="SEA" className="bg-slate-800">Sea Freight</option>
                <option value="LAND" className="bg-slate-800">Land Freight</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">{t('calculator.shipmentType')}</label>
              <select
                value={type}
                onChange={e => setType(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 appearance-none"
              >
                <option value="PARCEL" className="bg-slate-800">Parcel</option>
                <option value="LCL" className="bg-slate-800">LCL</option>
                <option value="FCL" className="bg-slate-800">FCL</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading || !country || !weight}
              className="flex-1 py-3.5 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <SearchIcon className="w-4 h-4" /> {t('calculator.calculateRates')}
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage('quotations')}
              className="px-6 py-3.5 bg-white/5 border border-white/10 text-white rounded-xl font-semibold hover:bg-white/10 transition-all flex items-center gap-2 whitespace-nowrap"
            >
              Get Quote
            </button>
          </div>
        </form>
      </div>

      {/* Shipping Method Comparison (shown when no method is selected) */}
      {!method && !searched && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="mt-8"
        >
          <h4 className="text-sm font-medium text-slate-400 mb-4">Compare Shipping Methods</h4>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { method: 'AIR', icon: <PlaneIcon className="w-8 h-8 text-sky-400" />, color: 'from-sky-500/10 to-sky-600/5 border-sky-500/20', badge: 'Fastest', badgeColor: 'bg-sky-500/20 text-sky-400' },
              { method: 'SEA', icon: <ShipIcon className="w-8 h-8 text-blue-400" />, color: 'from-blue-500/10 to-blue-600/5 border-blue-500/20', badge: 'Best Value', badgeColor: 'bg-blue-500/20 text-blue-400' },
              { method: 'LAND', icon: <TruckIcon className="w-8 h-8 text-amber-400" />, color: 'from-amber-500/10 to-amber-600/5 border-amber-500/20', badge: 'Regional', badgeColor: 'bg-amber-500/20 text-amber-400' },
            ].map((m) => (
              <div
                key={m.method}
                className={`bg-gradient-to-br ${m.color} border rounded-xl p-5 backdrop-blur-sm hover:bg-opacity-20 transition-all cursor-pointer`}
                onClick={() => setMethod(m.method)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="text-white">{m.icon}</div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${m.badgeColor}`}>{m.badge}</span>
                </div>
                <h5 className="text-white font-semibold mb-1">{SHIPPING_METHOD_LABELS[m.method]}</h5>
                <p className="text-[10px] text-slate-400 mb-3">
                  {m.method === 'AIR' ? '3-7 days' : m.method === 'SEA' ? '15-35 days' : '5-12 days'}
                </p>
                <div className="space-y-1.5">
                  {METHOD_PROS[m.method].pros.map((pro, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <CheckCircleIcon className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" />
                      <span className="text-[10px] text-slate-400">{pro}</span>
                    </div>
                  ))}
                  {METHOD_PROS[m.method].cons.map((con, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <AlertIcon className="w-3 h-3 text-amber-400 mt-0.5 shrink-0" />
                      <span className="text-[10px] text-slate-500">{con}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Results */}
      <AnimatePresence>
        {searched && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            className="mt-8"
          >
            <h4 className="text-sm font-medium text-slate-400 mb-4">
              {results.length > 0 ? t('calculator.routesFound', { count: results.length.toString(), s: results.length > 1 ? 's' : '' }) : t('calculator.noRoutesFound')}
            </h4>

            {results.length === 0 && !loading && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
                <p className="text-slate-400">{t('calculator.noRoutesDesc')}</p>
                <button onClick={() => setCurrentPage('register')} className="mt-4 px-6 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-500 transition-colors">
                  {t('calculator.contactUs')}
                </button>
              </div>
            )}

            <div className="space-y-4">
              {results.map((rate, i) => {
                const isFastest = results.every(r => rate.estimatedDays.min <= r.estimatedDays.min);
                const isCheapest = results.every(r => rate.totalCost <= r.totalCost);

                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1, duration: 0.4 }}
                    className={`bg-gradient-to-r ${METHOD_COLORS[rate.method] || 'from-slate-500/20 to-slate-600/10 border-slate-500/30'} border rounded-xl p-5 sm:p-6 backdrop-blur-sm`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2.5 mb-2 flex-wrap">
                          {METHOD_ICONS[rate.method]}
                          <span className="text-white font-semibold">{rate.routeName}</span>
                          <span className="px-2 py-0.5 bg-white/10 rounded text-xs text-slate-300">
                            {SHIPPING_METHOD_LABELS[rate.method] || rate.method}
                          </span>
                          {isFastest && results.length > 1 && (
                            <span className="px-2 py-0.5 bg-sky-500/20 text-sky-400 rounded text-[10px] font-semibold flex items-center gap-1">
                              <ClockIcon className="w-3 h-3" /> Fastest
                            </span>
                          )}
                          {isCheapest && results.length > 1 && (
                            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-[10px] font-semibold flex items-center gap-1">
                              <DollarIcon className="w-3 h-3" /> Cheapest
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-400">
                          <span className="flex items-center gap-1"><DollarIcon className="w-3.5 h-3.5" /> ${rate.pricePerKg}{t('calculator.perKg')}</span>
                          <span className="flex items-center gap-1"><ClockIcon className="w-3.5 h-3.5" /> {rate.estimatedDays.min}-{rate.estimatedDays.max} {t('calculator.days')}</span>
                          <span className="flex items-center gap-1"><CheckCircleIcon className="w-3.5 h-3.5" /> {t('calculator.estDelivery')}: {rate.estimatedDeliveryDate || getEstimatedDelivery(rate.estimatedDays.min, rate.estimatedDays.max)}</span>
                        </div>
                        {rate.note && (
                          <p className="text-xs text-amber-400 mt-2">💡 {rate.note}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-4 sm:flex-col sm:items-end">
                        <div className="text-right">
                          <div className="text-2xl sm:text-3xl font-bold text-white">${rate.totalCost.toFixed(2)}</div>
                          <div className="text-xs text-slate-400">{t('calculator.estimatedTotal')}</div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setCurrentPage('register')}
                            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-500 transition-colors whitespace-nowrap"
                          >
                            Get Started
                          </button>
                          <button
                            onClick={() => setCurrentPage('quotations')}
                            className="px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg text-sm font-medium hover:bg-white/15 transition-colors whitespace-nowrap"
                          >
                            Get Quote
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
