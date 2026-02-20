'use client';

import { POOL_SYMBOLS } from '@/lib/constants';

interface FilterBarProps {
  filters: Record<string, string>;
  onChange: (key: string, value: string) => void;
  fields: Array<{
    key: string;
    label: string;
    type: 'text' | 'select' | 'date';
    options?: string[];
    placeholder?: string;
  }>;
}

export default function FilterBar({ filters, onChange, fields }: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      {fields.map((field) => (
        <div key={field.key} className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-500">{field.label}</label>
          {field.type === 'select' ? (
            <select
              value={filters[field.key] ?? ''}
              onChange={(e) => onChange(field.key, e.target.value)}
              className="h-9 rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm text-white outline-none focus:border-blue-500"
            >
              <option value="">All</option>
              {(field.options ?? POOL_SYMBOLS).map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          ) : field.type === 'date' ? (
            <input
              type="date"
              value={filters[field.key] ?? ''}
              onChange={(e) => onChange(field.key, e.target.value)}
              className="h-9 rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm text-white outline-none focus:border-blue-500"
            />
          ) : (
            <input
              type="text"
              value={filters[field.key] ?? ''}
              onChange={(e) => onChange(field.key, e.target.value)}
              placeholder={field.placeholder ?? ''}
              className="h-9 w-44 rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm text-white placeholder-zinc-600 outline-none focus:border-blue-500"
            />
          )}
        </div>
      ))}
    </div>
  );
}
