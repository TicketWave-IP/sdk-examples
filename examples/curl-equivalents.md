# curl equivalents

Every example in this repo is one or two plain HTTP calls. If you want to see
the wire traffic before writing any code, the same requests as curl are below.
Export your key first:

```bash
export TICKETWAVE_API_KEY=tw_live_xxxxxxxxxxxxxxxx
export TW=https://access.ticketwavehq.com
```

The dashboard host `https://ticketwavehq.com` hits the same deployment, so you
can swap `$TW` for it and get identical bytes.

## 01 - List events

```bash
curl -s "$TW/api/v1/events?status=published&page=1&pageSize=5" \
  -H "Authorization: Bearer $TICKETWAVE_API_KEY" | jq .
```

## 02 - Get one event with its ticket tiers

```bash
curl -s "$TW/api/v1/events/summer-jam-2026" \
  -H "Authorization: Bearer $TICKETWAVE_API_KEY" | jq .
```

A missing or cross-tenant slug returns `404` by design.

## 03 - List paid orders (buyers masked without plugin:pii)

```bash
curl -s "$TW/api/v1/orders?status=paid&pageSize=10" \
  -H "Authorization: Bearer $TICKETWAVE_API_KEY" | jq '.data[] | {orderNumber, total, currency}'
```

## 04 - Food ordering, gated by the access engine

Register the "place order" action as a resource, then decide:

```bash
RESOURCE_ID=$(curl -s -X POST "$TW/api/v2/resources" \
  -H "Authorization: Bearer $TICKETWAVE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"kind":"api_route","externalId":"food:place-order","displayName":"Place food order"}' \
  | jq -r '.id')

curl -s -X POST "$TW/api/v2/access/decide" \
  -H "Authorization: Bearer $TICKETWAVE_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"actorId\":\"$ACTOR_ID\",\"resourceId\":\"$RESOURCE_ID\",\"trustMode\":\"hybrid\"}" | jq .
```

## 05 - Booking / door entry, with an override

```bash
DOOR_ID=$(curl -s -X POST "$TW/api/v2/resources" \
  -H "Authorization: Bearer $TICKETWAVE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"kind":"door","externalId":"venue:main-entrance","displayName":"Main entrance"}' \
  | jq -r '.id')

LOG_ID=$(curl -s -X POST "$TW/api/v2/access/decide" \
  -H "Authorization: Bearer $TICKETWAVE_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"actorId\":\"$ACTOR_ID\",\"resourceId\":\"$DOOR_ID\",\"trustMode\":\"strict\"}" \
  | jq -r '.logId')

# Supervisor overrides a wrong DENY. The original log row is left untouched.
curl -s -X POST "$TW/api/v2/access/overrides" \
  -H "Authorization: Bearer $TICKETWAVE_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"accessLogId\":\"$LOG_ID\",\"decision\":\"allow\",\"reason\":\"Confirmed valid booking\"}" | jq .
```

Every field and enum used here is defined in
[`openapi.yaml`](https://github.com/TicketWaveHQ/openapi-spec/blob/main/openapi.yaml).
