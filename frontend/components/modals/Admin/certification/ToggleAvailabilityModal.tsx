'use client';

import { Button } from '@/components/ui';

interface ToggleAvailabilityModalProps {
  available: boolean;
  title: string;
  onToggle: () => void;
  onClose: () => void;
  isOpen: boolean;
}

export default function ToggleAvailabilityModal({
  available,
  title,
  onToggle,
  onClose,
  isOpen,
}: ToggleAvailabilityModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
        <h2 className="text-xl font-semibold mb-2">
          {available ? 'Fermer la certification' : 'Réouvrir la certification'}
        </h2>
        <p className="text-slate-600 mb-4">
          Êtes-vous sûr de vouloir {available ? 'fermer' : 'réouvrir'} <strong>{title}</strong> ?
        </p>
        {available && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <p className="text-amber-800 text-sm">
              Attention : les utilisateurs ne pourront plus s'inscrire une fois fermée.
            </p>
          </div>
        )}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            onClick={onToggle}
            className={available ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}
          >
            {available ? 'Fermer' : 'Réouvrir'}
          </Button>
        </div>
      </div>
    </div>
  );
}