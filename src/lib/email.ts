import { db } from './db';

// ─── TYPES ───────────────────────────────────────────────

interface EmailTemplate {
  to: string;
  subject: string;
  html: string;
  text: string;
}

type EmailType = 'SHIPMENT_CREATED' | 'STATUS_UPDATE' | 'DELIVERED' | 'WELCOME' | 'PASSWORD_CHANGE' | 'INVOICE';

// ─── TEMPLATE HELPERS ────────────────────────────────────

function renderEmail(template: string, data: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] || '');
}

function baseEmailTemplate(content: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
    <body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;">
      <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;margin-top:20px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);">
        <div style="background:#059669;padding:24px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:24px;letter-spacing:2px;">ARWA LOGISTICS</h1>
          <p style="margin:4px 0 0;color:#d1fae5;font-size:12px;">Global Shipping Platform</p>
        </div>
        <div style="padding:32px;">${content}</div>
        <div style="background:#f1f5f9;padding:16px;text-align:center;color:#64748b;font-size:12px;">
          <p style="margin:0;">ARWA LOGISTICS - Shipping from China to the World</p>
          <p style="margin:4px 0 0;">This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function baseTextTemplate(content: string): string {
  return `
ARWA LOGISTICS
Global Shipping Platform
────────────────────────────────

${content}

────────────────────────────────
ARWA LOGISTICS - Shipping from China to the World
This is an automated message. Please do not reply to this email.
  `.trim();
}

// ─── EMAIL SENDER ────────────────────────────────────────

async function sendEmail(template: EmailTemplate, emailType: EmailType, entityType?: string, entityId?: string): Promise<void> {
  try {
    // Log email to database
    const emailLog = await db.emailLog.create({
      data: {
        to: template.to,
        subject: template.subject,
        htmlBody: template.html,
        textBody: template.text,
        emailType,
        entityType: entityType || null,
        entityId: entityId || null,
        status: 'PENDING',
      },
    });

    // In production, this would use nodemailer or similar SMTP service
    // For now, we log to console and mark as SENT
    console.log(`[EMAIL] Sending ${emailType} email to ${template.to}: ${template.subject}`);

    // Simulate sending - in production, integrate with SMTP here
    // const transporter = nodemailer.createTransport({...});
    // await transporter.sendMail({ from, to, subject, html, text });

    // Update log as sent
    await db.emailLog.update({
      where: { id: emailLog.id },
      data: {
        status: 'SENT',
        sentAt: new Date(),
      },
    });

    console.log(`[EMAIL] Successfully sent ${emailType} email to ${template.to}`);
  } catch (error: any) {
    console.error(`[EMAIL] Failed to send ${emailType} email to ${template.to}:`, error.message);

    // Try to log the failure
    try {
      await db.emailLog.create({
        data: {
          to: template.to,
          subject: template.subject,
          htmlBody: template.html,
          textBody: template.text,
          emailType,
          entityType: entityType || null,
          entityId: entityId || null,
          status: 'FAILED',
          error: error.message || 'Unknown error',
        },
      });
    } catch (logError) {
      console.error('[EMAIL] Failed to log email failure:', logError);
    }
  }
}

// ─── STATUS LABEL MAP ────────────────────────────────────

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    'CREATED': 'Shipment Created',
    'WAITING_WAREHOUSE_ARRIVAL': 'Waiting for Warehouse Arrival',
    'RECEIVED_AT_WAREHOUSE': 'Received at Warehouse',
    'PROCESSING': 'Processing',
    'READY_FOR_DISPATCH': 'Ready for Dispatch',
    'DISPATCHED': 'Dispatched',
    'IN_TRANSIT': 'In Transit',
    'ARRIVED_AT_DESTINATION': 'Arrived at Destination',
    'CUSTOMS_CLEARANCE': 'Customs Clearance',
    'OUT_FOR_DELIVERY': 'Out for Delivery',
    'DELIVERED': 'Delivered',
  };
  return labels[status] || status;
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    'CREATED': '#6b7280',
    'WAITING_WAREHOUSE_ARRIVAL': '#f59e0b',
    'RECEIVED_AT_WAREHOUSE': '#3b82f6',
    'PROCESSING': '#8b5cf6',
    'READY_FOR_DISPATCH': '#06b6d4',
    'DISPATCHED': '#f97316',
    'IN_TRANSIT': '#0ea5e9',
    'ARRIVED_AT_DESTINATION': '#14b8a6',
    'CUSTOMS_CLEARANCE': '#eab308',
    'OUT_FOR_DELIVERY': '#22c55e',
    'DELIVERED': '#059669',
  };
  return colors[status] || '#6b7280';
}

// ─── EMAIL TEMPLATE FUNCTIONS ────────────────────────────

export async function sendShipmentCreatedEmail(
  customerEmail: string,
  customerName: string,
  shipmentId: string,
  trackingNumber: string,
  destination: string
): Promise<void> {
  const html = baseEmailTemplate(`
    <h2 style="margin:0 0 16px;color:#1e293b;font-size:20px;">Shipment Created Successfully!</h2>
    <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.6;">
      Dear ${customerName},
    </p>
    <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.6;">
      Your shipment has been created and is now being processed. Here are your shipment details:
    </p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin:16px 0;">
      <table style="width:100%;font-size:14px;color:#334155;">
        <tr>
          <td style="padding:6px 0;font-weight:600;color:#64748b;">Shipment ID:</td>
          <td style="padding:6px 0;">${shipmentId}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-weight:600;color:#64748b;">Tracking Number:</td>
          <td style="padding:6px 0;font-weight:700;color:#059669;font-size:16px;">${trackingNumber}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-weight:600;color:#64748b;">Destination:</td>
          <td style="padding:6px 0;">${destination}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-weight:600;color:#64748b;">Status:</td>
          <td style="padding:6px 0;">
            <span style="background:#d1fae5;color:#065f46;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;">Created</span>
          </td>
        </tr>
      </table>
    </div>
    <p style="margin:16px 0 0;color:#475569;font-size:14px;line-height:1.6;">
      You can track your shipment at any time using the tracking number above. We will notify you of any status updates.
    </p>
    <div style="text-align:center;margin:24px 0 0;">
      <a href="#" style="background:#059669;color:#ffffff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;display:inline-block;">Track Your Shipment</a>
    </div>
  `);

  const text = baseTextTemplate(`
Shipment Created Successfully!

Dear ${customerName},

Your shipment has been created and is now being processed.

Shipment ID: ${shipmentId}
Tracking Number: ${trackingNumber}
Destination: ${destination}
Status: Created

You can track your shipment at any time using the tracking number above. We will notify you of any status updates.
  `);

  await sendEmail(
    { to: customerEmail, subject: `Shipment Created - ${shipmentId}`, html, text },
    'SHIPMENT_CREATED',
    'Shipment',
    shipmentId
  );
}

export async function sendStatusUpdateEmail(
  customerEmail: string,
  customerName: string,
  shipmentId: string,
  trackingNumber: string,
  newStatus: string,
  location: string
): Promise<void> {
  const statusLabel = getStatusLabel(newStatus);
  const statusColor = getStatusColor(newStatus);

  const html = baseEmailTemplate(`
    <h2 style="margin:0 0 16px;color:#1e293b;font-size:20px;">Shipment Status Update</h2>
    <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.6;">
      Dear ${customerName},
    </p>
    <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.6;">
      Your shipment status has been updated. Here are the latest details:
    </p>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin:16px 0;">
      <table style="width:100%;font-size:14px;color:#334155;">
        <tr>
          <td style="padding:6px 0;font-weight:600;color:#64748b;">Shipment ID:</td>
          <td style="padding:6px 0;">${shipmentId}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-weight:600;color:#64748b;">Tracking Number:</td>
          <td style="padding:6px 0;font-weight:700;color:#059669;font-size:16px;">${trackingNumber}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-weight:600;color:#64748b;">New Status:</td>
          <td style="padding:6px 0;">
            <span style="background:${statusColor}20;color:${statusColor};padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;">${statusLabel}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-weight:600;color:#64748b;">Location:</td>
          <td style="padding:6px 0;">${location}</td>
        </tr>
      </table>
    </div>
    <p style="margin:16px 0 0;color:#475569;font-size:14px;line-height:1.6;">
      We will continue to keep you informed about your shipment's progress. Thank you for choosing ARWA LOGISTICS.
    </p>
    <div style="text-align:center;margin:24px 0 0;">
      <a href="#" style="background:#059669;color:#ffffff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;display:inline-block;">Track Your Shipment</a>
    </div>
  `);

  const text = baseTextTemplate(`
Shipment Status Update

Dear ${customerName},

Your shipment status has been updated.

Shipment ID: ${shipmentId}
Tracking Number: ${trackingNumber}
New Status: ${statusLabel}
Location: ${location}

We will continue to keep you informed about your shipment's progress. Thank you for choosing ARWA LOGISTICS.
  `);

  await sendEmail(
    { to: customerEmail, subject: `Status Update: ${statusLabel} - ${shipmentId}`, html, text },
    'STATUS_UPDATE',
    'Shipment',
    shipmentId
  );
}

export async function sendShipmentDeliveredEmail(
  customerEmail: string,
  customerName: string,
  shipmentId: string,
  trackingNumber: string
): Promise<void> {
  const html = baseEmailTemplate(`
    <h2 style="margin:0 0 16px;color:#1e293b;font-size:20px;">🎉 Shipment Delivered!</h2>
    <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.6;">
      Dear ${customerName},
    </p>
    <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.6;">
      Great news! Your shipment has been successfully delivered.
    </p>
    <div style="background:#f0fdf4;border:2px solid #059669;border-radius:8px;padding:20px;margin:16px 0;text-align:center;">
      <div style="font-size:32px;margin-bottom:8px;">✅</div>
      <div style="font-size:18px;font-weight:700;color:#059669;margin-bottom:4px;">DELIVERED</div>
      <div style="font-size:14px;color:#475569;">Your shipment has arrived at its destination</div>
    </div>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin:16px 0;">
      <table style="width:100%;font-size:14px;color:#334155;">
        <tr>
          <td style="padding:6px 0;font-weight:600;color:#64748b;">Shipment ID:</td>
          <td style="padding:6px 0;">${shipmentId}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-weight:600;color:#64748b;">Tracking Number:</td>
          <td style="padding:6px 0;font-weight:700;color:#059669;">${trackingNumber}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-weight:600;color:#64748b;">Delivered On:</td>
          <td style="padding:6px 0;">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
        </tr>
      </table>
    </div>
    <p style="margin:16px 0 0;color:#475569;font-size:14px;line-height:1.6;">
      Thank you for choosing ARWA LOGISTICS for your shipping needs. We hope to serve you again soon!
    </p>
    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:16px;margin:16px 0;">
      <p style="margin:0;color:#92400e;font-size:13px;">
        <strong>📋 Feedback:</strong> We value your opinion! If you have any feedback about your shipping experience, please don't hesitate to contact us.
      </p>
    </div>
  `);

  const text = baseTextTemplate(`
Shipment Delivered!

Dear ${customerName},

Great news! Your shipment has been successfully delivered.

Shipment ID: ${shipmentId}
Tracking Number: ${trackingNumber}
Delivered On: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}

Thank you for choosing ARWA LOGISTICS for your shipping needs. We hope to serve you again soon!
  `);

  await sendEmail(
    { to: customerEmail, subject: `Shipment Delivered! - ${shipmentId}`, html, text },
    'DELIVERED',
    'Shipment',
    shipmentId
  );
}

export async function sendWelcomeEmail(
  customerEmail: string,
  customerName: string
): Promise<void> {
  const html = baseEmailTemplate(`
    <h2 style="margin:0 0 16px;color:#1e293b;font-size:20px;">Welcome to ARWA LOGISTICS!</h2>
    <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.6;">
      Dear ${customerName},
    </p>
    <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.6;">
      Welcome to ARWA LOGISTICS — your trusted partner for global shipping from China to the world. We're excited to have you on board!
    </p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin:16px 0;">
      <h3 style="margin:0 0 12px;color:#065f46;font-size:16px;">What you can do with ARWA:</h3>
      <ul style="margin:0;padding-left:20px;color:#334155;font-size:14px;line-height:2;">
        <li><strong>Create Shipments</strong> — Book air, sea, or land shipments in minutes</li>
        <li><strong>Track in Real-Time</strong> — Monitor your shipments with live status updates</li>
        <li><strong>Manage Documents</strong> — Access invoices, labels, and shipping documents</li>
        <li><strong>Calculate Rates</strong> — Get instant pricing for any route</li>
        <li><strong>24/7 Support</strong> — Our team is always here to help</li>
      </ul>
    </div>
    <div style="text-align:center;margin:24px 0 0;">
      <a href="#" style="background:#059669;color:#ffffff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;display:inline-block;">Get Started — Create Your First Shipment</a>
    </div>
    <p style="margin:24px 0 0;color:#64748b;font-size:13px;line-height:1.6;">
      If you have any questions, our support team is here to help. Just reply to this email or contact us through our platform.
    </p>
  `);

  const text = baseTextTemplate(`
Welcome to ARWA LOGISTICS!

Dear ${customerName},

Welcome to ARWA LOGISTICS — your trusted partner for global shipping from China to the world. We're excited to have you on board!

What you can do with ARWA:
- Create Shipments — Book air, sea, or land shipments in minutes
- Track in Real-Time — Monitor your shipments with live status updates
- Manage Documents — Access invoices, labels, and shipping documents
- Calculate Rates — Get instant pricing for any route
- 24/7 Support — Our team is always here to help

If you have any questions, our support team is here to help.
  `);

  await sendEmail(
    { to: customerEmail, subject: 'Welcome to ARWA LOGISTICS!', html, text },
    'WELCOME',
    'User'
  );
}

export async function sendPasswordChangeEmail(
  customerEmail: string,
  customerName: string
): Promise<void> {
  const html = baseEmailTemplate(`
    <h2 style="margin:0 0 16px;color:#1e293b;font-size:20px;">Password Changed Successfully</h2>
    <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.6;">
      Dear ${customerName},
    </p>
    <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.6;">
      Your ARWA LOGISTICS account password has been successfully changed.
    </p>
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:16px 0;">
      <p style="margin:0;color:#991b1b;font-size:13px;line-height:1.6;">
        <strong>⚠️ Security Notice:</strong> If you did not make this change, please contact our support team immediately and change your password again. Your account security is our top priority.
      </p>
    </div>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin:16px 0;">
      <h3 style="margin:0 0 12px;color:#334155;font-size:14px;">Security Tips:</h3>
      <ul style="margin:0;padding-left:20px;color:#475569;font-size:13px;line-height:2;">
        <li>Use a strong, unique password</li>
        <li>Never share your password with anyone</li>
        <li>Enable two-factor authentication if available</li>
        <li>Check your account activity regularly</li>
      </ul>
    </div>
    <p style="margin:16px 0 0;color:#475569;font-size:14px;line-height:1.6;">
      If you made this change, no further action is required. Thank you for keeping your account secure.
    </p>
  `);

  const text = baseTextTemplate(`
Password Changed Successfully

Dear ${customerName},

Your ARWA LOGISTICS account password has been successfully changed.

SECURITY NOTICE: If you did not make this change, please contact our support team immediately and change your password again.

Security Tips:
- Use a strong, unique password
- Never share your password with anyone
- Enable two-factor authentication if available
- Check your account activity regularly

If you made this change, no further action is required. Thank you for keeping your account secure.
  `);

  await sendEmail(
    { to: customerEmail, subject: 'Password Changed - ARWA LOGISTICS', html, text },
    'PASSWORD_CHANGE',
    'User'
  );
}

export async function sendInvoiceEmail(
  customerEmail: string,
  customerName: string,
  shipmentId: string,
  invoiceNumber: string,
  amount: string
): Promise<void> {
  const html = baseEmailTemplate(`
    <h2 style="margin:0 0 16px;color:#1e293b;font-size:20px;">Invoice Ready</h2>
    <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.6;">
      Dear ${customerName},
    </p>
    <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.6;">
      Your invoice for shipment <strong>${shipmentId}</strong> is now ready. Please review the details below:
    </p>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin:16px 0;">
      <table style="width:100%;font-size:14px;color:#334155;">
        <tr>
          <td style="padding:6px 0;font-weight:600;color:#64748b;">Invoice Number:</td>
          <td style="padding:6px 0;font-weight:700;">${invoiceNumber}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-weight:600;color:#64748b;">Shipment ID:</td>
          <td style="padding:6px 0;">${shipmentId}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-weight:600;color:#64748b;">Total Amount:</td>
          <td style="padding:6px 0;font-weight:700;font-size:18px;color:#059669;">${amount}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-weight:600;color:#64748b;">Issue Date:</td>
          <td style="padding:6px 0;">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
        </tr>
      </table>
    </div>
    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:16px;margin:16px 0;">
      <p style="margin:0;color:#92400e;font-size:13px;line-height:1.6;">
        <strong>💳 Payment Terms:</strong> Payment is due within 30 days of the invoice date. Please include the invoice number in your payment reference.
      </p>
    </div>
    <div style="text-align:center;margin:24px 0 0;">
      <a href="#" style="background:#059669;color:#ffffff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;display:inline-block;">View Full Invoice</a>
    </div>
  `);

  const text = baseTextTemplate(`
Invoice Ready

Dear ${customerName},

Your invoice for shipment ${shipmentId} is now ready.

Invoice Number: ${invoiceNumber}
Shipment ID: ${shipmentId}
Total Amount: ${amount}
Issue Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}

Payment Terms: Payment is due within 30 days of the invoice date. Please include the invoice number in your payment reference.
  `);

  await sendEmail(
    { to: customerEmail, subject: `Invoice ${invoiceNumber} - ${shipmentId}`, html, text },
    'INVOICE',
    'Shipment',
    shipmentId
  );
}

// ─── HELPER: Send status-based email ────────────────────

/**
 * Sends the appropriate email based on the shipment status change.
 * This is non-blocking — errors are caught and logged but do not affect the main flow.
 */
export function sendShipmentStatusEmail(
  customerEmail: string,
  customerName: string,
  shipmentId: string,
  trackingNumber: string,
  newStatus: string,
  location: string
): void {
  // Non-blocking: fire and forget with .catch()
  if (newStatus === 'DELIVERED') {
    sendShipmentDeliveredEmail(customerEmail, customerName, shipmentId, trackingNumber).catch((err) => {
      console.error('[EMAIL] Non-blocking error in sendShipmentDeliveredEmail:', err.message);
    });
  } else {
    sendStatusUpdateEmail(customerEmail, customerName, shipmentId, trackingNumber, newStatus, location).catch((err) => {
      console.error('[EMAIL] Non-blocking error in sendStatusUpdateEmail:', err.message);
    });
  }
}
