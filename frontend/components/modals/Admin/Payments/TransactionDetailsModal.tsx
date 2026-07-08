'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';
import { Badge } from '@/components/ui';
import { useTranslation } from '@/contexts/LanguageContext';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { AdminTransaction } from '@/services/transactions';
import { formatFromMinorUnits } from '@/lib/money';

type TransactionView = AdminTransaction & { providerMetadata?: unknown };

interface TransactionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: TransactionView;
}

function statusBadgeClass(status: string): string {
  const map: Record<string, string> = {
    paid: 'bg-emerald-100 text-emerald-800',
    pending: 'bg-amber-100 text-amber-800',
    initiated: 'bg-amber-100 text-amber-800',
    failed: 'bg-red-100 text-red-800',
    cancelled: 'bg-slate-100 text-slate-700',
    expired: 'bg-slate-100 text-slate-600',
    refunded: 'bg-violet-100 text-violet-800',
  };
  return map[status] ?? 'bg-slate-100 text-slate-700';
}

export function TransactionDetailsModal({
  isOpen,
  onClose,
  transaction: tx,
}: TransactionDetailsModalProps) {
  const { t } = useTranslation();
  const [metaOpen, setMetaOpen] = useState(false);

  if (!isOpen) return null;

  const displayName = tx.userName || tx.userEmail || tx.customerEmail || '—';
  const displayEmail = tx.userEmail || tx.customerEmail || '—';
  const metaStr =
    tx.providerMetadata != null
      ? typeof tx.providerMetadata === 'string'
        ? tx.providerMetadata
        : JSON.stringify(tx.providerMetadata, null, 2)
      : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
        <h2 className="text-xl font-semibold mb-4">{t('payments.transactionDetails')}</h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between gap-3 p-3 bg-slate-50 rounded-lg">
            <span className="text-slate-600 shrink-0">{t('payments.transactionId')}</span>
            <span className="font-mono text-xs text-right break-all">{tx.id}</span>
          </div>
          <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
            <span className="text-slate-600">Provider</span>
            <span className="font-medium capitalize">{tx.provider}</span>
          </div>
          {tx.providerReference && (
            <div className="flex justify-between gap-3 p-3 bg-slate-50 rounded-lg">
              <span className="text-slate-600 shrink-0">Réf. fournisseur</span>
              <span className="font-mono text-xs text-right break-all">{tx.providerReference}</span>
            </div>
          )}
          <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
            <span className="text-slate-600">{t('payments.user')}</span>
            <span className="font-medium text-right">{displayName}</span>
          </div>
          <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
            <span className="text-slate-600">{t('payments.email')}</span>
            <span className="text-xs break-all text-right">{displayEmail}</span>
          </div>
          <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
            <span className="text-slate-600">Plan</span>
            <span className="font-medium">{tx.planDisplayLabel}</span>
          </div>
          <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
            <span className="text-slate-600">Cycle</span>
            <span>{tx.billingCycle}</span>
          </div>
          <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
            <span className="text-slate-600">{t('payments.amount')}</span>
            <span className="font-bold text-lg text-emerald-700">
              {formatFromMinorUnits(tx.amountCents, tx.currency)}
            </span>
          </div>
          {tx.discountCents > 0 && (
            <div className="flex justify-between p-3 bg-slate-50 rounded-lg text-xs">
              <span className="text-slate-600">Remise</span>
              <span>-{formatFromMinorUnits(tx.discountCents, tx.currency)}</span>
            </div>
          )}
          <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
            <span className="text-slate-600">{t('payments.status')}</span>
            <Badge variant="secondary" className={statusBadgeClass(tx.status)}>
              {tx.status}
            </Badge>
          </div>
          <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
            <span className="text-slate-600">{t('payments.date')}</span>
            <span>{tx.createdAt ? new Date(tx.createdAt).toLocaleString() : '—'}</span>
          </div>
          {tx.paidAt && (
            <div className="flex justify-between p-3 bg-emerald-50/80 rounded-lg">
              <span className="text-emerald-800">Payé le</span>
              <span>{new Date(tx.paidAt).toLocaleString()}</span>
            </div>
          )}
          {tx.promoCode && (
            <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
              <span className="text-slate-600">Promo</span>
              <span className="font-mono">{tx.promoCode}</span>
            </div>
          )}
          {metaStr.length > 0 && (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <button
                type="button"
                className="w-full flex items-center justify-between p-3 bg-slate-50 text-left text-sm font-medium"
                onClick={() => setMetaOpen(!metaOpen)}
              >
                <span>Provider metadata (JSON)</span>
                {metaOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {metaOpen && (
                <pre className="p-3 text-xs overflow-x-auto max-h-64 bg-slate-900 text-slate-100 whitespace-pre-wrap break-all">
                  {metaStr}
                </pre>
              )}
            </div>
          )}
        </div>
        <div className="flex justify-end mt-6">
          <Button onClick={onClose}>{t('common.close')}</Button>
        </div>
      </div>
    </div>
  );
}
