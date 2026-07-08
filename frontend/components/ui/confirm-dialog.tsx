'use client';

import { useState, useCallback } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Oui, supprimer',
  cancelLabel = 'Non, annuler',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const isDanger = variant === 'danger';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-xl border border-slate-200 p-6 w-full max-w-md mx-4">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <X className="w-4 h-4 text-slate-400" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${isDanger ? 'bg-red-100' : 'bg-amber-100'}`}>
            <AlertTriangle className={`w-7 h-7 ${isDanger ? 'text-red-500' : 'text-amber-500'}`} />
          </div>

          <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">{message}</p>

          <div className="flex items-center gap-3 w-full">
            <Button
              variant="outline"
              onClick={onCancel}
              className="flex-1"
            >
              {cancelLabel}
            </Button>
            <Button
              onClick={onConfirm}
              className={`flex-1 text-white ${isDanger ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'}`}
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function useConfirmDialog() {
  const [state, setState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    cancelLabel: string;
    variant: 'danger' | 'warning';
    onConfirmCallback: (() => void) | null;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmLabel: 'Oui, supprimer',
    cancelLabel: 'Non, annuler',
    variant: 'danger',
    onConfirmCallback: null,
  });

  const confirm = useCallback((options: {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'warning';
    onConfirm: () => void;
  }) => {
    setState({
      isOpen: true,
      title: options.title,
      message: options.message,
      confirmLabel: options.confirmLabel || 'Oui, supprimer',
      cancelLabel: options.cancelLabel || 'Non, annuler',
      variant: options.variant || 'danger',
      onConfirmCallback: options.onConfirm,
    });
  }, []);

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const handleConfirm = useCallback(() => {
    state.onConfirmCallback?.();
    setState(prev => ({ ...prev, isOpen: false }));
  }, [state.onConfirmCallback]);

  const handleCancel = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: false }));
  }, []);

  const ConfirmDialogComponent = (
    <ConfirmDialog
      isOpen={state.isOpen}
      title={state.title}
      message={state.message}
      confirmLabel={state.confirmLabel}
      cancelLabel={state.cancelLabel}
      variant={state.variant}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  );

  return { confirm, ConfirmDialogComponent };
}
