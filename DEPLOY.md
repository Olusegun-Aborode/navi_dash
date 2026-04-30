# Deploy — navi-dashboard (multi-protocol Sui Lending backend)

## What changed in this branch

This deploy turns navi-dashboard into the **multi-protocol backend** powering the
Sui Lending dashboard. NAVI's behavior is unchanged; four new protocols
(Suilend, Scallop, AlphaLend, Bucket) and a new aggregator endpoint are added.

| Change | Effect |
|---|---|
| `@mysten/sui` 1.25 → 2.16 | Required by Suilend SDK; `userState.ts` migrated (`SuiClient` → `SuiJsonRpcClient`) |
| 4 new protocol adapters | `src/protocols/{suilend, scallop, alphalend, bucket}/` |
| 4 new SDKs added | `@suilend/sdk`, `@scallop-io/sui-scallop-sdk`, `@bucket-protocol/sdk` (AlphaLend uses raw GraphQL — no SDK) |
| Generic liquidation cron | `index-liquidations/route.ts` now delegates to `adapter.fetchLiquidations()` |
| Aggregator endpoint | `GET /api/sui-lending` returns the full SCHEMA shape consumed by the static dashboard |
| `vercel.json` | 9 new cron entries (3 per new protocol — collect-pools / index-liquidations / aggregate-daily) |
| Prisma schema | `varchar(10)` → `varchar(24)` on all symbol columns; `Bucket` PSM/Saving rows fit cleanly now |
| `RateModelParams` | Now populated by `collect-pools` for NAVI (34 rows) and AlphaLend (21 rows) |

## Pre-deploy checklist

### 1. Set new env vars on Vercel

| Var | Value | Required | Purpose |
|---|---|---|---|
| `BLOCKVISION_SUI_RPC` | `https://sui-mainnet.blockvision.org/v1/<your-key>` | **Yes** | Used by NAVI userState + Suilend adapter — replaces public Sui RPC, higher rate limit |
| `BLOCKVISION_SUI_GRPC_WEB` | `https://sui-mainnet-grpc-web.blockvision.org` | No | Optional gRPC endpoint for Bucket adapter; defaults to Sui's public gRPC |
| `SUI_GRAPHQL_URL` | `https://graphql.mainnet.sui.io/graphql` | No | AlphaLend's GraphQL host; default works fine |
| `SCALLOP_INDEXER_URL` | `https://sdk.api.scallop.io` | No | Scallop's hosted indexer; default works fine |

Existing env vars (`DATABASE_URL`, `CRON_SECRET`, `ALCHEMY_SUI_RPC`, etc.) stay
unchanged.

### 2. Database migration

```sh
npx prisma migrate deploy
```

This applies the `varchar(10) → varchar(24)` change to all symbol columns. The
schema change is backward-compatible (widening only).

### 3. Push and let Vercel auto-deploy

```sh
git add -A
git commit -m "Add Suilend / Scallop / AlphaLend / Bucket adapters + sui-lending aggregator endpoint"
git push origin main
```

Vercel picks up the push and redeploys. The new cron schedule activates on
the next 24h cycle (00:00–01:00 UTC window). To populate immediately, run
each cron manually after deploy:

```sh
PROD=https://<your-project>.vercel.app
for proto in navi suilend scallop alphalend bucket; do
  curl -H "Authorization: Bearer $CRON_SECRET" "$PROD/api/$proto/cron/collect-pools"
done
```

## Post-deploy verification

```sh
PROD=https://<your-project>.vercel.app

# 1. Health
curl "$PROD/api/health"

# 2. Aggregator (should return ~1.4 MB JSON, 5 protocols, 90+ pools)
curl -s "$PROD/api/sui-lending" | jq '{ protocols: (.protocols|length), pools: (.pools|length), liquidations: (.liquidations|length), generatedAt }'

# 3. CORS — should return Access-Control-Allow-Origin: *
curl -i -X OPTIONS -H "Origin: https://<static-dashboard-host>" "$PROD/api/sui-lending"

# 4. Per-protocol pool data (existing API routes — work for all 5 protocols now)
for proto in navi suilend scallop alphalend bucket; do
  echo "$proto:"
  curl -s "$PROD/api/$proto/pools" | jq '. | length'
done
```

## Known follow-ups (not blocking)

- **Liquidation event types for Scallop / AlphaLend / Bucket** — `tryFetchLiquidations`
  currently returns 0 events for these. Verify the actual on-chain event type
  strings via `scripts/discover-liq-events.mts` against the production RPC,
  update `*_EVENT_TYPES` in each `config.ts`.

- **IRM extraction for Suilend / Scallop / Bucket** — `RateModelParams` currently
  only populated for NAVI + AlphaLend. The other three have non-trivial IRM
  shapes (Suilend piecewise, Scallop two-kink, Bucket flat) — populate when
  you next iterate.

- **Bucket TVL coverage** — adapter captures CDP vaults + PSM + Saving (~$17M)
  but DefiLlama shows ~$61M. The remaining gap is likely V1 Bottle vaults and
  borrow-incentive pools. Add as needed.

- **NAVI stale snapshot** — last collected 2026-04-30 00:35 UTC. Will refresh
  on the next cron cycle automatically.
