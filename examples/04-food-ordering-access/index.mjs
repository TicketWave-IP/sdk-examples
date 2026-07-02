// Example 04 - Food ordering, gated by the access-decision engine
//
// TicketWave HQ is white-label commerce for events, food and bookings. Food
// ordering is not a separate API namespace: an ordering endpoint (for example
// "can this device place a kitchen order right now?") is modelled as a
// *resource* the v2 access engine governs, and each attempt is an ALLOW /
// DENY / REVIEW decision you can later replay, dispute, and override.
//
// This example:
//   1. registers a resource of kind `api_route` (the "place food order" action),
//   2. asks the engine to decide whether a device may use it.
//
// Endpoints:
//   POST /api/v2/resources        operationId createAccessResource  (scope plugin:write)
//   POST /api/v2/access/decide    operationId decideAccess           (scope plugin:read)
// Spec: https://github.com/TicketWaveHQ/openapi-spec/blob/main/openapi.yaml
//
// ResourceKind enum: event | ticket | door | api_route
// ActorKind enum:    user  | anonymous | service | device
//
// Run:
//   export TICKETWAVE_API_KEY=tw_live_xxxxxxxxxxxxxxxx
//   ACTOR_ID=<uuid-of-a-registered-device> node examples/04-food-ordering-access/index.mjs

import { createClient } from "../_shared/client.mjs";

const tw = createClient();

// An actor (here a `device`, such as a table tablet or a kiosk) must already
// exist as an identity claim. Pass its id in ACTOR_ID.
const actorId = process.env.ACTOR_ID;
if (!actorId) {
  console.error(
    "Set ACTOR_ID to the uuid of a registered actor (device/user).\n" +
      "Register actors via POST /api/v2/identity/claims (operationId createIdentityClaim).",
  );
  process.exit(1);
}

// 1) Register the "place food order" action as a governed resource.
//    `externalId` is your own stable identifier for the thing being gated.
const resource = await tw.post("/api/v2/resources", {
  kind: "api_route",
  externalId: "food:place-order",
  displayName: "Place food order",
  attributes: {
    // Arbitrary attributes your rules can read. These are illustrative.
    kitchenOpenFrom: "11:00",
    kitchenOpenUntil: "22:30",
    maxItemsPerOrder: 25,
  },
});

console.log(`Resource ready: ${resource.id}  (${resource.kind}:${resource.externalId})`);

// 2) Ask the engine whether this actor may place an order right now.
const decision = await tw.post("/api/v2/access/decide", {
  actorId,
  resourceId: resource.id,
  // `trustMode` is strict | flexible | hybrid (default strict).
  trustMode: "hybrid",
  context: {
    requestId: `food-${Date.now()}`,
    // Production callers SHOULD pass their own wall-clock for replay determinism.
    now: new Date().toISOString(),
    extras: { basketSize: 3, tableId: "T-12" },
  },
});

console.log(`\nDecision: ${decision.decision.toUpperCase()}`);
console.log(`Reason:   ${decision.reason}`);
console.log(`Log id:   ${decision.logId}  (replay via /api/v2/access/logs/${decision.logId}/replay)`);

// `decision.decision` is one of: allow | deny | defer | challenge
if (decision.decision === "allow") {
  console.log("\n-> Proceed to submit the food order to your kitchen system.");
} else if (decision.decision === "challenge") {
  console.log("\n-> Step up: prompt for staff PIN or a second factor, then re-decide.");
} else {
  console.log("\n-> Hold the order. Surface the reason to the customer or staff.");
}
