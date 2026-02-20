'use client';

import { cn } from '@/lib/utils';

interface TimeFilterProps {
  value: number;
  onChange: (days: number) => void;
  options?: number[];
}

export default function TimeFilter({
  value,
  onChange,
  options = [30, 90],
}: TimeFilterProps) {
  return (
    <div className="flex gap-1 rounded-lg border border-zinc-800 bg-zinc-900/50 p-1">
      {options.map((days) => (
        <button
          key={days}
          onClick={() => onChange(days)}
          className={cn(
            'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
            value === days
              ? 'bg-blue-600 text-white'
              : 'text-zinc-400 hover:text-white'
          )}
        >
          {days}d
        </button>
      ))}
    </div>
  );
}
