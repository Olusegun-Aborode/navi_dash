/**
 * Price fetching: DefiLlama primary, CoinGecko fallback.
 */

const DEFILLAMA_IDS: Record<string, string> = {
  SUI: 'coingecko:sui',
  USDC: 'coingecko:usd-coin',
  USDT: 'coingecko:tether',
  WETH: 'coingecko:weth',
  CETUS: 'coingecko:cetus-protocol',
  vSUI: 'coingecko:volo-staked-sui',
  NAVX: 'coingecko:navi-protocol',
  haSUI: 'coingecko:haedal-staked-sui',
};

const COINGECKO_IDS: Record<string, string> = {
  SUI: 'sui',
  USDC: 'usd-coin',
  USDT: 'tether',
  WETH: 'weth',
  CETUS: 'cetus-protocol',
  vSUI: 'volo-staked-sui',
  NAVX: 'navi-protocol',
  haSUI: 'haedal-staked-sui',
};

export async function fetchPrices(): Promise<Record<string, number>> {
  // Try DefiLlama first
  try {
    const ids = Object.values(DEFILLAMA_IDS).join(',');
    const res = await fetch(
      `https://coins.llama.fi/prices/current/${ids}`,
      { next: { revalidate: 300 } }
    );
    if (res.ok) {
      const data = await res.json();
      const prices: Record<string, number> = {};
      for (const [symbol, llamaId] of Object.entries(DEFILLAMA_IDS)) {
        const coin = data.coins?.[llamaId];
        if (coin?.price) prices[symbol] = coin.price;
      }
      if (Object.keys(prices).length >= 4) return prices;
    }
  } catch {
    // fall through to CoinGecko
  }

  // Fallback: CoinGecko
  try {
    const ids = Object.values(COINGECKO_IDS).join(',');
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`,
      { next: { revalidate: 300 } }
    );
    if (res.ok) {
      const data = await res.json();
      const prices: Record<string, number> = {};
      for (const [symbol, geckoId] of Object.entries(COINGECKO_IDS)) {
        if (data[geckoId]?.usd) prices[symbol] = data[geckoId].usd;
      }
      return prices;
    }
  } catch {
    // return empty
  }

  return {};
}

/** Fetch single asset price */
export async function fetchPrice(symbol: string): Promise<number | null> {
  const prices = await fetchPrices();
  return prices[symbol] ?? null;
}
