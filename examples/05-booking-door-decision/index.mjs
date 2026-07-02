// Example 05 - Bookings and door entry, decided and overridable
//
// A booking that grants entry (a ticket, a table reservation, a room hold) is
// enforced at the door by the same access engine. A scanner asks the engine to
// decide, the verdict is logged, and a supervisor can override a wrong call
// after the fact. This example runs the full loop:
//
//   1. register a `door` resource,
//   2. decide entry for an actor holding a booking,
//   3. if the verdict is DENY, a supervisor overrides it to ALLOW,
//      which writes a fresh log row (the original decision is never mutated).
//
// Endpoints:
//   POST /api/v2/resources          operationId createAccessResource (plugin:write)
//   POST /api/v2/access/decide      operationId decideAccess          (plugin:read)
//   POST /api/v2/access/overrides   operationId createOverride        (plugin:write)
// Spec: https://github.com/TicketWaveHQ/openapi-spec/blob/main/openapi.yaml
//
// Run:
//   export TICKETWAVE_API_KEY=tw_live_xxxxxxxxxxxxxxxx
//   ACTOR_ID=<uuid-of-the-booking-holder> node examples/05-booking-door-decision/index.mjs

import { createClient } from "../_shared/client.mjs";

const tw = createClient();

const actorId = process.env.ACTOR_ID;
if (!actorId) {
  console.error("Set ACTOR_ID to the uuid of the booking holder (an actor identity claim).");
  process.exit(1);
}

// 1) The physical door / entry point as a governed resource.
const door = await tw.post("/api/v2/resources", {
  kind: "door",
  externalId: "venue:main-entrance",
  displayName: "Main entrance",
  attributes: { opensAt: "18:00", capacity: 400 },
});

console.log(`Door resource: ${door.id}  (${door.kind}:${door.externalId})`);

// 2) Scanner decision at the door. A real scanner passes its own timestamp.
const decision = await tw.post("/api/v2/access/decide", {
  actorId,
  resourceId: door.id,
  trustMode: "strict",
  context: {
    requestId: `scan-${Date.now()}`,
    now: new Date().toISOString(),
    extras: { gate: "A", scannerId: "handheld-07" },
  },
});

console.log(`\nEntry decision: ${decision.decision.toUpperCase()} - ${decision.reason}`);
console.log(`Log id: ${decision.logId}`);

// 3) If entry was denied but a supervisor confirms the booking is valid, they
//    override. The override records the flipped verdict as a NEW log row and
//    leaves the original decision intact for the audit trail.
if (decision.decision === "deny") {
  const override = await tw.post("/api/v2/access/overrides", {
    accessLogId: decision.logId,
    decision: "allow",
    reason: "Supervisor confirmed valid booking at box office",
  });
  console.log(`\nOverride applied. New log id: ${override.log?.id ?? override.logId ?? "(see response)"}`);
  console.log("Original DENY decision preserved; a fresh ALLOW row was written.");
} else if (decision.decision === "allow") {
  console.log("\n-> Open the gate. Booking honoured.");
} else {
  console.log("\n-> Route to staff (challenge/defer). Do not open the gate automatically.");
}
