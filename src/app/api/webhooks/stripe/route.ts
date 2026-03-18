import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { markSpecimensAsSold } from "@/lib/google-sheets";

export async function POST(request: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Missing signature or webhook secret" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const specimenIds = session.metadata?.specimen_ids
        ? session.metadata.specimen_ids.split(",").map((id) => id.trim()).filter(Boolean)
        : [];

      const orderDetails = {
        stripeSessionId: session.id,
        amountTotal: session.amount_total ? (session.amount_total / 100).toFixed(2) : "0.00",
        currency: session.currency?.toUpperCase() ?? "USD",
        customerEmail: session.customer_details?.email ?? "unknown",
        customerName: session.customer_details?.name ?? "unknown",
        shippingCost: session.shipping_cost?.amount_total
          ? (session.shipping_cost.amount_total / 100).toFixed(2)
          : null,
        specimenIds,
        paymentStatus: session.payment_status,
      };

      console.log("[stripe-webhook] ORDER COMPLETED:", JSON.stringify(orderDetails, null, 2));

      // Mark sold in Google Sheets
      if (specimenIds.length > 0) {
        try {
          await markSpecimensAsSold(specimenIds);
        } catch (err) {
          // Log but don't fail the webhook — Stripe will retry on 5xx, not needed here
          console.error("[stripe-webhook] Failed to mark specimens as sold:", err);
        }
      } else {
        console.warn("[stripe-webhook] checkout.session.completed had no specimen_ids in metadata", {
          sessionId: session.id,
        });
      }

      // TODO: wire up transactional email when provider is chosen (Resend recommended)
      // Required data is in `orderDetails` above. Send:
      //   - Customer confirmation to orderDetails.customerEmail
      //   - Internal order notification to borussiaminerals@gmail.com
      break;
    }

    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log("[stripe-webhook] Session expired — no action needed:", session.id);
      break;
    }

    case "payment_intent.payment_failed": {
      const intent = event.data.object as Stripe.PaymentIntent;
      console.warn("[stripe-webhook] Payment failed:", {
        intentId: intent.id,
        lastError: intent.last_payment_error?.message,
      });
      break;
    }

    default:
      console.log(`[stripe-webhook] Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
