import nodemailer from 'nodemailer';
import { db } from './db';
import { apiLogger } from './logger';

export interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
}

function getSMTPConfig(): SMTPConfig | null {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null; // SMTP not configured
  }

  return {
    host,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    user,
    pass,
    fromName: process.env.SMTP_FROM_NAME || 'ARWA LOGISTICS',
    fromEmail: process.env.SMTP_FROM_EMAIL || user,
  };
}

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter;

  const config = getSMTPConfig();
  if (!config) return null;

  transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  return transporter;
}

export async function isSMTPConfigured(): Promise<boolean> {
  return getSMTPConfig() !== null;
}

export async function testSMTPConnection(): Promise<{ success: boolean; error?: string }> {
  const transport = getTransporter();
  if (!transport) {
    return { success: false, error: 'SMTP not configured' };
  }

  try {
    await transport.verify();
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function sendSMTPEmail(options: {
  to: string;
  subject: string;
  html: string;
  text: string;
  emailType: string;
  entityType?: string;
  entityId?: string;
}): Promise<{ success: boolean; error?: string }> {
  const config = getSMTPConfig();
  const transport = getTransporter();

  if (!config || !transport) {
    apiLogger.info('SMTP not configured, email logged to DB only', { to: options.to, type: options.emailType });
    return { success: false, error: 'SMTP not configured' };
  }

  // Log email to database first
  const emailLog = await db.emailLog.create({
    data: {
      to: options.to,
      subject: options.subject,
      htmlBody: options.html,
      textBody: options.text,
      emailType: options.emailType,
      entityType: options.entityType || null,
      entityId: options.entityId || null,
      status: 'PENDING',
    },
  });

  try {
    const result = await transport.sendMail({
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    // Update log as sent
    await db.emailLog.update({
      where: { id: emailLog.id },
      data: {
        status: 'SENT',
        sentAt: new Date(),
      },
    });

    apiLogger.info('Email sent successfully', { to: options.to, type: options.emailType, messageId: result.messageId });
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Update log as failed
    await db.emailLog.update({
      where: { id: emailLog.id },
      data: {
        status: 'FAILED',
        error: errorMessage,
      },
    });

    apiLogger.error('Failed to send email', { to: options.to, type: options.emailType, error: errorMessage });
    return { success: false, error: errorMessage };
  }
}

const smtpService = { isSMTPConfigured, testSMTPConnection, sendSMTPEmail };
export default smtpService;
