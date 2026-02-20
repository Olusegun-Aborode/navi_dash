/**
 * One-time import of DefiLlama TVL history for NAVI Protocol.
 *
 * Usage: npx tsx scripts/backfill-defillama.ts
 *
 * Requires: DATABASE_URL
 */

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }

  const { PrismaClient } = await import('@prisma/client');
  const db = new PrismaClient();

  console.log('Fetching NAVI Protocol TVL from DefiLlama...');

  const res = await fetch('https://api.llama.fi/protocol/navi-protocol');
  if (!res.ok) {
    console.error(`DefiLlama API returned ${res.status}`);
    process.exit(1);
  }

  const data = await res.json();
  const tvlHistory: Array<{ date: number; totalLiquidityUSD: number }> = data.tvl ?? [];

  console.log(`Found ${tvlHistory.length} daily TVL data points`);

  let inserted = 0;
  for (const entry of tvlHistory) {
    const date = new Date(entry.date * 1000);
    date.setHours(0, 0, 0, 0);

    try {
      await db.defillamaTvl.upsert({
        where: { date },
        create: { date, tvlUsd: entry.totalLiquidityUSD },
        update: { tvlUsd: entry.totalLiquidityUSD },
      });
      inserted++;
    } catch {
      // skip
    }
  }

  console.log(`Done! Inserted/updated ${inserted} TVL records`);
  await db.$disconnect();
}

main().catch(console.error);
