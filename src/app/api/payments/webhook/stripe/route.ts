import { NextResponse } from 'next/server';
import { constructWebhookEvent } from '@/lib/payments';
import { db } from '@/lib/db';
import { apiLogger } from '@/lib/logger';

// Disable body parsing for webhook signature verification
export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: 'Webhook not configured' },
      { status: 503 }
    );
  }

  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');
    
    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    const event = constructWebhookEvent(body, signature);

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as any;
        const transactionRef = paymentIntent.id;
        
        // Update payment status
        const payment = await db.payment.findFirst({
          where: { transactionRef },
        });
        
        if (payment) {
          await db.payment.update({
            where: { id: payment.id },
            data: {
              status: 'COMPLETED',
              paidAt: new Date(),
              cardLast4: paymentIntent.charges?.data?.[0]?.payment_method_details?.card?.last4 || null,
            },
          });
          apiLogger.info('Payment completed via Stripe webhook', { paymentId: payment.id, transactionRef });
        }
        break;
      }
      
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as any;
        const transactionRef = paymentIntent.id;
        
        const payment = await db.payment.findFirst({
          where: { transactionRef },
        });
        
        if (payment) {
          await db.payment.update({
            where: { id: payment.id },
            data: { status: 'FAILED' },
          });
          apiLogger.warn('Payment failed via Stripe webhook', { paymentId: payment.id, transactionRef });
        }
        break;
      }
      
      case 'charge.refunded': {
        const charge = event.data.object as any;
        const transactionRef = charge.payment_intent;
        
        if (transactionRef) {
          const payment = await db.payment.findFirst({
            where: { transactionRef: typeof transactionRef === 'string' ? transactionRef : transactionRef.toString() },
          });
          
          if (payment) {
            await db.payment.update({
              where: { id: payment.id },
              data: { status: 'REFUNDED', refundedAt: new Date() },
            });
          }
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    apiLogger.error('Stripe webhook error', { error: error.message });
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
