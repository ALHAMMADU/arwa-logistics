import Stripe from 'stripe';
import { apiLogger } from '../logger';

let stripeInstance: Stripe | null = null;

function getStripe(): Stripe | null {
  if (stripeInstance) return stripeInstance;
  
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return null;
  
  stripeInstance = new Stripe(secretKey, {
    typescript: true,
  });
  
  return stripeInstance;
}

export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

export interface CreatePaymentIntentOptions {
  amount: number; // in USD
  shipmentId: string;
  customerId: string;
  description: string;
  metadata?: Record<string, string>;
}

export async function createPaymentIntent(options: CreatePaymentIntentOptions) {
  const stripe = getStripe();
  if (!stripe) throw new Error('Stripe is not configured');
  
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(options.amount * 100), // Convert to cents
      currency: 'usd',
      description: options.description,
      metadata: {
        shipmentId: options.shipmentId,
        customerId: options.customerId,
        ...options.metadata,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });
    
    apiLogger.info('Payment intent created', { 
      paymentIntentId: paymentIntent.id, 
      amount: options.amount,
      shipmentId: options.shipmentId 
    });
    
    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    };
  } catch (error) {
    apiLogger.error('Failed to create payment intent', { 
      error: error instanceof Error ? error.message : String(error),
      shipmentId: options.shipmentId 
    });
    throw error;
  }
}

export async function retrievePaymentIntent(paymentIntentId: string) {
  const stripe = getStripe();
  if (!stripe) throw new Error('Stripe is not configured');
  
  return stripe.paymentIntents.retrieve(paymentIntentId);
}

export function constructWebhookEvent(payload: string | Buffer, signature: string): Stripe.Event {
  const stripe = getStripe();
  if (!stripe) throw new Error('Stripe is not configured');
  
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
  
  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}

export async function createCustomer(name: string, email: string) {
  const stripe = getStripe();
  if (!stripe) throw new Error('Stripe is not configured');
  
  return stripe.customers.create({ name, email });
}

export async function refundPayment(paymentIntentId: string, amount?: number) {
  const stripe = getStripe();
  if (!stripe) throw new Error('Stripe is not configured');
  
  return stripe.refunds.create({
    payment_intent: paymentIntentId,
    amount: amount ? Math.round(amount * 100) : undefined,
  });
}
