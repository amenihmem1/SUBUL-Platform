'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, Input, Textarea } from '@/components/ui';
import { createQuoteRequest, type QuotePlanType } from '@/services/adminPlatform';
import { toast } from 'sonner';
import { trackEvent } from '@/lib/analytics/events';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planType: QuotePlanType;
};

type FormState = {
  name: string;
  email: string;
  phone: string;
  organization: string;
  numberOfUsers: string;
  message: string;
};

const PLAN_LABELS: Record<QuotePlanType, string> = {
  universite: 'Plan Universite',
  entreprise: 'Plan Entreprise',
};

const INITIAL_FORM: FormState = {
  name: '',
  email: '',
  phone: '',
  organization: '',
  numberOfUsers: '',
  message: '',
};

export function QuoteRequestModal({ open, onOpenChange, planType }: Props) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) {
      setForm(INITIAL_FORM);
      setPending(false);
    }
  }, [open]);

  const planLabel = useMemo(() => PLAN_LABELS[planType], [planType]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numberOfUsers = Number.parseInt(form.numberOfUsers, 10);

    if (!form.name.trim() || !form.email.trim() || !form.organization.trim() || !numberOfUsers) {
      toast.error('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    if (numberOfUsers < 1) {
      toast.error('Le nombre d utilisateurs doit etre superieur a 0.');
      return;
    }

    setPending(true);
    try {
      await createQuoteRequest({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        organization: form.organization.trim(),
        numberOfUsers,
        message: form.message.trim() || undefined,
        planType,
      });
      trackEvent('quote_submitted', {
        planType,
        numberOfUsers,
        organization: form.organization.trim(),
      });
      toast.success('Votre demande de devis a ete envoyee.');
      onOpenChange(false);
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Impossible de soumettre votre demande.';
      toast.error(Array.isArray(message) ? message.join(', ') : message);
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Demander un devis personnalise</DialogTitle>
          <DialogDescription>
            Nous vous recontactons rapidement avec une proposition pour {planLabel}.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              placeholder="Nom complet *"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />
            <Input
              type="email"
              placeholder="Email *"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            />
            <Input
              placeholder="Telephone (optionnel)"
              value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
            />
            <Input
              placeholder="Nombre d utilisateurs *"
              type="number"
              min={1}
              value={form.numberOfUsers}
              onChange={(e) => setForm((p) => ({ ...p, numberOfUsers: e.target.value }))}
            />
          </div>

          <Input
            placeholder="Nom de l organisation *"
            value={form.organization}
            onChange={(e) => setForm((p) => ({ ...p, organization: e.target.value }))}
          />

          <Input value={planLabel} disabled />

          <Textarea
            placeholder="Message / besoins"
            value={form.message}
            onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
            rows={4}
          />

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              Annuler
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Envoi...' : 'Envoyer la demande'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
