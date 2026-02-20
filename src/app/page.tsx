import Link from 'next/link';
import { listProtocols } from '@/protocols/registry';
import { BarChart3, ArrowRight } from 'lucide-react';

export default function Home() {
  const protocols = listProtocols();

  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600">
          <BarChart3 className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-white">Datum Labs</h1>
        <p className="mt-2 text-zinc-400">
          DeFi Analytics Dashboards — real-time risk monitoring and market intelligence
        </p>
      </div>

      <div className="mx-auto max-w-2xl">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-zinc-500">
          Protocols
        </h2>
        <div className="grid gap-4">
          {protocols.map((p) => (
            <Link
              key={p.slug}
              href={`/${p.slug}/overview`}
              className="group flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 transition-all hover:border-zinc-700 hover:bg-zinc-800/50"
            >
              <div className="flex items-center gap-4">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-xl text-lg font-bold text-white"
                  style={{ backgroundColor: p.color }}
                >
                  {p.shortName.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{p.name}</h3>
                  <p className="text-sm text-zinc-400">
                    {p.chain.toUpperCase()} &middot; {p.type.charAt(0).toUpperCase() + p.type.slice(1)}
                  </p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-zinc-600 transition-colors group-hover:text-white" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
