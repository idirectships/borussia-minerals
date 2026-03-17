import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { fetchSpecimenById } from "@/lib/google-sheets";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const PRICE_THRESHOLD = 5000;

// Shipping rates for fragile, high-value mineral specimens
// Includes: double-boxing, custom foam cradle, full insurance
const SHIPPING_OPTIONS: Stripe.Checkout.SessionCreateParams.ShippingOption[] = [
  {
    shipping_rate_data: {
      type: "fixed_amount",
      fixed_amount: { amount: 4500, currency: "usd" },
      display_name: "Domestic Standard",
      delivery_estimate: {
        minimum: { unit: "business_day", value: 3 },
        maximum: { unit: "business_day", value: 5 },
      },
    },
  },
  {
    shipping_rate_data: {
      type: "fixed_amount",
      fixed_amount: { amount: 7500, currency: "usd" },
      display_name: "Domestic Priority",
      delivery_estimate: {
        minimum: { unit: "business_day", value: 1 },
        maximum: { unit: "business_day", value: 2 },
      },
    },
  },
  {
    shipping_rate_data: {
      type: "fixed_amount",
      fixed_amount: { amount: 12500, currency: "usd" },
      display_name: "International Insured",
      delivery_estimate: {
        minimum: { unit: "business_day", value: 5 },
        maximum: { unit: "business_day", value: 10 },
      },
    },
  },
  {
    shipping_rate_data: {
      type: "fixed_amount",
      fixed_amount: { amount: 0, currency: "usd" },
      display_name: "Local Pickup — Arizona",
      delivery_estimate: {
        minimum: { unit: "business_day", value: 1 },
        maximum: { unit: "business_day", value: 7 },
      },
    },
  },
];

export async function POST(request: NextRequest) {
  try {
    const { items } = await request.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "No items provided" }, { status: 400 });
    }

    // Validate each item against the actual inventory
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

    for (const item of items) {
      const specimen = await fetchSpecimenById(item.specimenId);

      if (!specimen) {
        return NextResponse.json(
          { error: `Specimen ${item.specimenId} not found` },
          { status: 400 }
        );
      }

      if (specimen.availability !== "available") {
        return NextResponse.json(
          { error: `${specimen.name} is no longer available` },
          { status: 400 }
        );
      }

      if (!specimen.price || specimen.price >= PRICE_THRESHOLD) {
        return NextResponse.json(
          { error: `${specimen.name} requires a direct inquiry` },
          { status: 400 }
        );
      }

      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: specimen.name,
            description: `${specimen.locality} — ${specimen.dimensions}`,
            images: specimen.image.startsWith("http")
              ? [specimen.image]
              : [`${request.nextUrl.origin}${specimen.image}`],
            metadata: {
              specimen_id: specimen.id,
            },
          },
          unit_amount: Math.round(specimen.price * 100),
        },
        quantity: 1,
      });
    }

    const origin = request.nextUrl.origin;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      shipping_options: SHIPPING_OPTIONS,
      shipping_address_collection: {
        allowed_countries: [
          "US", "CA", "MX",
          "GB", "DE", "FR", "IT", "ES", "NL", "BE", "AT", "CH",
          "AU", "NZ", "JP", "KR", "SG",
        ],
      },
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout/cancel`,
      metadata: {
        specimen_ids: items.map((i: { specimenId: string }) => i.specimenId).join(","),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Checkout session error:", err);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
