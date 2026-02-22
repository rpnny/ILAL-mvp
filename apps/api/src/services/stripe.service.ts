/**
 * Stripe Payment Service
 * Handles Checkout Sessions and Webhook events
 *
 * Required env vars:
 *   STRIPE_SECRET_KEY      — sk_test_... or sk_live_...
 *   STRIPE_WEBHOOK_SECRET  — whsec_...  (from Stripe Dashboard > Webhooks)
 *   STRIPE_PRO_PRICE_ID    — price_...  (PRO monthly price)
 *   STRIPE_ENTERPRISE_PRICE_ID — price_... (optional)
 */

import Stripe from 'stripe';
import { billingService } from './billing.service.js';
import { sendPlanUpgradeEmail } from './email.service.js';
import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

// Price ID → Plan name mapping
const PRICE_TO_PLAN: Record<string, string> = {
    [process.env.STRIPE_PRO_PRICE_ID || 'price_pro']: 'PRO',
    [process.env.STRIPE_ENTERPRISE_PRICE_ID || 'price_enterprise']: 'ENTERPRISE',
};

// Plan name → Price ID mapping
const PLAN_TO_PRICE: Record<string, string> = {
    PRO: process.env.STRIPE_PRO_PRICE_ID || '',
    ENTERPRISE: process.env.STRIPE_ENTERPRISE_PRICE_ID || '',
};

function getStripe(): Stripe {
    if (!STRIPE_SECRET_KEY) {
        throw new Error('STRIPE_SECRET_KEY is not configured. Add it to your .env file.');
    }
    return new Stripe(STRIPE_SECRET_KEY);
}

/**
 * Create a Stripe Checkout Session for plan upgrade
 */
export async function createCheckoutSession(params: {
    userId: string;
    userEmail: string;
    targetPlan: 'PRO' | 'ENTERPRISE';
    successUrl: string;
    cancelUrl: string;
}): Promise<{ url: string }> {
    const stripe = getStripe();

    const priceId = PLAN_TO_PRICE[params.targetPlan];
    if (!priceId) {
        throw new Error(`No Stripe Price ID configured for plan: ${params.targetPlan}. Set STRIPE_${params.targetPlan}_PRICE_ID in .env`);
    }

    const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        customer_email: params.userEmail,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        metadata: {
            userId: params.userId,
            targetPlan: params.targetPlan,
        },
    });

    if (!session.url) {
        throw new Error('Stripe did not return a checkout URL');
    }

    logger.info('Stripe checkout session created', {
        sessionId: session.id,
        userId: params.userId,
        targetPlan: params.targetPlan,
    });

    return { url: session.url };
}

/**
 * Handle Stripe webhook event
 * Call this with the raw request body (Buffer) and the Stripe-Signature header
 */
export async function handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
    if (!STRIPE_WEBHOOK_SECRET) {
        throw new Error('STRIPE_WEBHOOK_SECRET is not configured.');
    }

    const stripe = getStripe();

    let event: Stripe.Event;
    try {
        event = stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET);
    } catch (err: any) {
        throw new Error(`Webhook signature verification failed: ${err.message}`);
    }

    logger.info('Stripe webhook received', { type: event.type, id: event.id });

    switch (event.type) {
        case 'checkout.session.completed': {
            const session = event.data.object as Stripe.Checkout.Session;
            const userId = session.metadata?.userId;
            const targetPlan = session.metadata?.targetPlan as string | undefined;

            if (!userId || !targetPlan) {
                logger.warn('Webhook missing metadata', { sessionId: session.id });
                return;
            }

            try {
                await billingService.upgradePlan(userId, targetPlan);
                logger.info('Plan upgraded via Stripe webhook', { userId, targetPlan });

                // Send upgrade notification email (non-blocking, optional)
                const user = await prisma.user.findUnique({ where: { id: userId } });
                if (user) {
                    sendPlanUpgradeEmail(user.email, targetPlan, user.name || undefined).catch(err =>
                        logger.warn('Failed to send upgrade email', { error: err.message })
                    );
                }
            } catch (err: any) {
                logger.error('Failed to upgrade plan after payment', { userId, targetPlan, error: err.message });
                throw err;
            }
            break;
        }

        case 'customer.subscription.deleted': {
            // Subscription cancelled — downgrade to FREE
            const subscription = event.data.object as Stripe.Subscription;
            const customerId = subscription.customer as string;

            // Find user by Stripe customer ID (stored in subscription record)
            const sub = await prisma.subscription.findFirst({
                where: { stripeCustomerId: customerId, status: 'ACTIVE' },
            });

            if (sub) {
                await prisma.$transaction([
                    prisma.user.update({ where: { id: sub.userId }, data: { plan: 'FREE' } }),
                    prisma.subscription.update({ where: { id: sub.id }, data: { status: 'CANCELLED' } }),
                ]);
                logger.info('Subscription cancelled, downgraded to FREE', { userId: sub.userId });
            }
            break;
        }

        default:
            logger.debug('Unhandled Stripe event', { type: event.type });
    }
}
