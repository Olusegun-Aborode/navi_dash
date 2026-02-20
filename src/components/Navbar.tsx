'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { BarChart3, Coins, Wallet, AlertTriangle } from 'lucide-react';
import ProtocolSwitcher from './ProtocolSwitcher';
import { listProtocols } from '@/protocols/registry';

const ALL_NAV_ITEMS = [
  { key: 'overview', label: 'Overview', icon: BarChart3 },
  { key: 'markets', label: 'Markets', icon: Coins },
  { key: 'wallets', label: 'Wallets', icon: Wallet },
  { key: 'liquidation', label: 'Liquidation', icon: AlertTriangle },
];

export default function Navbar() {
  const pathname = usePathname();
  const protocols = listProtocols();

  // Extract current protocol slug from URL: /navi/overview → "navi"
  const segments = pathname.split('/').filter(Boolean);
  const currentSlug = segments[0] ?? '';
  const currentProtocol = protocols.find((p) => p.slug === currentSlug);

  // Landing page — minimal nav
  if (!currentProtocol) {
    return (
      <nav className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
              D
            </div>
            <span className="text-lg font-semibold text-white">
              Datum <span className="text-zinc-400 font-normal">Labs</span>
            </span>
          </Link>
        </div>
      </nav>
    );
  }

  // Filter nav items based on protocol pages config
  const navItems = ALL_NAV_ITEMS.filter((item) => {
    const pages = currentProtocol.pages as Record<string, boolean>;
    return pages[item.key] !== false;
  });

  const protocolOptions = protocols.map((p) => ({
    slug: p.slug,
    name: p.name,
    shortName: p.shortName,
    color: p.color,
  }));

  return (
    <nav className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Logo + Protocol name */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
              D
            </div>
          </Link>
          <Link href={`/${currentSlug}/overview`} className="flex items-center gap-2">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: currentProtocol.color }}
            />
            <span className="text-lg font-semibold text-white">
              {currentProtocol.shortName}{' '}
              <span className="text-zinc-400 font-normal">
                {currentProtocol.type === 'lending' ? 'Lending' : currentProtocol.type === 'dex' ? 'DEX' : 'Perps'}
              </span>
            </span>
          </Link>
        </div>

        {/* Nav links + Protocol Switcher */}
        <div className="flex items-center gap-1">
          {navItems.map(({ key, label, icon: Icon }) => {
            const href = `/${currentSlug}/${key}`;
            const isActive = pathname.startsWith(href);
            return (
              <Link
                key={key}
                href={href}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-white'
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}

          {protocols.length > 1 && (
            <div className="ml-2 border-l border-zinc-800 pl-2">
              <ProtocolSwitcher protocols={protocolOptions} currentSlug={currentSlug} />
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
