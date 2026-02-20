'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown } from 'lucide-react';

interface ProtocolOption {
  slug: string;
  name: string;
  shortName: string;
  color: string;
}

interface ProtocolSwitcherProps {
  protocols: ProtocolOption[];
  currentSlug: string;
}

export default function ProtocolSwitcher({ protocols, currentSlug }: ProtocolSwitcherProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const current = protocols.find((p) => p.slug === currentSlug);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Build equivalent path for another protocol
  function switchUrl(targetSlug: string): string {
    // Replace current protocol slug in the path
    const segments = pathname.split('/');
    if (segments.length >= 2) {
      segments[1] = targetSlug;
      return segments.join('/');
    }
    return `/${targetSlug}/overview`;
  }

  if (!current) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:border-zinc-600 hover:bg-zinc-800"
      >
        <span
          className="inline-block h-3 w-3 rounded-full"
          style={{ backgroundColor: current.color }}
        />
        {current.shortName}
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border border-zinc-700 bg-zinc-900 py-1 shadow-xl">
          {protocols.map((p) => (
            <Link
              key={p.slug}
              href={switchUrl(p.slug)}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                p.slug === currentSlug
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-white'
              }`}
            >
              <span
                className="inline-block h-3 w-3 rounded-full"
                style={{ backgroundColor: p.color }}
              />
              {p.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
