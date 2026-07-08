'use client';

import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/contexts/LanguageContext';

/** Full-page or full-section centered spinner with optional label */
export function PageLoader({ label, className }: { label?: string; className?: string }) {
  const { t } = useTranslation();
  const text = label ?? t('common.loading');
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-20 text-slate-400', className)}>
      <div className="relative">
        <div className="h-10 w-10 rounded-full border-2 border-slate-200" />
        <div className="absolute inset-0 h-10 w-10 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
      </div>
      <p className="text-sm font-medium">{text}</p>
    </div>
  );
}

/** Inline small spinner (replaces Loader2 pattern) */
export function Spinner({ size = 'sm', className }: { size?: 'xs' | 'sm' | 'md'; className?: string }) {
  const s = size === 'xs' ? 'h-3 w-3' : size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
  return <Loader2 className={cn(s, 'animate-spin', className)} />;
}

/** Skeleton line for text placeholders */
export function SkeletonLine({ className }: { className?: string }) {
  return <div className={cn('h-4 rounded-md bg-slate-100 animate-pulse', className)} />;
}

/** Skeleton block for card/section placeholders */
export function SkeletonBlock({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-slate-100 animate-pulse shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-2/3 rounded-md bg-slate-100 animate-pulse" />
            <div className="h-3 w-1/2 rounded-md bg-slate-100 animate-pulse" />
          </div>
          <div className="h-6 w-20 rounded-full bg-slate-100 animate-pulse" />
        </div>
      ))}
    </div>
  );
}

/** Table skeleton for admin data tables */
export function TableSkeleton({ cols = 5, rows = 6 }: { cols?: number; rows?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <div className="bg-slate-50 px-4 py-3 grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-3 rounded-md bg-slate-200 animate-pulse" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="px-4 py-3 border-t border-slate-100 grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className="h-4 rounded-md bg-slate-100 animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Inline loading row for table cells */
export function LoadingRow({ colSpan = 5, label }: { colSpan?: number; label?: string }) {
  const { t } = useTranslation();
  const text = label ?? t('common.loading');
  return (
    <tr>
      <td colSpan={colSpan} className="py-12 text-center">
        <div className="flex items-center justify-center gap-2 text-slate-400">
          <div className="h-4 w-4 rounded-full border-2 border-slate-300 border-t-violet-500 animate-spin" />
          <span className="text-sm font-medium">{text}</span>
        </div>
      </td>
    </tr>
  );
}
