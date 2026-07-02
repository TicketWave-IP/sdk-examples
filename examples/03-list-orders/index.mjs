// Example 03 - List paid orders
//
// Endpoint : GET /api/v1/orders
// Scope    : plugin:read  (add plugin:pii to unmask buyer name + email)
// Spec     : operationId `listOrders`
//            https://github.com/TicketWaveHQ/openapi-spec/blob/main/openapi.yaml
//
// Reads a page of orders. Customer name and email are masked unless the key
// also carries the `plugin:pii` scope, so this example is safe to run with a
// read-only key and simply shows masked buyers.
//
// Supported filters: eventId, status, since, until (ISO 8601), page, pageSize.
// `status` is one of: pending | paid | deposit_paid | refunded |
//   partially_refunded | cancelled | disputed
//
// Run:
//   export TICKETWAVE_API_KEY=tw_live_xxxxxxxxxxxxxxxx
//   node examples/03-list-orders/index.mjs

import { createClient, qs } from "../_shared/client.mjs";

const tw = createClient();

// Last 30 days of paid orders.
const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

const page = await tw.get(`/api/v1/orders${qs({ status: "paid", since, page: 1, pageSize: 10 })}`);

console.log(`Paid orders in the last 30 days: ${page.data.length} shown of ${page.pagination.total ?? "?"}.\n`);

let sum = 0;
for (const order of page.data) {
  const total = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: order.currency,
  }).format(order.total);
  sum += order.total;

  // `customer` is masked unless the key holds plugin:pii.
  const buyer = order.customer?.name ?? "(masked)";
  console.log(`- ${order.orderNumber}  ${total}  ${order.event?.title ?? ""}  buyer: ${buyer}`);
}

if (page.data.length) {
  const gross = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: page.data[0].currency,
  }).format(sum);
  console.log(`\nGross on this page: ${gross}`);
}
