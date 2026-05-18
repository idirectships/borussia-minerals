import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { markSpecimensAsSold } from "@/lib/google-sheets";
import * as airtable from "@/lib/airtable";

export async function POST(request: NextRequest) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    console.error("[stripe-webhook] STRIPE_SECRET_KEY not configured");
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }
  const stripe = new Stripe(secretKey);
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

      // ── Airtable: create Order row ────────────────────────────────────────────
      let airtableOrderId: string | undefined;
      try {
        const result = await airtable.createOrder(session);
        airtableOrderId = result.id;
        console.log("[stripe-webhook] Airtable order created:", airtableOrderId);
      } catch (err) {
        console.error("[stripe-webhook] Failed to create Airtable order:", err);
      }

      // ── Airtable: mark specimens as sold ─────────────────────────────────────
      if (specimenIds.length > 0) {
        // Google Sheets (existing dual-write — kept during migration window)
        try {
          await markSpecimensAsSold(specimenIds);
        } catch (err) {
          console.error("[stripe-webhook] Failed to mark specimens as sold in Sheets:", err);
        }

        // Airtable (Phase 5 side effect)
        try {
          await airtable.markSpecimensAsSold(specimenIds);
          console.log("[stripe-webhook] Airtable specimens marked sold:", specimenIds);
        } catch (err) {
          console.error("[stripe-webhook] Failed to mark specimens as sold in Airtable:", err);
        }

        // ── ISR revalidation ──────────────────────────────────────────────────
        const revalidateSecret = process.env.REVALIDATE_SECRET;
        if (revalidateSecret) {
          const baseUrl = process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

          const revalidatePaths = ["/store", ...specimenIds.map((id) => `/specimens/${id}`)];
          for (const path of revalidatePaths) {
            try {
              await fetch(
                `${baseUrl}/api/revalidate?secret=${revalidateSecret}&path=${encodeURIComponent(path)}`,
              );
            } catch (err) {
              console.error(`[stripe-webhook] ISR revalidation failed for ${path}:`, err);
            }
          }
        } else {
          console.warn("[stripe-webhook] REVALIDATE_SECRET not set — skipping ISR revalidation");
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
      void airtableOrderId; // suppress unused-variable warning; used in logs above
      break;
    }

    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      // Resolve the Stripe session ID from payment_intent if available
      const paymentIntentId = typeof charge.payment_intent === "string"
        ? charge.payment_intent
        : undefined;
      console.log("[stripe-webhook] Charge refunded:", charge.id, "PI:", paymentIntentId);

      // Look up order by payment_intent to find the session ID
      // The Order row was created with stripe_payment_intent populated by createOrder.
      // updateOrderStatus searches by stripe_session_id; if we only have the PI we
      // cannot resolve directly here without an extra lookup — log and leave for manual
      // reconciliation in Airtable. Director can also trigger via Airtable automation.
      //
      // If metadata on the charge carries a session ID, use it directly.
      const sessionId = charge.metadata?.stripe_session_id;
      if (sessionId) {
        try {
          await airtable.updateOrderStatus(sessionId, "refunded");
          console.log("[stripe-webhook] Airtable order marked refunded for session:", sessionId);
        } catch (err) {
          console.error("[stripe-webhook] Failed to update Airtable order status to refunded:", err);
        }
      } else {
        console.warn(
          "[stripe-webhook] charge.refunded: no stripe_session_id in metadata — " +
          "manual reconciliation required in Airtable. Charge:", charge.id,
        );
      }
      // Specimens are NOT automatically flipped back to available per spec line 224.
      // Director resolves per-case via Airtable UI.
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
