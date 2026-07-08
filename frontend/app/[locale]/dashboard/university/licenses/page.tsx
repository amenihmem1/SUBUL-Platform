'use client';

import { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/components/ui';
import { Button } from '@/components/ui';
import { useTranslation } from '@/contexts/LanguageContext';
import { getUniversityLicenses } from '@/services/universityApi';
import { AlertCircle, Inbox } from 'lucide-react';

type LicenseRow = {
  id: string;
  seatsTotal: number;
  seatsUsed: number;
  status: string;
  validUntil?: string;
  plan?: { name: string };
};

export default function UniversityLicensesPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [licenses, setLicenses] = useState<LicenseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const fetchLicenses = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const data = await getUniversityLicenses();
      setLicenses(data);
    } catch {
      setLoadError(true);
      showToast(String(t('universityLicenses.loadError')), 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast, t]);

  useEffect(() => {
    void fetchLicenses();
  }, [fetchLicenses]);

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">{String(t('universityLicenses.title'))}</h1>
      <p className="text-sm text-muted-foreground">
        {String(t('universityLicenses.subtitle'))}
      </p>

      {loading && (
        <div className="flex items-center justify-center p-12 rounded-2xl border border-border bg-card">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      )}

      {!loading && loadError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <p className="text-sm text-destructive flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {String(t('universityLicenses.loadError'))}
          </p>
          <Button type="button" variant="outline" size="sm" onClick={() => void fetchLicenses()}>
            {String(t('common.retry'))}
          </Button>
        </div>
      )}

      {!loading && !loadError && (
        <ul className="space-y-3">
          {licenses.length === 0 ? (
            <li className="bg-card rounded-2xl border border-border shadow-sm p-10 flex flex-col items-center text-center text-muted-foreground">
              <Inbox className="w-10 h-10 opacity-40 mb-2" />
              <p>{String(t('universityLicenses.empty'))}</p>
            </li>
          ) : (
            licenses.map((l) => (
              <li key={l.id} className="bg-card rounded-2xl border border-border shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{l.plan?.name || String(t('universityLicenses.planFallback'))}</p>
                    <p className="text-sm text-muted-foreground">
                      {String(
                        t('universityLicenses.seatsUsed', {
                          used: l.seatsUsed,
                          total: l.seatsTotal,
                          status: l.status,
                        }),
                      )}
                      {l.validUntil
                        ? String(
                            t('universityLicenses.validUntil', {
                              date: new Date(l.validUntil).toLocaleDateString(),
                            }),
                          )
                        : ''}
                    </p>
                  </div>
                  <div className="w-32">
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          (l.seatsUsed / l.seatsTotal) * 100 > 80
                            ? 'bg-red-500'
                            : (l.seatsUsed / l.seatsTotal) * 100 > 50
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                        }`}
                        style={{ width: `${(l.seatsUsed / l.seatsTotal) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 text-right">
                      {Math.round((l.seatsUsed / l.seatsTotal) * 100)}%
                    </p>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
