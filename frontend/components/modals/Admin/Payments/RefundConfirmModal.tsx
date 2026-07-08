import { Button } from '@/components/ui';
import { useTranslation } from '@/contexts/LanguageContext';
import { formatFromMinorUnits } from '@/lib/money';

interface RefundConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  amountCents: number;
  currency: string;
  userLabel: string;
  isPending?: boolean;
}

export function RefundConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  amountCents,
  currency,
  userLabel,
  isPending,
}: RefundConfirmModalProps) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const amt = formatFromMinorUnits(amountCents, currency);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
        <h2 className="text-xl font-semibold mb-2">{t('payments.confirmRefund')}</h2>
        <p className="text-slate-600 mb-4">
          {t('payments.refundConfirmText', { amount: amt, user: userLabel })}
        </p>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <p className="text-amber-800 text-sm">{t('payments.refundIrreversible')}</p>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isPending}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {isPending ? '…' : t('payments.refund')}
          </Button>
        </div>
      </div>
    </div>
  );
}
