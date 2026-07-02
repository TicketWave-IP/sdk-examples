// Example 01 - List events
//
// Endpoint : GET /api/v1/events
// Scope    : plugin:read
// Spec     : operationId `listEvents`
//            https://github.com/TicketWaveHQ/openapi-spec/blob/main/openapi.yaml
//
// Reads a page of the authenticated tenant's events. Pagination is
// offset-based (page / pageSize). Every row returned belongs to your own
// tenant; cross-tenant probes resolve to 404, never 403.
//
// Run:
//   export TICKETWAVE_API_KEY=tw_live_xxxxxxxxxxxxxxxx
//   node examples/01-list-events/index.mjs

import { createClient, qs } from "../_shared/client.mjs";

const tw = createClient();

// `status` accepts: published | draft | cancelled | completed
const page = await tw.get(`/api/v1/events${qs({ status: "published", page: 1, pageSize: 5 })}`);

console.log(`Fetched ${page.data.length} event(s) of ${page.pagination.total ?? "?"} total.\n`);

for (const event of page.data) {
  const when = [event.date, event.startTime].filter(Boolean).join(" ");
  const where = event.isVirtual ? "Online" : `${event.venue.name}, ${event.venue.city}`;
  console.log(`- ${event.title}`);
  console.log(`    slug:  ${event.slug}`);
  console.log(`    when:  ${when}`);
  console.log(`    where: ${where}`);
  console.log(`    state: ${event.status}\n`);
}

// Grab the first slug for the next example to consume.
if (page.data[0]) {
  console.log(`Try example 02 with:  EVENT_SLUG=${page.data[0].slug} node examples/02-get-event-with-tiers/index.mjs`);
}
