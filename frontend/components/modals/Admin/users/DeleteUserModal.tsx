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
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
        <h2 className="text-xl font-semibold mb-2">{t('users.deleteUser')}</h2>
        <p className="text-slate-600 mb-6">
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
  );
}