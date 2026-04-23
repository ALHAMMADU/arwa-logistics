'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import { ArrowLeftIcon, CreditCardIcon, DollarSignIcon, ReceiptIcon, CheckCircleIcon, XIcon, ClockIcon, ShieldIcon } from '@/components/icons';
import { SHIPPING_METHOD_LABELS } from '@/lib/shipping';

interface PaymentData {
  id: string;
  paymentId: string;
  shipmentId: string;
  userId: string;
  amount: number;
  subtotal: number;
  handlingFee: number;
  insuranceFee: number;
  currency: string;
  method: string;
  status: string;
  transactionRef: string | null;
  cardLast4: string | null;
  paidAt: string | null;
  refundedAt: string | null;
  notes: string | null;
  createdAt: string;
  shipment: {
    shipmentId: string;
    trackingNumber: string;
    senderName: string;
    receiverName: string;
    destinationCity: string;
    destinationCountry: string;
    weight: number;
    shipmentValue: number;
    shippingMethod: string;
    productDescription: string;
    route: { name: string; pricePerKg: number } | null;
  };
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    company: string | null;
  };
}

type PaymentMethod = 'CREDIT_CARD' | 'BANK_TRANSFER' | 'WALLET' | 'CASH';

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CREDIT_CARD: 'Credit Card',
  BANK_TRANSFER: 'Bank Transfer',
  WALLET: 'Digital Wallet',
  CASH: 'Cash on Delivery',
};

const PAYMENT_METHOD_ICONS: Record<PaymentMethod, React.ReactNode> = {
  CREDIT_CARD: <CreditCardIcon className="w-5 h-5" />,
  BANK_TRANSFER: <DollarSignIcon className="w-5 h-5" />,
  WALLET: <ReceiptIcon className="w-5 h-5" />,
  CASH: <DollarSignIcon className="w-5 h-5" />,
};

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  PENDING: { color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800', label: 'Pending' },
  PROCESSING: { color: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800', label: 'Processing' },
  COMPLETED: { color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800', label: 'Completed' },
  FAILED: { color: 'text-red-700 dark:text-red-300', bg: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800', label: 'Failed' },
  REFUNDED: { color: 'text-purple-700 dark:text-purple-300', bg: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800', label: 'Refunded' },
};

export default function PaymentPage() {
  const { selectedShipmentId, setCurrentPage } = useAppStore();
  const [payment, setPayment] = useState<PaymentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('CREDIT_CARD');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showFailureModal, setShowFailureModal] = useState(false);

  // Credit card form state
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardholderName, setCardholderName] = useState('');

  useEffect(() => {
    if (!selectedShipmentId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch(`/payments?shipmentId=${selectedShipmentId}&limit=1`);
        if (!cancelled && res.success && res.data?.payments?.length > 0) {
          setPayment(res.data.payments[0]);
        }
      } catch {
        // No existing payment - user will create one
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [selectedShipmentId]);

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 16);
    const groups = cleaned.match(/.{1,4}/g);
    return groups ? groups.join(' ') : cleaned;
  };

  const formatExpiry = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 4);
    if (cleaned.length >= 3) {
      return cleaned.slice(0, 2) + '/' + cleaned.slice(2);
    }
    return cleaned;
  };

  const handleCreatePayment = async () => {
    if (!selectedShipmentId) {
      toast.error('No shipment selected');
      return;
    }

    setCreating(true);
    try {
      const res = await apiFetch('/payments', {
        method: 'POST',
        body: JSON.stringify({
          shipmentId: selectedShipmentId,
          method: selectedMethod,
        }),
      });

      if (res.success) {
        setPayment(res.data);
        toast.success('Payment created successfully');
      } else {
        toast.error(res.error || 'Failed to create payment');
      }
    } catch {
      toast.error('Failed to create payment');
    }
    setCreating(false);
  };

  const handleProcessPayment = async () => {
    if (!payment) return;

    if (selectedMethod === 'CREDIT_CARD') {
      const cleanCard = cardNumber.replace(/\s/g, '');
      if (cleanCard.length < 16 || !expiry || !cvv || !cardholderName) {
        toast.error('Please fill in all card details');
        return;
      }
    }

    setProcessing(true);
    try {
      const body: any = {};
      if (selectedMethod === 'CREDIT_CARD') {
        body.cardLast4 = cardNumber.replace(/\s/g, '').slice(-4);
        body.cardholderName = cardholderName;
      } else if (selectedMethod === 'BANK_TRANSFER') {
        body.bankReference = 'BANK-REF-' + Date.now();
      } else if (selectedMethod === 'WALLET') {
        body.walletId = 'WALLET-' + Date.now();
      }

      const res = await apiFetch(`/payments/${payment.id}/process`, {
        method: 'POST',
        body: JSON.stringify(body),
      });

      if (res.success) {
        setPayment(res.data);
        setShowSuccessModal(true);
        toast.success('Payment processed successfully');
      } else {
        if (res.data) setPayment(res.data);
        setShowFailureModal(true);
        toast.error(res.error || 'Payment processing failed');
      }
    } catch {
      toast.error('Payment processing failed');
      setShowFailureModal(true);
    }
    setProcessing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 dark:text-slate-500 text-sm">Loading payment details...</p>
        </div>
      </div>
    );
  }

  if (!selectedShipmentId) {
    return (
      <div className="max-w-3xl mx-auto">
        <button onClick={() => setCurrentPage('dashboard')} className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 mb-6 text-sm transition-colors">
          <ArrowLeftIcon className="w-4 h-4" /> Back
        </button>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
          <p className="text-slate-400 dark:text-slate-500">No shipment selected for payment</p>
        </div>
      </div>
    );
  }

  const statusConfig = payment ? STATUS_CONFIG[payment.status] : null;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => setCurrentPage('shipment-detail')} className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-sm transition-colors">
          <ArrowLeftIcon className="w-4 h-4" /> Back to Shipment
        </button>
        {payment && (
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium ${statusConfig?.bg} ${statusConfig?.color}`}>
            {payment.status === 'COMPLETED' && <CheckCircleIcon className="w-4 h-4" />}
            {payment.status === 'PENDING' && <ClockIcon className="w-4 h-4" />}
            {statusConfig?.label || payment.status}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left - Payment Form / Summary */}
        <div className="lg:col-span-3 space-y-6">
          {/* Payment Summary Card */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                  <ReceiptIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Payment Summary</h2>
                  {payment && <p className="text-emerald-100 text-sm font-mono">{payment.paymentId}</p>}
                </div>
              </div>
            </div>
            <div className="p-5">
              {/* Cost Breakdown */}
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Subtotal (Shipping Cost)</span>
                  <span className="text-slate-900 dark:text-slate-100 font-mono">${(payment?.subtotal || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Handling Fee (5%)</span>
                  <span className="text-slate-900 dark:text-slate-100 font-mono">${(payment?.handlingFee || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Insurance (1%)</span>
                  <span className="text-slate-900 dark:text-slate-100 font-mono">${(payment?.insuranceFee || 0).toFixed(2)}</span>
                </div>
                <div className="border-t border-slate-200 dark:border-slate-700 pt-3 flex justify-between">
                  <span className="text-lg font-bold text-slate-900 dark:text-slate-100">Total</span>
                  <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono">${(payment?.amount || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Method Selection - Only show before payment is created or if PENDING */}
          {(!payment || payment.status === 'PENDING') && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">Select Payment Method</h3>
              <div className="grid grid-cols-2 gap-3">
                {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((method) => (
                  <button
                    key={method}
                    onClick={() => setSelectedMethod(method)}
                    disabled={!!payment}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all ${
                      selectedMethod === method
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800'
                    } ${payment ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <div className={`p-2 rounded-lg ${selectedMethod === method ? 'bg-emerald-100 dark:bg-emerald-800/50 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                      {PAYMENT_METHOD_ICONS[method]}
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${selectedMethod === method ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-700 dark:text-slate-300'}`}>
                        {PAYMENT_METHOD_LABELS[method]}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Credit Card Form */}
          {(!payment || payment.status === 'PENDING') && selectedMethod === 'CREDIT_CARD' && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">Card Details</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5">Card Number</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                      placeholder="1234 5678 9012 3456"
                      maxLength={19}
                      className="w-full px-4 py-2.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 font-mono"
                    />
                    <CreditCardIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5">Expiry Date</label>
                    <input
                      type="text"
                      value={expiry}
                      onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                      placeholder="MM/YY"
                      maxLength={5}
                      className="w-full px-4 py-2.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5">CVV</label>
                    <input
                      type="password"
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="•••"
                      maxLength={4}
                      className="w-full px-4 py-2.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5">Cardholder Name</label>
                  <input
                    type="text"
                    value={cardholderName}
                    onChange={(e) => setCardholderName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full px-4 py-2.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Bank Transfer Details */}
          {(!payment || payment.status === 'PENDING') && selectedMethod === 'BANK_TRANSFER' && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">Bank Transfer Details</h3>
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Bank</span>
                  <span className="text-slate-900 dark:text-slate-100 font-medium">Bank of China</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Account Number</span>
                  <span className="font-mono text-slate-900 dark:text-slate-100">XXXX-XXXX-XXXX</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">SWIFT Code</span>
                  <span className="font-mono text-slate-900 dark:text-slate-100">BKCHCNBJ</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Beneficiary</span>
                  <span className="text-slate-900 dark:text-slate-100 font-medium">ARWA LOGISTICS CO., LTD</span>
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                Please include your shipment ID as reference when making the transfer.
              </p>
            </div>
          )}

          {/* Wallet Info */}
          {(!payment || payment.status === 'PENDING') && selectedMethod === 'WALLET' && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">Digital Wallet</h3>
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 text-sm">
                <p className="text-slate-600 dark:text-slate-300">
                  You will be redirected to complete payment using your digital wallet.
                  Supported wallets: Alipay, WeChat Pay, PayPal.
                </p>
              </div>
            </div>
          )}

          {/* Cash Info */}
          {(!payment || payment.status === 'PENDING') && selectedMethod === 'CASH' && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">Cash on Delivery</h3>
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 text-sm">
                <p className="text-slate-600 dark:text-slate-300">
                  Payment will be collected upon delivery. A confirmation receipt will be provided by the delivery agent.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right - Action Panel */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 sticky top-4">
            {/* Shipment Info */}
            {payment?.shipment && (
              <div className="mb-5">
                <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Shipment Info</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Shipment</span>
                    <span className="font-mono text-slate-900 dark:text-slate-100">{payment.shipment.shipmentId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Destination</span>
                    <span className="text-slate-900 dark:text-slate-100">{payment.shipment.destinationCity}, {payment.shipment.destinationCountry}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Weight</span>
                    <span className="text-slate-900 dark:text-slate-100">{payment.shipment.weight} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Method</span>
                    <span className="text-slate-900 dark:text-slate-100">{SHIPPING_METHOD_LABELS[payment.shipment.shippingMethod] || payment.shipment.shippingMethod}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Transaction Details */}
            {payment && payment.status !== 'PENDING' && (
              <div className="mb-5">
                <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Transaction</h3>
                <div className="space-y-2 text-sm">
                  {payment.transactionRef && (
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Ref</span>
                      <span className="font-mono text-slate-900 dark:text-slate-100">{payment.transactionRef}</span>
                    </div>
                  )}
                  {payment.cardLast4 && (
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Card</span>
                      <span className="font-mono text-slate-900 dark:text-slate-100">•••• {payment.cardLast4}</span>
                    </div>
                  )}
                  {payment.paidAt && (
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Paid</span>
                      <span className="text-slate-900 dark:text-slate-100">{new Date(payment.paidAt).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Total Amount */}
            <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mb-5">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500 dark:text-slate-400">Amount Due</span>
                <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">${(payment?.amount || 0).toFixed(2)}</span>
              </div>
            </div>

            {/* Action Buttons */}
            {!payment ? (
              <button
                onClick={handleCreatePayment}
                disabled={creating}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <DollarSignIcon className="w-4 h-4" />
                    Create Payment
                  </>
                )}
              </button>
            ) : payment.status === 'PENDING' ? (
              <button
                onClick={handleProcessPayment}
                disabled={processing}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <ShieldIcon className="w-4 h-4" />
                    Pay Now ${(payment.amount).toFixed(2)}
                  </>
                )}
              </button>
            ) : payment.status === 'COMPLETED' ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 justify-center text-emerald-600 dark:text-emerald-400 font-medium text-sm">
                  <CheckCircleIcon className="w-5 h-5" />
                  Payment Completed
                </div>
                <button
                  onClick={() => setCurrentPage('shipment-detail')}
                  className="w-full px-6 py-2.5 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 font-medium text-sm transition-colors"
                >
                  Back to Shipment
                </button>
              </div>
            ) : payment.status === 'FAILED' ? (
              <button
                onClick={handleProcessPayment}
                disabled={processing}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <ShieldIcon className="w-4 h-4" />
                    Retry Payment
                  </>
                )}
              </button>
            ) : null}

            {/* Security Note */}
            {(!payment || payment.status === 'PENDING' || payment.status === 'FAILED') && (
              <div className="flex items-center gap-2 mt-4 text-xs text-slate-400 dark:text-slate-500">
                <ShieldIcon className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Your payment information is encrypted and secure</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && payment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircleIcon className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Payment Successful!</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
              Your payment of <span className="font-bold text-emerald-600 dark:text-emerald-400">${payment.amount.toFixed(2)}</span> has been processed successfully.
            </p>
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3 mb-6 text-sm space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Payment ID</span>
                <span className="font-mono text-slate-900 dark:text-slate-100">{payment.paymentId}</span>
              </div>
              {payment.transactionRef && (
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Transaction Ref</span>
                  <span className="font-mono text-slate-900 dark:text-slate-100">{payment.transactionRef}</span>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowSuccessModal(false); setCurrentPage('shipment-detail'); }}
                className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-medium transition-colors"
              >
                View Shipment
              </button>
              <button
                onClick={() => { setShowSuccessModal(false); setCurrentPage('invoice'); }}
                className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 text-sm font-medium transition-colors"
              >
                View Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Failure Modal */}
      {showFailureModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <XIcon className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Payment Failed</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
              We could not process your payment. Please check your details and try again.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowFailureModal(false)}
                className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-medium transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => { setShowFailureModal(false); handleProcessPayment(); }}
                className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 text-sm font-medium transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
