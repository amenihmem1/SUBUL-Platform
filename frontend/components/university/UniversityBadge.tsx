'use client';

import { Building2 } from 'lucide-react';
import { useUniversity } from '@/contexts/UniversityContext';

export function UniversityBadge() {
  const { university, isLoading } = useUniversity();

  if (isLoading || !university) return null;

  return (
    <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-gradient-to-r from-[#7C4DFF]/5 to-[#C2185B]/5 border border-[#7C4DFF]/15">
      {university.logo
        ? (
          <img
            src={university.logo}
            alt={university.name}
            className="h-8 w-8 rounded-lg object-contain border border-border/40 bg-white flex-shrink-0"
          />
        )
        : (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#7C4DFF] to-[#C2185B] flex-shrink-0">
            <Building2 className="h-4 w-4 text-white" />
          </div>
        )}
      <div className="min-w-0">
        <p className="text-xs font-semibold text-foreground truncate leading-tight">{university.name}</p>
        <p className="text-[10px] text-muted-foreground leading-tight">Access provided by institution</p>
      </div>
    </div>
  );
}
