'use client';

import { useState, useEffect, useRef } from 'react';
import { useToast } from '@/components/ui';
import {
  useAdminPlans,
  useAssignUserSubscription,
  useUpdateUserSubscription,
} from '@/hooks/api/useAdminSubscriptions';
import type { UserSubscriptionDto, SubscriptionPlanDto } from '@/services/adminSubscriptions';
import type { UserData } from '@/app/[locale]/dashboard/admin/users/page';
import {
  adminSubscriptionEndDate,
  adminSubscriptionUiStatus,
} from '@/lib/admin/userSubscriptionDisplay';
import { shouldShowLearnerSubscriptionAdminUi } from '@/lib/roles';
import {
  ADMIN_LEARNER_FREE_DURATION_PRESETS,
  ADMIN_LEARNER_PAID_DURATION_PRESETS,
  isLearnerPersonalAdminPlanSlug,
  isValidAdminLearnerPaidPeriod,
} from '@/lib/config/adminLearnerSubscription';
import {
  X, Crown, Calendar, CheckCircle2, XCircle,
  AlertTriangle, Loader2, RefreshCw, ChevronDown,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  user: UserData | null;
  currentSubscription: UserSubscriptionDto | undefined;
  onClose: () => void;
  isOpen: boolean;
}

type SubStatus = 'active' | 'expired';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: SubStatus; label: string; color: string; bg: string; icon: React.ReactNode }[] = [
  { value: 'active',  label: 'Actif',     color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  { value: 'expired', label: 'Expiré',    color: 'text-red-700',     bg: 'bg-red-50 border-red-200',         icon: <XCircle className="w-3.5 h-3.5" /> },
];

function toDateInput(d: string | null | undefined): string {
  if (!d) return '';
  try { return new Date(d).toISOString().split('T')[0]; } catch { return ''; }
}

function addPeriod(from: string, months: number, days: number): string {
  if (!from) return '';
  const d = new Date(from);
  if (months > 0) d.setMonth(d.getMonth() + months);
  if (days > 0)   d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function formatDisplayDate(d: string | null | undefined): string {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return d; }
}

function planThemeClass(color?: string) {
  const map: Record<string, string> = {
    violet:  'text-violet-600',
    emerald: 'text-emerald-600',
    blue:    'text-blue-600',
    amber:   'text-amber-600',
    rose:    'text-rose-600',
  };
  return map[color || ''] || 'text-slate-600';
}

function isFreePlan(p: SubscriptionPlanDto | undefined): boolean {
  if (!p) return false;
  return p.type === 'free' || (p.slug ?? '').toLowerCase() === 'free';
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ManageSubscriptionModal({ user, currentSubscription, onClose, isOpen }: Props) {
  const { showToast }  = useToast();
  const showToastRef   = useRef(showToast);
  useEffect(() => { showToastRef.current = showToast; });

  const { data: plans = [], isLoading: plansLoading } = useAdminPlans('learner-personal');
  const assignSub = useAssignUserSubscription();
  const updateSub = useUpdateUserSubscription(user?.id);

  // ── Form state ──────────────────────────────────────────────────────────────
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<SubStatus>('active');
  const [startDate,      setStartDate]      = useState('');
  const [endDate,        setEndDate]        = useState('');
  const [apiError,       setApiError]       = useState<string | null>(null);

  // ── Populate form when modal opens ─────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    setApiError(null);
    if (currentSubscription) {
      const ids = new Set(plans.map(p => p.id));
      if (plans.length > 0 && currentSubscription.planId && !ids.has(currentSubscription.planId)) {
        setSelectedPlanId(plans[0]?.id || '');
      } else {
        setSelectedPlanId(currentSubscription.planId || plans[0]?.id || '');
      }
      setSelectedStatus(adminSubscriptionUiStatus(currentSubscription));
      setStartDate(
        toDateInput(currentSubscription.currentPeriodStart || currentSubscription.trialStartDate),
      );
      setEndDate(
        toDateInput(currentSubscription.currentPeriodEnd || currentSubscription.trialEndDate),
      );
    } else {
      const first = plans[0];
      setSelectedPlanId(first?.id || '');
      setSelectedStatus('active');
      const now = new Date().toISOString().split('T')[0];
      setStartDate(now);
      setEndDate(isFreePlan(first) ? addPeriod(now, 0, 1) : addPeriod(now, 1, 0));
    }
  }, [isOpen, currentSubscription, plans]);

  /** Keep end date valid for the selected plan (24h free; paid = 1/3/12 months). */
  useEffect(() => {
    if (!isOpen || !selectedPlanId || !plans.length) return;
    const p = plans.find(x => x.id === selectedPlanId);
    const base = startDate || new Date().toISOString().split('T')[0];
    if (isFreePlan(p)) {
      const next = addPeriod(base, 0, 1);
      if (endDate !== next) setEndDate(next);
      return;
    }
    if (!p) return;
    const nextDefault = addPeriod(base, 1, 0);
    if (!endDate) {
      setEndDate(nextDefault);
      return;
    }
    const st = new Date(`${base}T12:00:00`);
    const en = new Date(`${endDate}T12:00:00`);
    if (Number.isNaN(st.getTime()) || Number.isNaN(en.getTime())) return;
    if (!isValidAdminLearnerPaidPeriod(st, en) && endDate !== nextDefault) {
      setEndDate(nextDefault);
    }
  }, [isOpen, selectedPlanId, startDate, plans, endDate]);

  // ── Derived (before early returns so hooks stay consistent) ────────────────
  const selectedPlan = plans.find(p => p.id === selectedPlanId);
  const selectedFree = isFreePlan(selectedPlan);
  const durationPresets = selectedFree
    ? [...ADMIN_LEARNER_FREE_DURATION_PRESETS]
    : [...ADMIN_LEARNER_PAID_DURATION_PRESETS];
  const currentPlanNotLearnerPersonal =
    !!currentSubscription?.plan?.slug &&
    !isLearnerPersonalAdminPlanSlug(currentSubscription.plan.slug);

  if (!isOpen || !user) return null;
  if (!shouldShowLearnerSubscriptionAdminUi(user.role, { institutionalLearnerAccess: user.institutionalLearnerAccess })) {
    return null;
  }

  const selectedStatusMeta = STATUS_OPTIONS.find(s => s.value === selectedStatus) || STATUS_OPTIONS[0];
  const isSaving = assignSub.isPending || updateSub.isPending;

  function handleDurationPreset(months: number, days: number) {
    const base = startDate || new Date().toISOString().split('T')[0];
    setEndDate(addPeriod(base, months, days));
  }

  // When status is active, end date must be in the future
  const endDateIsPast = endDate ? new Date(endDate) < new Date() : false;
  const showEndDateWarning = selectedStatus === 'active' && endDateIsPast;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setApiError(null);

    if (!selectedPlanId) {
      setApiError('Veuillez sélectionner un plan.');
      return;
    }

    if (selectedStatus === 'active' && endDateIsPast) {
      setApiError('La date de fin doit être dans le futur pour un abonnement actif. Utilisez un preset (ex: 1 Mois) pour définir une date valide.');
      return;
    }

    if (!selectedFree && startDate && endDate) {
      const st = new Date(`${startDate}T12:00:00`);
      const en = new Date(`${endDate}T12:00:00`);
      if (!isValidAdminLearnerPaidPeriod(st, en)) {
        setApiError(
          'Durée invalide pour Standard/Premium : choisissez 1 mois, 3 mois ou 1 an à partir de la date de début.',
        );
        return;
      }
    }
    if (selectedStatus === 'active' && !selectedFree && (!startDate || !endDate)) {
      setApiError('Les dates de début et de fin sont requises pour Standard et Premium.');
      return;
    }

    try {
      if (currentSubscription) {
        const updated = await updateSub.mutateAsync({
          id: currentSubscription.id,
          data: {
            status:      selectedStatus,
            planId:      selectedPlanId,
            periodStart: startDate  || undefined,
            periodEnd:   endDate    || undefined,
          },
        });
        if (updated.planId !== selectedPlanId) {
          throw new Error('Le serveur n’a pas confirmé le nouveau plan (réponse incohérente).');
        }
      } else {
        if (!user) {
          setApiError('Aucun utilisateur sélectionné.');
          return;
        }
        const created = await assignSub.mutateAsync({
          userId:      user.id,
          planId:      selectedPlanId,
          status:      selectedStatus,
          periodStart: startDate  || undefined,
          periodEnd:   endDate    || undefined,
        });
        if (created.planId !== selectedPlanId) {
          throw new Error('Le serveur n’a pas confirmé le plan assigné (réponse incohérente).');
        }
      }
      showToastRef.current('Abonnement mis à jour avec succès.', 'success');
      onClose();
    } catch (err: unknown) {
      const raw = err as any;
      const msg: string =
        raw?.response?.data?.message ||
        raw?.message ||
        'Erreur lors de la mise à jour.';
      const displayMsg = Array.isArray(msg) ? msg.join(', ') : String(msg);
      setApiError(displayMsg);
      showToastRef.current(displayMsg, 'error');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => !isSaving && onClose()}
      />

      {/* Panel */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">

        {/* ── Header ── */}
        <div className="relative bg-gradient-to-br from-violet-600 to-purple-700 px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Crown className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-lg leading-tight">Gérer l'abonnement</h2>
                <p className="text-white/70 text-sm">
                  {user.name}
                  <span className="ml-2 opacity-60 text-xs">{user.email}</span>
                </p>
              </div>
            </div>
            <button
              onClick={() => !isSaving && onClose()}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Current sub summary */}
          {currentSubscription && (() => {
            const ui = adminSubscriptionUiStatus(currentSubscription);
            const endRaw = adminSubscriptionEndDate(currentSubscription);
            return (
            <div className="mt-4 flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2 text-xs">
              <span className="text-white/60">Actuel :</span>
              <span className="font-semibold">{currentSubscription.plan?.name || '—'}</span>
              <span className="opacity-40">·</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                ui === 'active' ? 'bg-emerald-400/30 text-emerald-100' : 'bg-red-400/30 text-red-100'
              }`}>
                {ui === 'active' ? 'Actif' : 'Expiré'}
              </span>
              {endRaw && (
                <>
                  <span className="opacity-40">·</span>
                  <span className="text-white/60">expire {formatDisplayDate(endRaw)}</span>
                </>
              )}
            </div>
            );
          })()}
        </div>

        {/* ── Form ── */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {/* Error banner */}
          {apiError && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{apiError}</span>
            </div>
          )}

          {currentPlanNotLearnerPersonal && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                L’abonnement actuel («&nbsp;{currentSubscription?.plan?.name ?? '—'}&nbsp;») n’est pas un plan personnel
                apprenant (Gratuit / Standard / Premium). Sélectionnez l’un des plans ci-dessous pour corriger
                l’enregistrement.
              </span>
            </div>
          )}

          {/* Plan selector */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
              Plan
            </label>
            {plansLoading ? (
              <div className="h-11 rounded-xl bg-slate-100 animate-pulse" />
            ) : (
              <div className="relative">
                <select
                  value={selectedPlanId}
                  onChange={e => setSelectedPlanId(e.target.value)}
                  required
                  className="w-full appearance-none px-4 py-2.5 pr-10 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-400 transition-all font-medium"
                >
                  {plans.map(plan => (
                    <option key={plan.id} value={plan.id}>{plan.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            )}

            {/* Plan description chip */}
            {selectedPlan && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100">
                <div className={`w-2 h-2 rounded-full bg-current ${planThemeClass(selectedPlan.themeColor)}`} />
                <span className="text-xs text-slate-500">{selectedPlan.description || selectedPlan.slug}</span>
                {selectedPlan.billingOptions && selectedPlan.billingOptions.length > 0 && (
                  <span className="ml-auto text-[10px] text-slate-400">
                    {selectedPlan.billingOptions.length} option{selectedPlan.billingOptions.length > 1 ? 's' : ''} tarifaire{selectedPlan.billingOptions.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Status selector — visual buttons */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
              Statut
            </label>
            <div className="grid grid-cols-2 gap-2">
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSelectedStatus(opt.value)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                    selectedStatus === opt.value
                      ? `${opt.bg} ${opt.color} ring-2 ring-offset-1 ring-current/30`
                      : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date range */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Période de validité
              </label>
            </div>

            {selectedFree && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 opacity-70" />
                <span>
                  Le <strong>Plan Gratuit</strong> est limité à <strong>24 heures</strong> à partir de la date de début.
                  La date de fin est calculée automatiquement (le serveur applique la même règle).
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold text-slate-400 ml-1">Début</p>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-400 transition-all"
                />
              </div>
              <div className="space-y-1">
                <p className="text-[11px] font-semibold text-slate-400 ml-1">Fin</p>
                <input
                  type="date"
                  value={endDate}
                  readOnly={selectedFree}
                  onChange={e => setEndDate(e.target.value)}
                  className={`w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-400 transition-all ${selectedFree ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}`}
                />
              </div>
            </div>

            {/* Warning: end date in the past */}
            {showEndDateWarning && (
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span>La date de fin est dans le passé. Choisissez une durée future pour que l&apos;accès soit accordé.</span>
              </div>
            )}

            {/* Duration presets */}
            <div className="flex flex-wrap gap-1.5">
              {durationPresets.map(preset => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handleDurationPreset(preset.months, preset.days)}
                  className="text-[11px] font-semibold bg-white border border-slate-200 text-slate-600 px-2.5 py-1 rounded-lg hover:border-violet-400 hover:text-violet-600 hover:bg-violet-50 transition-all"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Duration summary */}
            {startDate && endDate && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg">
                <span>{formatDisplayDate(startDate)}</span>
                <span className="text-slate-300">→</span>
                <span className="font-semibold text-slate-700">{formatDisplayDate(endDate)}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSaving || !selectedPlanId}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-700 text-white text-sm font-bold shadow-lg shadow-violet-200 hover:from-violet-700 hover:to-purple-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Enregistrement…
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Enregistrer
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
