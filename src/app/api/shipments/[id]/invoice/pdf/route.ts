import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rateLimit } from '@/lib/rbac';
import { verifyToken } from '@/lib/auth';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rateLimitResult = await rateLimit(request);
    if (rateLimitResult) return rateLimitResult;

    // Authenticate via query param token (since this is opened in a new browser tab)
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    if (!token) {
      return new NextResponse('<h1>401 - Authentication required</h1>', {
        status: 401,
        headers: { 'Content-Type': 'text/html' },
      });
    }
    const session = verifyToken(token);
    if (!session) {
      return new NextResponse('<h1>401 - Invalid or expired token</h1>', {
        status: 401,
        headers: { 'Content-Type': 'text/html' },
      });
    }

    const { id } = await params;
    const shipment = await db.shipment.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true, company: true } },
        warehouse: { select: { id: true, name: true, city: true, address: true } },
        route: true,
        trackingEvents: { orderBy: { timestamp: 'desc' } },
      },
    });

    if (!shipment) {
      return new NextResponse('<h1>404 - Shipment not found</h1>', {
        status: 404,
        headers: { 'Content-Type': 'text/html' },
      });
    }

    // Customers can only get their own invoices
    if (session.role === 'CUSTOMER' && shipment.customerId !== session.id) {
      return new NextResponse('<h1>403 - Forbidden</h1>', {
        status: 403,
        headers: { 'Content-Type': 'text/html' },
      });
    }

    // Generate invoice number: INV-2026-XXXXXX
    const shipmentNum = shipment.shipmentId.replace('ARWA-', '').replace('-', '');
    const invoiceNumber = `INV-2026-${shipmentNum.padStart(6, '0')}`;

    // Calculate costs
    const pricePerKg = shipment.route?.pricePerKg ?? 0;
    const subtotal = shipment.weight * pricePerKg;
    const handlingFee = subtotal * 0.05;
    const insurance = shipment.shipmentValue * 0.01;
    const total = subtotal + handlingFee + insurance;

    const now = new Date();
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + 30);

    // Labels
    const shippingMethodLabels: Record<string, string> = {
      AIR: 'Air Freight',
      SEA: 'Sea Freight',
      LAND: 'Land Freight',
    };
    const shipmentTypeLabels: Record<string, string> = {
      PARCEL: 'Parcel',
      LCL: 'LCL (Less than Container Load)',
      FCL: 'FCL (Full Container Load)',
    };

    const formatDate = (d: Date) =>
      d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const invoiceDate = formatDate(now);
    const dueDateStr = formatDate(dueDate);
    const shippingMethod = shippingMethodLabels[shipment.shippingMethod] || shipment.shippingMethod;
    const shipmentType = shipmentTypeLabels[shipment.shipmentType] || shipment.shipmentType;
    const routeInfo = shipment.route
      ? `Route: ${shipment.route.name} &middot; Est. ${shipment.route.estimatedDaysMin}-${shipment.route.estimatedDaysMax} days`
      : '';
    const dimensions = shipment.length
      ? `${shipment.length} &times; ${shipment.width} &times; ${shipment.height} cm`
      : '';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Invoice ${invoiceNumber} - ARWA LOGISTICS</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    color: #1e293b;
    background: #f8fafc;
    line-height: 1.6;
  }

  /* Print settings */
  @page {
    size: A4;
    margin: 15mm 15mm 20mm 15mm;
  }
  @media print {
    body { background: #fff; }
    .no-print { display: none !important; }
    .invoice-wrapper {
      box-shadow: none !important;
      border-radius: 0 !important;
      margin: 0 !important;
      max-width: 100% !important;
    }
  }

  /* Action bar */
  .action-bar {
    max-width: 820px;
    margin: 20px auto;
    display: flex;
    justify-content: flex-end;
    gap: 10px;
  }
  .btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 10px 20px;
    border: none; border-radius: 8px;
    font-size: 14px; font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
  }
  .btn-print { background: #e2e8f0; color: #475569; }
  .btn-print:hover { background: #cbd5e1; }
  .btn-download { background: #059669; color: #fff; }
  .btn-download:hover { background: #047857; }
  .btn svg { width: 16px; height: 16px; }

  /* Invoice document */
  .invoice-wrapper {
    max-width: 820px;
    margin: 0 auto 40px;
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06);
    overflow: hidden;
  }

  /* Header */
  .header {
    background: linear-gradient(135deg, #059669, #10b981);
    padding: 32px 40px;
    color: #fff;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .header-left { display: flex; align-items: center; gap: 16px; }
  .header-logo {
    width: 48px; height: 48px;
    background: rgba(255,255,255,0.2);
    border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    backdrop-filter: blur(4px);
  }
  .header-logo svg { width: 28px; height: 28px; fill: #fff; }
  .header-brand { font-size: 26px; font-weight: 800; letter-spacing: 1px; }
  .header-sub { font-size: 13px; color: rgba(255,255,255,0.8); margin-top: 2px; }
  .header-right { text-align: right; }
  .header-title { font-size: 32px; font-weight: 800; }
  .header-number { font-size: 13px; color: rgba(255,255,255,0.8); margin-top: 4px; }

  /* Body */
  .body { padding: 36px 40px; }

  /* Meta grid */
  .meta-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 24px;
    margin-bottom: 32px;
  }
  @media (max-width: 640px) {
    .meta-grid { grid-template-columns: 1fr; }
  }
  .meta-label {
    font-size: 11px; font-weight: 700; color: #94a3b8;
    text-transform: uppercase; letter-spacing: 1px;
    margin-bottom: 10px;
  }
  .meta-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 14px; }
  .meta-key { color: #64748b; }
  .meta-val { color: #0f172a; font-weight: 500; font-family: 'SF Mono', 'Cascadia Code', monospace; }
  .meta-name { font-weight: 600; color: #0f172a; }
  .meta-detail { color: #64748b; font-size: 14px; }

  /* Table */
  .section-label {
    font-size: 11px; font-weight: 700; color: #94a3b8;
    text-transform: uppercase; letter-spacing: 1px;
    margin-bottom: 10px;
  }
  .table-wrap {
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    overflow: hidden;
    margin-bottom: 32px;
  }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  thead tr { background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
  th { padding: 12px 16px; text-align: left; font-weight: 600; color: #475569; }
  th.center { text-align: center; }
  th.right { text-align: right; }
  td { padding: 12px 16px; }
  td.right { text-align: right; }
  td.center { text-align: center; }
  .td-mono { font-family: 'SF Mono', 'Cascadia Code', monospace; }
  .td-bold { font-weight: 700; }
  .td-sub { font-size: 12px; color: #94a3b8; margin-top: 2px; }
  tbody tr { border-bottom: 1px solid #f1f5f9; }
  tbody tr:last-child { border-bottom: none; }
  .route-row { background: #f8fafc; }
  .route-row td { padding: 8px 16px; font-size: 12px; color: #94a3b8; }

  /* Totals */
  .totals { display: flex; justify-content: flex-end; margin-bottom: 32px; }
  .totals-inner { width: 280px; }
  .totals-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
  .totals-key { color: #64748b; }
  .totals-val { color: #0f172a; font-family: 'SF Mono', 'Cascadia Code', monospace; }
  .totals-divider { border-top: 1px solid #f1f5f9; }
  .totals-total { border-top: 2px solid #e2e8f0; padding-top: 12px; padding-bottom: 0; }
  .totals-total .totals-key { font-size: 18px; font-weight: 800; color: #0f172a; }
  .totals-total .totals-val { font-size: 18px; font-weight: 800; color: #059669; }

  /* Bottom grid */
  .bottom-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
  }
  @media (max-width: 640px) {
    .bottom-grid { grid-template-columns: 1fr; }
  }
  .info-card {
    background: #f8fafc; border: 1px solid #f1f5f9;
    border-radius: 8px; padding: 20px;
  }
  .info-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 14px; }
  .info-key { color: #64748b; }
  .info-val { color: #0f172a; text-align: right; }
  .info-val-mono { font-family: 'SF Mono', 'Cascadia Code', monospace; }

  /* Footer */
  .footer {
    margin-top: 32px; padding-top: 24px;
    border-top: 1px solid #e2e8f0;
    text-align: center;
  }
  .footer-thanks { font-size: 12px; color: #94a3b8; }
  .footer-brand { font-size: 12px; color: #cbd5e1; margin-top: 4px; }
</style>
</head>
<body>

<!-- Action Bar (hidden when printing) -->
<div class="action-bar no-print">
  <button class="btn btn-print" onclick="window.print()">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="6 9 6 2 18 2 18 9"></polyline>
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
      <rect x="6" y="14" width="12" height="8"></rect>
    </svg>
    Print
  </button>
  <button class="btn btn-download" onclick="window.print()">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
      <polyline points="7 10 12 15 17 10"></polyline>
      <line x1="12" y1="15" x2="12" y2="3"></line>
    </svg>
    Download PDF
  </button>
</div>

<!-- Invoice Document -->
<div class="invoice-wrapper">

  <!-- Header -->
  <div class="header">
    <div class="header-left">
      <div class="header-logo">
        <svg viewBox="0 0 24 24"><path d="M1 3h15v13H1zM16 8h4l3 4v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
      </div>
      <div>
        <div class="header-brand">ARWA LOGISTICS</div>
        <div class="header-sub">Global Shipping Solutions</div>
      </div>
    </div>
    <div class="header-right">
      <div class="header-title">INVOICE</div>
      <div class="header-number">${invoiceNumber}</div>
    </div>
  </div>

  <!-- Body -->
  <div class="body">

    <!-- Meta Grid -->
    <div class="meta-grid">
      <!-- Invoice Details -->
      <div>
        <div class="meta-label">Invoice Details</div>
        <div class="meta-row"><span class="meta-key">Invoice #</span><span class="meta-val">${invoiceNumber}</span></div>
        <div class="meta-row"><span class="meta-key">Date</span><span class="meta-val">${invoiceDate}</span></div>
        <div class="meta-row"><span class="meta-key">Due Date</span><span class="meta-val">${dueDateStr}</span></div>
        <div class="meta-row"><span class="meta-key">Shipment</span><span class="meta-val">${shipment.shipmentId}</span></div>
      </div>
      <!-- Bill To -->
      <div>
        <div class="meta-label">Bill To</div>
        <div class="meta-name">${shipment.customer.name}</div>
        ${shipment.customer.company ? `<div class="meta-detail">${shipment.customer.company}</div>` : ''}
        <div class="meta-detail">${shipment.customer.email}</div>
        ${shipment.customer.phone ? `<div class="meta-detail">${shipment.customer.phone}</div>` : ''}
      </div>
      <!-- Ship To -->
      <div>
        <div class="meta-label">Ship To</div>
        <div class="meta-name">${shipment.receiverName}</div>
        ${shipment.receiverAddress ? `<div class="meta-detail">${shipment.receiverAddress}</div>` : ''}
        <div class="meta-detail">${shipment.destinationCity}, ${shipment.destinationCountry}</div>
        ${shipment.receiverPhone ? `<div class="meta-detail">${shipment.receiverPhone}</div>` : ''}
      </div>
    </div>

    <!-- Line Items -->
    <div class="section-label">Shipment Details</div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th class="center">Method</th>
            <th class="right">Weight (kg)</th>
            <th class="right">Rate/kg</th>
            <th class="right">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <div style="font-weight:500;color:#0f172a;">${shipment.productDescription}</div>
              <div class="td-sub">${shipment.shipmentId} &middot; ${shipmentType}</div>
            </td>
            <td class="center" style="color:#475569;">${shippingMethod}</td>
            <td class="right td-mono">${shipment.weight}</td>
            <td class="right td-mono">$${pricePerKg.toFixed(2)}</td>
            <td class="right td-mono td-bold">$${(Math.round(subtotal * 100) / 100).toFixed(2)}</td>
          </tr>
          ${routeInfo ? `<tr class="route-row"><td colspan="5">${routeInfo}</td></tr>` : ''}
        </tbody>
      </table>
    </div>

    <!-- Totals -->
    <div class="totals">
      <div class="totals-inner">
        <div class="totals-row">
          <span class="totals-key">Subtotal</span>
          <span class="totals-val">$${(Math.round(subtotal * 100) / 100).toFixed(2)}</span>
        </div>
        <div class="totals-row totals-divider">
          <span class="totals-key">Handling Fee (5%)</span>
          <span class="totals-val">$${(Math.round(handlingFee * 100) / 100).toFixed(2)}</span>
        </div>
        <div class="totals-row totals-divider">
          <span class="totals-key">Insurance (1% of value)</span>
          <span class="totals-val">$${(Math.round(insurance * 100) / 100).toFixed(2)}</span>
        </div>
        <div class="totals-row totals-total">
          <span class="totals-key">Total</span>
          <span class="totals-val">$${(Math.round(total * 100) / 100).toFixed(2)}</span>
        </div>
      </div>
    </div>

    <!-- Bottom Grid -->
    <div class="bottom-grid">
      <!-- Payment Terms -->
      <div class="info-card">
        <div class="meta-label">Payment Terms</div>
        <p style="font-size:14px;color:#334155;margin-bottom:8px;">Due within 30 days</p>
        <p style="font-size:12px;color:#94a3b8;">Shipment Value: <span class="info-val-mono" style="color:#475569;">$${shipment.shipmentValue.toFixed(2)}</span></p>
        ${dimensions ? `<p style="font-size:12px;color:#94a3b8;margin-top:4px;">Dimensions: <span class="info-val-mono" style="color:#475569;">${dimensions}</span></p>` : ''}
      </div>
      <!-- Bank Details -->
      <div class="info-card">
        <div class="meta-label">Bank Details</div>
        <div class="info-row"><span class="info-key">Bank</span><span class="info-val">Bank of China</span></div>
        <div class="info-row"><span class="info-key">Account</span><span class="info-val info-val-mono">XXXX-XXXX-XXXX</span></div>
        <div class="info-row"><span class="info-key">SWIFT</span><span class="info-val info-val-mono">BKCHCNBJ</span></div>
        <div class="info-row"><span class="info-key">Beneficiary</span><span class="info-val">ARWA LOGISTICS CO., LTD</span></div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p class="footer-thanks">Thank you for choosing ARWA LOGISTICS. If you have questions about this invoice, please contact support@arwalogistics.com</p>
      <p class="footer-brand">ARWA LOGISTICS CO., LTD &middot; Global Shipping from China to the World</p>
    </div>

  </div>
</div>

<script>
  // Auto-trigger print dialog after a short delay so the page renders first
  // Users can cancel and use the buttons instead
</script>

</body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('API Error:', error);
    return new NextResponse(
      `<html><body><h1>500 - Internal Server Error</h1><p>Internal server error</p></body></html>`,
      {
        status: 500,
        headers: { 'Content-Type': 'text/html' },
      }
    );
  }
}
