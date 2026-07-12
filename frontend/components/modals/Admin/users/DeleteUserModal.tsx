'use client';

import { Button } from '@/components/ui';
import { useTranslation } from '@/contexts/LanguageContext';

interface DeleteUserModalProps {
  name: string;
  onDelete: () => void;
  onClose: () => void;
  isOpen: boolean;
  isDeleting?: boolean;
}

export default function DeleteUserModal({
  name,
  onDelete,
  onClose,
  isOpen,
  isDeleting = false,
}: DeleteUserModalProps) {
  const { t } = useTranslation();
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={() => !isDeleting && onClose()} />
      <div className="relative mx-4 w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-5 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/75">Suppression</p>
          <h2 className="mt-1 text-xl font-black text-white">{t('users.deleteUser')}</h2>
        </div>
        <div className="p-6">
          <p className="mb-6 text-slate-600">
            {t('users.deleteConfirmMessage')} <strong>{name}</strong> {t('users.deleteConfirmSuffix')}
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose} disabled={isDeleting}>{t('common.cancel')}</Button>
            <Button onClick={onDelete} className="bg-red-600 hover:bg-red-700" disabled={isDeleting}>
              {isDeleting ? 'Suppression...' : t('users.delete')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
