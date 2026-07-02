// Example 02 - Get one event, with its visible ticket tiers
//
// Endpoint : GET /api/v1/events/{slug}
// Scope    : plugin:read
// Spec     : operationId `getEventBySlug`
//            https://github.com/TicketWaveHQ/openapi-spec/blob/main/openapi.yaml
//
// Returns the same event projection as the list route plus a `tiers` array
// of the visible ticket tiers (name, price, currency, quantity). A missing or
// cross-tenant slug returns 404 by design (anti-enumeration).
//
// Run:
//   export TICKETWAVE_API_KEY=tw_live_xxxxxxxxxxxxxxxx
//   EVENT_SLUG=summer-jam-2026 node examples/02-get-event-with-tiers/index.mjs

import { createClient } from "../_shared/client.mjs";

const slug = process.env.EVENT_SLUG;
if (!slug) {
  console.error("Set EVENT_SLUG. Run example 01 first to find a slug.");
  process.exit(1);
}

const tw = createClient();

const event = await tw.get(`/api/v1/events/${encodeURIComponent(slug)}`);

console.log(`${event.title}  [${event.status}]`);
console.log(`${event.date}${event.startTime ? " " + event.startTime : ""}`);
console.log(event.isVirtual ? "Online event" : `${event.venue.name}, ${event.venue.city}`);

if (event.capacity != null) console.log(`Capacity: ${event.capacity}`);

console.log("\nTicket tiers:");
if (!event.tiers.length) {
  console.log("  (no visible tiers)");
} else {
  for (const tier of event.tiers) {
    // `price` is a number in the tier's `currency` (ISO 4217, e.g. GBP).
    const price = new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: tier.currency,
    }).format(tier.price);
    console.log(`  - ${tier.name}: ${price}  (${tier.quantity} available)`);
  }
}
