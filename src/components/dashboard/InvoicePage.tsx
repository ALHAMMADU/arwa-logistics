'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { apiFetch } from '@/lib/api';
import { ArrowLeftIcon, DownloadIcon, PrintIcon, ShipIcon } from '@/components/icons';
import { SHIPPING_METHOD_LABELS, SHIPMENT_TYPE_LABELS } from '@/lib/shipping';

interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  billTo: {
    name: string;
    email: string;
    company: string;
    phone: string;
  };
  shipTo: {
    name: string;
    address: string;
    city: string;
    country: string;
    phone: string;
  };
  shipment: {
    id: string;
    shipmentId: string;
    trackingNumber: string;
    shippingMethod: string;
    shipmentType: string;
    productDescription: string;
    weight: number;
    shipmentValue: number;
    status: string;
    createdAt: string;
    estimatedDelivery: string | null;
    dimensions: { length: number; width: number; height: number } | null;
  };
  route: {
    name: string;
    originCountry: string;
    destinationCountry: string;
    destinationCity: string | null;
    pricePerKg: number;
    estimatedDaysMin: number;
    estimatedDaysMax: number;
  } | null;
  costs: {
    pricePerKg: number;
    subtotal: number;
    handlingFee: number;
    insurance: number;
    total: number;
  };
  bankDetails: {
    bank: string;
    account: string;
    swift: string;
    beneficiary: string;
  };
  paymentTerms: string;
}

export default function InvoicePage() {
  const { selectedShipmentId, setCurrentPage } = useAppStore();
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedShipmentId) {
      apiFetch(`/shipments/${selectedShipmentId}/invoice`).then(r => {
        if (r.success) {
          setInvoice(r.data);
        } else {
          setError(r.error || 'Failed to load invoice');
        }
        setLoading(false);
      }).catch(() => {
        setError('Failed to load invoice');
        setLoading(false);
      });
    }
  }, [selectedShipmentId]);

  // Handle no shipment selected
  const noShipmentSelected = !selectedShipmentId && !loading;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    const token = useAppStore.getState().token;
    const url = `/api/shipments/${selectedShipmentId}/invoice/pdf${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    window.open(url, '_blank');
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (error || !invoice || noShipmentSelected) {
    return (
      <div className="max-w-5xl mx-auto">
        <button onClick={() => setCurrentPage('shipment-detail')} className="flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-6 text-sm transition-colors">
          <ArrowLeftIcon className="w-4 h-4" /> Back
        </button>
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <p className="text-slate-400">{noShipmentSelected ? 'No shipment selected' : (error || 'Invoice not found')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Action bar - hidden when printing */}
      <div className="print-hide flex items-center justify-between mb-6">
        <button onClick={() => setCurrentPage('shipment-detail')} className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm transition-colors">
          <ArrowLeftIcon className="w-4 h-4" /> Back to Shipment
        </button>
        <div className="flex gap-3">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm transition-colors"
          >
            <PrintIcon className="w-4 h-4" /> Print
          </button>
          <button
            onClick={handleDownloadPdf}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 text-sm transition-colors"
          >
            <DownloadIcon className="w-4 h-4" /> Download PDF
          </button>
        </div>
      </div>

      {/* Invoice Document */}
      <div className="invoice-document bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 p-8 text-white print-header">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <ShipIcon className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-wide">ARWA LOGISTICS</h1>
                <p className="text-emerald-100 text-sm">Global Shipping Solutions</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold">INVOICE</p>
              <p className="text-emerald-100 text-sm mt-1">{invoice.invoiceNumber}</p>
            </div>
          </div>
        </div>

        {/* Invoice Meta */}
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Invoice Info */}
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Invoice Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Invoice #</span>
                  <span className="font-mono font-semibold text-slate-900">{invoice.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Date</span>
                  <span className="text-slate-900">{formatDate(invoice.invoiceDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Due Date</span>
                  <span className="text-slate-900">{formatDate(invoice.dueDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Shipment</span>
                  <span className="font-mono text-slate-900">{invoice.shipment.shipmentId}</span>
                </div>
              </div>
            </div>

            {/* Bill To */}
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Bill To</h3>
              <div className="text-sm space-y-1">
                <p className="font-semibold text-slate-900">{invoice.billTo.name}</p>
                {invoice.billTo.company && <p className="text-slate-700">{invoice.billTo.company}</p>}
                <p className="text-slate-500">{invoice.billTo.email}</p>
                {invoice.billTo.phone && <p className="text-slate-500">{invoice.billTo.phone}</p>}
              </div>
            </div>

            {/* Ship To */}
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Ship To</h3>
              <div className="text-sm space-y-1">
                <p className="font-semibold text-slate-900">{invoice.shipTo.name}</p>
                {invoice.shipTo.address && <p className="text-slate-500">{invoice.shipTo.address}</p>}
                <p className="text-slate-500">{invoice.shipTo.city}, {invoice.shipTo.country}</p>
                {invoice.shipTo.phone && <p className="text-slate-500">{invoice.shipTo.phone}</p>}
              </div>
            </div>
          </div>

          {/* Shipment Details Table */}
          <div className="mb-8">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Shipment Details</h3>
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Description</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600">Method</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">Weight (kg)</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">Rate/kg</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-100">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-slate-900">{invoice.shipment.productDescription}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {invoice.shipment.shipmentId} &middot; {SHIPMENT_TYPE_LABELS[invoice.shipment.shipmentType as keyof typeof SHIPMENT_TYPE_LABELS] || invoice.shipment.shipmentType}
                        </p>
                      </div>
                    </td>
                    <td className="text-center px-4 py-3 text-slate-600">
                      {SHIPPING_METHOD_LABELS[invoice.shipment.shippingMethod as keyof typeof SHIPPING_METHOD_LABELS] || invoice.shipment.shippingMethod}
                    </td>
                    <td className="text-right px-4 py-3 text-slate-900 font-mono">{invoice.shipment.weight}</td>
                    <td className="text-right px-4 py-3 text-slate-900 font-mono">${invoice.costs.pricePerKg.toFixed(2)}</td>
                    <td className="text-right px-4 py-3 text-slate-900 font-mono font-semibold">${invoice.costs.subtotal.toFixed(2)}</td>
                  </tr>
                  {invoice.route && (
                    <tr className="bg-slate-50/50">
                      <td colSpan={5} className="px-4 py-2 text-xs text-slate-400">
                        Route: {invoice.route.name} &middot; Est. {invoice.route.estimatedDaysMin}-{invoice.route.estimatedDaysMax} days
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-8">
            <div className="w-full max-w-xs">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-2">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="text-slate-900 font-mono">${invoice.costs.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2 border-t border-slate-100">
                  <span className="text-slate-500">Handling Fee (5%)</span>
                  <span className="text-slate-900 font-mono">${invoice.costs.handlingFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2 border-t border-slate-100">
                  <span className="text-slate-500">Insurance (1% of value)</span>
                  <span className="text-slate-900 font-mono">${invoice.costs.insurance.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-3 border-t-2 border-slate-200">
                  <span className="text-lg font-bold text-slate-900">Total</span>
                  <span className="text-lg font-bold text-emerald-600 font-mono">${invoice.costs.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Payment Terms */}
            <div className="bg-slate-50 rounded-lg p-5 border border-slate-100">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Payment Terms</h3>
              <p className="text-sm text-slate-700">{invoice.paymentTerms}</p>
              <p className="text-xs text-slate-400 mt-2">
                Shipment Value: <span className="font-mono text-slate-600">${invoice.shipment.shipmentValue.toFixed(2)}</span>
              </p>
              {invoice.shipment.dimensions && (
                <p className="text-xs text-slate-400 mt-1">
                  Dimensions: <span className="font-mono text-slate-600">
                    {invoice.shipment.dimensions.length} × {invoice.shipment.dimensions.width} × {invoice.shipment.dimensions.height} cm
                  </span>
                </p>
              )}
            </div>

            {/* Bank Details */}
            <div className="bg-slate-50 rounded-lg p-5 border border-slate-100">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Bank Details</h3>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Bank</span>
                  <span className="text-slate-900">{invoice.bankDetails.bank}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Account</span>
                  <span className="font-mono text-slate-900">{invoice.bankDetails.account}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">SWIFT</span>
                  <span className="font-mono text-slate-900">{invoice.bankDetails.swift}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Beneficiary</span>
                  <span className="text-slate-900 text-right">{invoice.bankDetails.beneficiary}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-slate-200 text-center">
            <p className="text-xs text-slate-400">
              Thank you for choosing ARWA LOGISTICS. If you have questions about this invoice, please contact support@arwalogistics.com
            </p>
            <p className="text-xs text-slate-300 mt-1">
              ARWA LOGISTICS CO., LTD &middot; Global Shipping from China to the World
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
