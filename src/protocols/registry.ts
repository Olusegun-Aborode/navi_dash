/**
 * Protocol Registry — maps slugs to their config + adapter.
 *
 * To add a new protocol:
 * 1. Create src/protocols/<slug>/config.ts
 * 2. Create src/protocols/<slug>/adapter.ts
 * 3. Import and register them below
 */

import type { ProtocolConfig, ProtocolEntry } from './types';
import naviConfig from './navi/config';
import naviAdapter from './navi/adapter';

// ─── Registry ───────────────────────────────────────────────────────────────

const PROTOCOLS: Record<string, ProtocolEntry> = {
  navi: { config: naviConfig, adapter: naviAdapter },
  // Future protocols:
  // suilend: { config: suilendConfig, adapter: suilendAdapter },
  // cetus:   { config: cetusConfig,   adapter: cetusAdapter },
};

export default PROTOCOLS;

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Get protocol entry by slug, or null if not found */
export function getProtocol(slug: string): ProtocolEntry | null {
  return PROTOCOLS[slug.toLowerCase()] ?? null;
}

/** Get just the config by slug */
export function getProtocolConfig(slug: string): ProtocolConfig | null {
  return PROTOCOLS[slug.toLowerCase()]?.config ?? null;
}

/** List all registered protocol configs (for landing page, switcher, etc.) */
export function listProtocols(): ProtocolConfig[] {
  return Object.values(PROTOCOLS).map((p) => p.config);
}

/** List all registered protocol slugs */
export function listProtocolSlugs(): string[] {
  return Object.keys(PROTOCOLS);
}

/** Check if a slug is a valid registered protocol */
export function isValidProtocol(slug: string): boolean {
  return slug.toLowerCase() in PROTOCOLS;
}
