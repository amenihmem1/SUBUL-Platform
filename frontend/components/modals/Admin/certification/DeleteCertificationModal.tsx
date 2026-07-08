'use client';

import { Button } from '@/components/ui';

interface DeleteCertificationModalProps {
  title: string;
  onDelete: () => void;
  onClose: () => void;
  isOpen: boolean;
}

export default function DeleteCertificationModal({
  title,
  onDelete,
  onClose,
  isOpen,
}: DeleteCertificationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
        <h2 className="text-xl font-semibold mb-2">Supprimer la certification</h2>
        <p className="text-slate-600 mb-6">
          Êtes-vous sûr de vouloir supprimer <strong>{title}</strong> ?
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={onDelete} className="bg-red-600 hover:bg-red-700">
            Supprimer
          </Button>
        </div>
      </div>
    </div>
  );
}