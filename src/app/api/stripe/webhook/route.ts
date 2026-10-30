// Stripe tells us here when a subscription starts, changes or ends. The signature proves the call
// comes from Stripe; an error answer makes Stripe try again later.

import type Stripe from "stripe";

import { idOf, stripe, syncSubscription } from "@/lib/stripe";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !signature) return new Response("Not configured", { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.mode === "subscription" && session.subscription) await syncSubscription(idOf(session.subscription));
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await syncSubscription(event.data.object.id);
        break;
    }
  } catch (error) {
    console.error("Stripe webhook failed", event.type, error);
    return new Response("Processing failed", { status: 500 });
  }

  return Response.json({ received: true });
}
