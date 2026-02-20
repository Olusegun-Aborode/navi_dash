/**
 * Shared helpers for protocol-aware routes and pages.
 */

import { getProtocol, getProtocolConfig } from './registry';
import type { ProtocolConfig, ProtocolAdapter } from './types';

/**
 * Resolve protocol slug from route params.
 * Returns { config, adapter } or null if invalid.
 */
export function resolveProtocol(slug: string): {
  config: ProtocolConfig;
  adapter: ProtocolAdapter;
} | null {
  const entry = getProtocol(slug);
  if (!entry) return null;
  return { config: entry.config, adapter: entry.adapter };
}

/**
 * Get asset symbols for a protocol (used by charts, aggregation, etc.)
 */
export function getProtocolSymbols(slug: string): string[] {
  const config = getProtocolConfig(slug);
  if (!config) return [];
  return config.assets.map((a) => a.symbol);
}

/**
 * Get asset color map for a protocol (used by charts)
 */
export function getProtocolAssetColors(slug: string): Record<string, string> {
  const config = getProtocolConfig(slug);
  if (!config) return {};
  return Object.fromEntries(config.assets.map((a) => [a.symbol, a.color]));
}
