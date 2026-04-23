'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { apiFetch } from '@/lib/api';
import { CheckCircleIcon, ArrowLeftIcon, PlaneIcon, ShipIcon, TruckIcon, ClockIcon, DollarIcon } from '@/components/icons';
import { SHIPPING_METHOD_LABELS } from '@/lib/shipping';
import { toast } from 'sonner';

interface RateEstimate {
  routeId: string;
  routeName: string;
  originCountry: string;
  destinationCountry: string;
  destinationCity: string | null;
  method: string;
  shipmentType: string;
  pricePerKg: number;
  breakdown: {
    baseCost: number;
    handlingFee: number;
    insurance: number;
    customsFee: number;
  };
  totalCost: number;
  estimatedDays: {
    min: number;
    max: number;
  };
}

const STEPS = [
  { id: 1, label: 'Destination' },
  { id: 2, label: 'Details' },
  { id: 3, label: 'Shipping Options' },
  { id: 4, label: 'Review' },
];

function MethodIcon({ method, className = "w-5 h-5" }: { method: string; className?: string }) {
  if (method === 'AIR') return <PlaneIcon className={className} />;
  if (method === 'SEA') return <ShipIcon className={className} />;
  return <TruckIcon className={className} />;
}

function MethodIconColor(method: string): string {
  if (method === 'AIR') return 'text-sky-500';
  if (method === 'SEA') return 'text-violet-500';
  return 'text-amber-500';
}

function MethodBgColor(method: string): string {
  if (method === 'AIR') return 'bg-sky-50 dark:bg-sky-900/30';
  if (method === 'SEA') return 'bg-violet-50 dark:bg-violet-900/30';
  return 'bg-amber-50 dark:bg-amber-900/30';
}

export default function CreateShipmentPage() {
  const { setCurrentPage, setSelectedShipmentId } = useAppStore();
  const [countries, setCountries] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<any>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState(1);
  const [rateEstimates, setRateEstimates] = useState<RateEstimate[]>([]);
  const [comparingRates, setComparingRates] = useState(false);
  const [selectedRate, setSelectedRate] = useState<RateEstimate | null>(null);
  const [form, setForm] = useState({
    senderName: '', senderPhone: '', receiverName: '', receiverPhone: '', receiverAddress: '',
    destinationCountry: '', destinationCity: '', weight: '', length: '', width: '', height: '',
    productDescription: '', shipmentValue: '', shippingMethod: 'AIR', shipmentType: 'PARCEL', warehouseId: '', routeId: '',
  });

  useEffect(() => {
    apiFetch('/countries').then(r => r.success && setCountries(r.data));
    apiFetch('/warehouses').then(r => r.success && setWarehouses(r.data));
    apiFetch('/routes').then(r => r.success && setRoutes(r.data));
  }, []);

  const filteredRoutes = routes.filter((r: any) => r.destinationCountry === form.destinationCountry);

  // Determine which steps are completable
  const canProceedToStep = (step: number): boolean => {
    if (step <= 1) return true;
    if (step === 2) return !!(form.destinationCountry && form.destinationCity);
    if (step === 3) return !!(form.destinationCountry && form.destinationCity && form.weight && parseFloat(form.weight) > 0 && form.shipmentValue && parseFloat(form.shipmentValue) > 0 && form.senderName && form.receiverName && form.productDescription);
    if (step === 4) return !!(form.routeId || selectedRate);
    return false;
  };

  const handleCompareRates = async () => {
    if (!form.destinationCountry || !form.weight || parseFloat(form.weight) <= 0 || !form.shipmentValue || parseFloat(form.shipmentValue) <= 0) {
      toast.error('Please fill in destination, weight, and value first');
      return;
    }
    setComparingRates(true);
    try {
      const res = await apiFetch('/shipments/estimate', {
        method: 'POST',
        body: JSON.stringify({
          destinationCountry: form.destinationCountry,
          destinationCity: form.destinationCity || undefined,
          weight: form.weight,
          shippingMethod: form.shippingMethod || undefined,
          shipmentType: form.shipmentType,
          shipmentValue: form.shipmentValue,
        }),
      });
      if (res.success) {
        setRateEstimates(res.data);
        if (res.data.length === 0) {
          toast.info('No routes found for this destination and method combination');
        }
      } else {
        toast.error(res.error || 'Failed to get rate estimates');
      }
    } catch {
      toast.error('Network error');
    }
    setComparingRates(false);
  };

  const handleSelectRate = (rate: RateEstimate) => {
    setSelectedRate(rate);
    setForm(prev => ({
      ...prev,
      routeId: rate.routeId,
      shippingMethod: rate.method,
    }));
    toast.success(`Selected ${rate.routeName} - ${SHIPPING_METHOD_LABELS[rate.method]}`);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.senderName) errors.senderName = 'Sender name is required';
    if (!form.receiverName) errors.receiverName = 'Receiver name is required';
    if (!form.destinationCountry) errors.destinationCountry = 'Country is required';
    if (!form.destinationCity) errors.destinationCity = 'City is required';
    if (!form.weight || parseFloat(form.weight) <= 0) errors.weight = 'Valid weight is required';
    if (!form.shipmentValue || parseFloat(form.shipmentValue) <= 0) errors.shipmentValue = 'Valid value is required';
    if (!form.productDescription) errors.productDescription = 'Description is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error('Please fill in all required fields');
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch('/shipments', { method: 'POST', body: JSON.stringify(form) });
      if (res.success) {
        setSuccess(res.data);
        toast.success('Shipment created successfully!');
      } else {
        toast.error(res.error || 'Failed to create shipment');
      }
    } catch {
      toast.error('Network error');
    }
    setLoading(false);
  };

  const inputClass = "w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-slate-900 placeholder:text-slate-400 dark:placeholder:text-slate-500";
  const selectClass = "w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-slate-900 placeholder:text-slate-400 dark:placeholder:text-slate-500";

  if (success) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        >
          <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircleIcon className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Shipment Created!</h2>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 mt-6 text-left space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Shipment ID:</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">{success.shipmentId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Tracking:</span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{success.trackingNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Destination:</span>
              <span className="text-slate-700 dark:text-slate-300">{success.destinationCity}, {success.destinationCountry}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Method:</span>
              <span className="text-slate-700 dark:text-slate-300">{SHIPPING_METHOD_LABELS[success.shippingMethod]}</span>
            </div>
            {selectedRate && (
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Total Cost:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">${selectedRate.totalCost.toFixed(2)}</span>
              </div>
            )}
          </div>
          <div className="flex gap-3 justify-center mt-8">
            <button
              onClick={() => { setSelectedShipmentId(success.id); setCurrentPage('shipment-detail'); }}
              className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors"
            >
              View Shipment
            </button>
            <button
              onClick={() => setCurrentPage('dashboard')}
              className="px-6 py-2.5 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={() => setCurrentPage('dashboard')}
        className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 mb-6 text-sm transition-colors"
      >
        <ArrowLeftIcon className="w-4 h-4" /> Back to Dashboard
      </button>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Create New Shipment</h1>
      <p className="text-slate-500 dark:text-slate-400 mb-6">Fill in the shipment details below</p>

      {/* Step Indicators */}
      <div className="flex items-center mb-8">
        {STEPS.map((step, idx) => (
          <React.Fragment key={step.id}>
            <button
              type="button"
              onClick={() => canProceedToStep(step.id) && setCurrentStep(step.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                currentStep === step.id
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200 dark:shadow-emerald-900/30'
                  : currentStep > step.id
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 cursor-pointer hover:bg-emerald-200 dark:hover:bg-emerald-900/50'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
              }`}
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                currentStep === step.id
                  ? 'bg-white/20 text-white'
                  : currentStep > step.id
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500'
              }`}>
                {currentStep > step.id ? '✓' : step.id}
              </span>
              <span className="hidden sm:inline">{step.label}</span>
            </button>
            {idx < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 rounded ${currentStep > step.id ? 'bg-emerald-400 dark:bg-emerald-600' : 'bg-slate-200 dark:bg-slate-700'}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* ── Step 1: Destination ── */}
        {currentStep === 1 && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-sm font-bold">1</span>
              Destination
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Country *</label>
                <select autoFocus value={form.destinationCountry} onChange={e => { setForm({...form, destinationCountry: e.target.value, routeId: '', destinationCity: ''}); setSelectedRate(null); setRateEstimates([]); }} className={`${selectClass} ${formErrors.destinationCountry ? 'border-red-300' : ''}`} required>
                  <option value="">Select Country</option>
                  {countries.map((c: any) => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
                {formErrors.destinationCountry && <p className="text-xs text-red-500 mt-1">{formErrors.destinationCountry}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">City *</label>
                <input value={form.destinationCity} onChange={e => { setForm({...form, destinationCity: e.target.value}); setSelectedRate(null); setRateEstimates([]); }} className={`${inputClass} ${formErrors.destinationCity ? 'border-red-300' : ''}`} required />
                {formErrors.destinationCity && <p className="text-xs text-red-500 mt-1">{formErrors.destinationCity}</p>}
              </div>
            </div>
          </div>
        )}

        {/* ── Step 2: Details ── */}
        {currentStep === 2 && (
          <>
            {/* Sender Information */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Sender Information</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Sender Name *</label>
                  <input value={form.senderName} onChange={e => setForm({...form, senderName: e.target.value})} className={`${inputClass} ${formErrors.senderName ? 'border-red-300 ring-red-200' : ''}`} required />
                  {formErrors.senderName && <p className="text-xs text-red-500 mt-1">{formErrors.senderName}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Sender Phone</label>
                  <input value={form.senderPhone} onChange={e => setForm({...form, senderPhone: e.target.value})} placeholder="+1 (555) 000-0000" className={inputClass} />
                </div>
              </div>
            </div>

            {/* Receiver Information */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Receiver Information</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Receiver Name *</label>
                  <input value={form.receiverName} onChange={e => setForm({...form, receiverName: e.target.value})} className={`${inputClass} ${formErrors.receiverName ? 'border-red-300 ring-red-200' : ''}`} required />
                  {formErrors.receiverName && <p className="text-xs text-red-500 mt-1">{formErrors.receiverName}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Receiver Phone</label>
                  <input value={form.receiverPhone} onChange={e => setForm({...form, receiverPhone: e.target.value})} placeholder="+1 (555) 000-0000" className={inputClass} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Receiver Address</label>
                  <input value={form.receiverAddress} onChange={e => setForm({...form, receiverAddress: e.target.value})} className={inputClass} />
                </div>
              </div>
            </div>

            {/* Shipment Details */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Shipment Details</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Weight (kg) *</label>
                  <input type="number" step="0.1" value={form.weight} onChange={e => { setForm({...form, weight: e.target.value}); setSelectedRate(null); setRateEstimates([]); }} className={`${inputClass} ${formErrors.weight ? 'border-red-300' : ''}`} required />
                  {formErrors.weight && <p className="text-xs text-red-500 mt-1">{formErrors.weight}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Length (cm)</label>
                  <input type="number" value={form.length} onChange={e => setForm({...form, length: e.target.value})} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Width (cm)</label>
                  <input type="number" value={form.width} onChange={e => setForm({...form, width: e.target.value})} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Height (cm)</label>
                  <input type="number" value={form.height} onChange={e => setForm({...form, height: e.target.value})} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Value (USD) *</label>
                  <input type="number" step="0.01" value={form.shipmentValue} onChange={e => { setForm({...form, shipmentValue: e.target.value}); setSelectedRate(null); setRateEstimates([]); }} className={`${inputClass} ${formErrors.shipmentValue ? 'border-red-300' : ''}`} required />
                  {formErrors.shipmentValue && <p className="text-xs text-red-500 mt-1">{formErrors.shipmentValue}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description *</label>
                  <input value={form.productDescription} onChange={e => setForm({...form, productDescription: e.target.value})} className={`${inputClass} ${formErrors.productDescription ? 'border-red-300' : ''}`} required />
                  {formErrors.productDescription && <p className="text-xs text-red-500 mt-1">{formErrors.productDescription}</p>}
                  <p className="text-xs text-slate-400 mt-1 text-right">{form.productDescription?.length || 0}/2000</p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── Step 3: Shipping Options ── */}
        {currentStep === 3 && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-sm font-bold">3</span>
              Shipping Options
            </h3>
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Method</label>
                <select value={form.shippingMethod} onChange={e => { setForm({...form, shippingMethod: e.target.value}); setSelectedRate(null); setRateEstimates([]); }} className={selectClass}>
                  <option value="AIR">Air Freight</option>
                  <option value="SEA">Sea Freight</option>
                  <option value="LAND">Land Freight</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Type</label>
                <select value={form.shipmentType} onChange={e => setForm({...form, shipmentType: e.target.value})} className={selectClass}>
                  <option value="PARCEL">Parcel</option>
                  <option value="LCL">LCL</option>
                  <option value="FCL">FCL</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Warehouse</label>
                <select value={form.warehouseId} onChange={e => setForm({...form, warehouseId: e.target.value})} className={selectClass}>
                  <option value="">Select Warehouse</option>
                  {warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
            </div>

            {/* Compare Rates Button */}
            <div className="border-t border-slate-100 dark:border-slate-700 pt-6">
              <button
                type="button"
                onClick={handleCompareRates}
                disabled={comparingRates || !form.destinationCountry || !form.weight || !form.shipmentValue}
                className="w-full py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {comparingRates ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Comparing Rates...
                  </>
                ) : (
                  <>
                    <DollarIcon className="w-5 h-5" />
                    Compare Rates
                  </>
                )}
              </button>
              {!form.destinationCountry || !form.weight || !form.shipmentValue ? (
                <p className="text-xs text-slate-400 mt-2 text-center">Fill in destination, weight, and value above to compare rates</p>
              ) : null}
            </div>

            {/* Rate Comparison Cards */}
            {rateEstimates.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="mt-6"
              >
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Available Rates ({rateEstimates.length})</h4>
                <div className="grid gap-3 max-h-96 overflow-y-auto pr-1">
                  {rateEstimates.map((rate) => (
                    <button
                      key={`${rate.routeId}-${rate.method}`}
                      type="button"
                      onClick={() => handleSelectRate(rate)}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all hover:shadow-md ${
                        selectedRate?.routeId === rate.routeId && selectedRate?.method === rate.method
                          ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/20 shadow-md'
                          : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-emerald-300 dark:hover:border-emerald-600'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${MethodBgColor(rate.method)}`}>
                            <MethodIcon method={rate.method} className={`w-5 h-5 ${MethodIconColor(rate.method)}`} />
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white text-sm">{rate.routeName}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">{SHIPPING_METHOD_LABELS[rate.method]} · ${rate.pricePerKg}/kg</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">${rate.totalCost.toFixed(2)}</div>
                          <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                            <ClockIcon className="w-3 h-3" />
                            {rate.estimatedDays.min}-{rate.estimatedDays.max} days
                          </div>
                        </div>
                      </div>
                      {/* Cost Breakdown */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-2">
                          <div className="text-slate-400 dark:text-slate-500">Base Cost</div>
                          <div className="font-semibold text-slate-700 dark:text-slate-300">${rate.breakdown.baseCost.toFixed(2)}</div>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-2">
                          <div className="text-slate-400 dark:text-slate-500">Handling (5%)</div>
                          <div className="font-semibold text-slate-700 dark:text-slate-300">${rate.breakdown.handlingFee.toFixed(2)}</div>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-2">
                          <div className="text-slate-400 dark:text-slate-500">Insurance (1%)</div>
                          <div className="font-semibold text-slate-700 dark:text-slate-300">${rate.breakdown.insurance.toFixed(2)}</div>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-2">
                          <div className="text-slate-400 dark:text-slate-500">Customs</div>
                          <div className="font-semibold text-slate-700 dark:text-slate-300">${rate.breakdown.customsFee.toFixed(2)}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {rateEstimates.length === 0 && comparingRates === false && form.destinationCountry && form.weight && form.shipmentValue && (
              <div className="mt-4 text-center py-6 text-slate-400 text-sm border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                Click &quot;Compare Rates&quot; to see available shipping options with cost breakdown
              </div>
            )}

            {/* Manual Route Selection Fallback */}
            {filteredRoutes.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Or select a route manually</label>
                <select value={form.routeId} onChange={e => { setForm({...form, routeId: e.target.value}); setSelectedRate(null); }} className={selectClass}>
                  <option value="">Select Route</option>
                  {filteredRoutes.map((r: any) => (
                    <option key={r.id} value={r.id}>{r.name} - ${r.pricePerKg}/kg</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* ── Step 4: Review ── */}
        {currentStep === 4 && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-sm font-bold">4</span>
              Review & Submit
            </h3>

            {/* Selected Rate Summary */}
            {selectedRate && (
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-5 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${MethodBgColor(selectedRate.method)}`}>
                      <MethodIcon method={selectedRate.method} className={`w-6 h-6 ${MethodIconColor(selectedRate.method)}`} />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">{selectedRate.routeName}</div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">{SHIPPING_METHOD_LABELS[selectedRate.method]} · {selectedRate.estimatedDays.min}-{selectedRate.estimatedDays.max} days</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">${selectedRate.totalCost.toFixed(2)}</div>
                    <div className="text-xs text-emerald-500 dark:text-emerald-400">Total Cost</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="bg-white/70 dark:bg-slate-700/70 rounded-lg p-2">
                    <div className="text-slate-500 dark:text-slate-400">Base</div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200">${selectedRate.breakdown.baseCost.toFixed(2)}</div>
                  </div>
                  <div className="bg-white/70 dark:bg-slate-700/70 rounded-lg p-2">
                    <div className="text-slate-500 dark:text-slate-400">Handling</div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200">${selectedRate.breakdown.handlingFee.toFixed(2)}</div>
                  </div>
                  <div className="bg-white/70 dark:bg-slate-700/70 rounded-lg p-2">
                    <div className="text-slate-500 dark:text-slate-400">Insurance</div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200">${selectedRate.breakdown.insurance.toFixed(2)}</div>
                  </div>
                  <div className="bg-white/70 dark:bg-slate-700/70 rounded-lg p-2">
                    <div className="text-slate-500 dark:text-slate-400">Customs</div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200">${selectedRate.breakdown.customsFee.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Shipment Summary */}
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-slate-500 dark:text-slate-400">Sender</span>
                  <span className="font-medium text-slate-900 dark:text-white">{form.senderName}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-slate-500 dark:text-slate-400">Receiver</span>
                  <span className="font-medium text-slate-900 dark:text-white">{form.receiverName}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-slate-500 dark:text-slate-400">Destination</span>
                  <span className="font-medium text-slate-900 dark:text-white">{form.destinationCity}, {form.destinationCountry}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-slate-500 dark:text-slate-400">Weight</span>
                  <span className="font-medium text-slate-900 dark:text-white">{form.weight} kg</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-slate-500 dark:text-slate-400">Value</span>
                  <span className="font-medium text-slate-900 dark:text-white">${form.shipmentValue}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-slate-500 dark:text-slate-400">Method</span>
                  <span className="font-medium text-slate-900 dark:text-white">{SHIPPING_METHOD_LABELS[form.shippingMethod]}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center">
          <div>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
                className="px-5 py-2.5 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
              >
                Previous
              </button>
            )}
          </div>
          <div className="flex gap-3">
            {currentStep < 4 ? (
              <button
                type="button"
                onClick={() => canProceedToStep(currentStep + 1) && setCurrentStep(prev => Math.min(4, prev + 1))}
                disabled={!canProceedToStep(currentStep + 1)}
                className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next Step
              </button>
            ) : (
              <>
                <button type="button" onClick={() => setCurrentPage('dashboard')} className="px-6 py-2.5 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="px-8 py-2.5 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-500 disabled:opacity-50 transition-colors">
                  {loading ? 'Creating...' : 'Create Shipment'}
                </button>
              </>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
