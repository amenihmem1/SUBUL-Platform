'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getMyReferralStats,
  createPayoutAccount,
  createPayoutRequest,
  listPayoutAccounts,
  deactivatePayoutAccount,
  listMyPayoutRequests,
  recomputeMyReferrals,
  type ReferralRecord,
  type ReferralReward,
  type PayoutAccount,
} from '@/services/referrals';
import { cn } from '@/lib/utils';
import {
  Copy, Check, Share2, Gift, Users, CheckCircle2, Clock,
  AlertTriangle, ChevronDown, ChevronUp, Banknote, Smartphone,
  RefreshCw, Info, ArrowRight, Sparkles,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  pending: 'En attente',
  email_verified: 'Email vérifié',
  qualified: 'Qualifié',
  rewarded: 'Récompensé',
  rejected: 'Rejeté',
  fraud: 'Signalé',
};

const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  email_verified: 'bg-blue-50 text-blue-700 border-blue-200',
  qualified: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rewarded: 'bg-violet-50 text-violet-700 border-violet-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
  fraud: 'bg-red-50 text-red-700 border-red-200',
};

const REWARD_STATUS_LABEL: Record<string, string> = {
  claimable: 'Disponible',
  reserved: 'Demande soumise — en traitement',
  approved: 'Approuvé — virement en cours',
  paid: 'Payé',
  rejected: 'Rejeté',
  reversed: 'Annulé (remboursement)',
  cancelled: 'Annulé',
};

const REWARD_STATUS_COLOR: Record<string, string> = {
  claimable: 'bg-emerald-50 text-emerald-700',
  reserved: 'bg-blue-50 text-blue-700',
  approved: 'bg-violet-50 text-violet-700',
  paid: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-red-50 text-red-700',
  reversed: 'bg-red-50 text-red-700',
  cancelled: 'bg-gray-100 text-gray-600',
};

function fmt(d?: string | null) {
  if (!d) return '—';
  return new Intl.DateTimeFormat('fr-TN', { dateStyle: 'medium' }).format(new Date(d));
}

// ─── Payout Modal ─────────────────────────────────────────────────────────────

function ClaimRewardsModal({
  onClose,
  rewards,
  accounts,
  onSubmit,
  loading,
}: {
  onClose: () => void;
  rewards: ReferralReward[];
  accounts: PayoutAccount[];
  onSubmit: (args: {
    rewardIds: string[];
    payoutAccountId?: string;
    newAccount?: { method: 'bank' | 'd17'; details: Record<string, string> };
  }) => void;
  loading: boolean;
}) {
  const claimable = rewards.filter((r) => r.status === 'claimable');
  const [selectedRewardIds, setSelectedRewardIds] = useState<string[]>(claimable.map((r) => r.id));

  const [accountMode, setAccountMode] = useState<'existing' | 'new'>(accounts.length > 0 ? 'existing' : 'new');
  const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id ?? '');

  const [method, setMethod] = useState<'bank' | 'd17'>('bank');
  const [iban, setIban] = useState('');
  const [holder, setHolder] = useState('');
  const [phone, setPhone] = useState('');

  const amountCents = claimable
    .filter((r) => selectedRewardIds.includes(r.id))
    .reduce((s, r) => s + (r.amountCents ?? 0), 0);

  const hasRewards = selectedRewardIds.length > 0;
  const existingValid = accountMode === 'existing' && !!selectedAccountId;
  const newValid =
    accountMode === 'new' &&
    (method === 'bank'
      ? iban.trim().length > 8 && holder.trim().length > 2
      : phone.trim().length > 7);
  const valid = hasRewards && (existingValid || newValid);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Demander un paiement</h2>
          <p className="text-sm text-gray-500 mt-0.5">Sélectionnez vos récompenses et un compte de paiement</p>
        </div>

        {/* Rewards */}
        <div className="px-6 pt-5 space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Récompenses disponibles</p>
          {claimable.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
              Aucune récompense disponible pour le moment.
            </div>
          ) : (
            <div className="space-y-2">
              {claimable.map((r) => {
                const checked = selectedRewardIds.includes(r.id);
                return (
                  <label
                    key={r.id}
                    className={cn(
                      'flex items-center justify-between gap-3 rounded-xl border p-3 cursor-pointer transition',
                      checked ? 'border-violet-300 bg-violet-50/40' : 'border-gray-200 hover:bg-gray-50',
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          setSelectedRewardIds((prev) =>
                            prev.includes(r.id) ? prev.filter((x) => x !== r.id) : [...prev, r.id]
                          );
                        }}
                      />
                      <div>
                        <p className="text-sm font-semibold text-gray-800">Bloc #{r.rewardBlock}</p>
                        <p className="text-xs text-gray-400">{fmt(r.unlockedAt ?? r.createdAt)}</p>
                      </div>
                    </div>
                    <div className="text-sm font-bold text-gray-900">{(r.amountCents / 1000).toFixed(3)} DT</div>
                  </label>
                );
              })}
              <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
                <button
                  type="button"
                  className="underline"
                  onClick={() => setSelectedRewardIds(claimable.map((r) => r.id))}
                >
                  Tout sélectionner
                </button>
                <span>Total: <span className="font-semibold text-gray-800">{(amountCents / 1000).toFixed(3)} DT</span></span>
              </div>
            </div>
          )}
        </div>

        {/* Account */}
        <div className="px-6 pt-5 pb-6 space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Compte de paiement</p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAccountMode('existing')}
              disabled={accounts.length === 0}
              className={cn(
                'flex-1 rounded-xl border-2 px-3 py-2 text-sm font-semibold transition',
                accountMode === 'existing'
                  ? 'border-violet-500 bg-violet-50 text-violet-700'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300',
                accounts.length === 0 && 'opacity-40 cursor-not-allowed',
              )}
            >
              Utiliser un compte
            </button>
            <button
              type="button"
              onClick={() => setAccountMode('new')}
              className={cn(
                'flex-1 rounded-xl border-2 px-3 py-2 text-sm font-semibold transition',
                accountMode === 'new'
                  ? 'border-violet-500 bg-violet-50 text-violet-700'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300',
              )}
            >
              Ajouter un compte
            </button>
          </div>

          {accountMode === 'existing' && (
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {(a.method === 'bank' ? 'Bank' : 'D17')}{a.label ? ` — ${a.label}` : ''}
                </option>
              ))}
            </select>
          )}

          {accountMode === 'new' && (
            <>
              <div className="flex gap-3">
                {(['bank', 'd17'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethod(m)}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-medium transition-all',
                      method === m
                        ? 'border-violet-500 bg-violet-50 text-violet-700'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300',
                    )}
                  >
                    {m === 'bank' ? <Banknote className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}
                    {m === 'bank' ? 'Virement bancaire' : 'D17'}
                  </button>
                ))}
              </div>
              {method === 'bank' ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                      IBAN / Numéro de compte
                    </label>
                    <input
                      value={iban}
                      onChange={(e) => setIban(e.target.value)}
                      placeholder="Votre IBAN (ex. TN59 …)"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                      Nom du titulaire
                    </label>
                    <input
                      value={holder}
                      onChange={(e) => setHolder(e.target.value)}
                      placeholder="Nom complet sur le compte"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                    Numéro D17
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+216 55 668 141"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent font-mono"
                  />
                </div>
              )}
            </>
          )}

          <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl">
            <Info className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              Le virement sera effectué sous <strong>5 jours ouvrables</strong> après approbation.
            </p>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              disabled={!valid || loading}
              onClick={() => {
                if (accountMode === 'existing') {
                  onSubmit({ rewardIds: selectedRewardIds, payoutAccountId: selectedAccountId });
                  return;
                }
                onSubmit({
                  rewardIds: selectedRewardIds,
                  newAccount: {
                    method,
                    details: method === 'bank' ? { iban, holderName: holder } : { phone },
                  },
                });
              }}
              className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#c2185b)' }}
            >
              {loading ? 'Envoi...' : 'Confirmer la demande'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Reward Section ───────────────────────────────────────────────────────────

function RewardCard({
  rewards,
  claimableAmountCents,
  onClaimAll,
}: {
  rewards: ReferralReward[];
  claimableAmountCents: number;
  onClaimAll: () => void;
}) {
  const claimable = rewards.filter((r) => r.status === 'claimable');
  const reserved = rewards.filter((r) => r.status === 'reserved' || r.status === 'approved');
  const paid = rewards.filter((r) => r.status === 'paid');

  return (
    <div className="rounded-2xl overflow-hidden border border-violet-200 shadow-lg">
      {/* Gradient top bar */}
      <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg,#7c3aed,#c2185b)' }} />

      <div className="bg-white p-6">
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Solde disponible</p>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black text-gray-900">{(claimableAmountCents / 1000).toFixed(3)}</span>
              <span className="text-2xl font-bold text-gray-500">DT</span>
            </div>
            <p className="mt-1 text-xs text-gray-400">
              {claimable.length} disponible(s) · {reserved.length} en cours · {paid.length} payé(s)
            </p>
          </div>
          <span className={cn('text-xs font-semibold px-3 py-1.5 rounded-full', claimable.length > 0 ? 'bg-emerald-50 text-emerald-700' : reserved.length > 0 ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600')}>
            {claimable.length > 0 ? 'Disponible' : reserved.length > 0 ? 'En cours' : '—'}
          </span>
        </div>

        {claimable.length > 0 && (
          <button
            onClick={onClaimAll}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl text-base font-bold text-white shadow-lg hover:opacity-90 active:scale-[0.98] transition-all"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#c2185b)' }}
          >
            <Banknote className="h-5 w-5" />
            Demander mon virement — {(claimableAmountCents / 1000).toFixed(3)} DT
            <ArrowRight className="h-4 w-4" />
          </button>
        )}

        {reserved.length > 0 && (
          <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl">
            <Clock className="h-5 w-5 text-blue-500 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-blue-800">Demande en cours de traitement</p>
              <p className="text-xs text-blue-600 mt-0.5">L'équipe Subul va traiter votre demande sous 5 jours ouvrables.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const FAQS = [
  { q: "Qui est un filleul qualifié ?", a: "Un ami qui s'inscrit via votre lien, vérifie son email et souscrit à un abonnement payant actif." },
  { q: "Quand reçois-je les 100 DT ?", a: "Dès 20 filleuls qualifiés atteints, cliquez sur 'Demander mon virement'. L'équipe Subul traite sous 5 jours ouvrables." },
  { q: "Puis-je gagner plusieurs fois ?", a: "Oui. Chaque nouveau cycle de 20 filleuls qualifiés génère une nouvelle récompense de 100 DT." },
  { q: "Mon code peut-il être utilisé plusieurs fois ?", a: "Oui, votre code est permanent. Partagez-le à autant d'amis que vous voulez." },
];

export default function ReferralPage() {
  const qc = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showAllReferrals, setShowAllReferrals] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['referral-stats'],
    queryFn: getMyReferralStats,
    staleTime: 30_000,
  });

  const { data: payoutAccounts } = useQuery({
    queryKey: ['referral-payout-accounts'],
    queryFn: listPayoutAccounts,
    staleTime: 30_000,
  });

  const deactivateAccountMutation = useMutation({
    mutationFn: (id: string) => deactivatePayoutAccount(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['referral-payout-accounts'] });
      showToast('Compte désactivé.', true);
    },
    onError: (e: any) => showToast(e?.response?.data?.message || 'Erreur', false),
  });

  const payoutMutation = useMutation({
    mutationFn: async (args: {
      rewardIds: string[];
      payoutAccountId?: string;
      newAccount?: { method: 'bank' | 'd17'; details: Record<string, string> };
    }) => {
      let payoutAccountId = args.payoutAccountId;
      if (!payoutAccountId && args.newAccount) {
        const acc = await createPayoutAccount({ method: args.newAccount.method, accountDetails: args.newAccount.details });
        payoutAccountId = acc.id;
        qc.invalidateQueries({ queryKey: ['referral-payout-accounts'] });
      }
      if (!payoutAccountId) throw new Error('Missing payoutAccountId');
      return await createPayoutRequest({ payoutAccountId, rewardIds: args.rewardIds });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['referral-stats'] });
      qc.invalidateQueries({ queryKey: ['referral-payout-requests'] });
      setShowModal(false);
      showToast('Demande envoyée. Traitement sous 5 jours ouvrables.', true);
    },
    onError: (e: any) => showToast(e?.response?.data?.message || 'Erreur', false),
  });

  const { data: payoutRequests } = useQuery({
    queryKey: ['referral-payout-requests'],
    queryFn: listMyPayoutRequests,
    staleTime: 15_000,
  });

  const recomputeMutation = useMutation({
    mutationFn: recomputeMyReferrals,
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['referral-stats'] });
      showToast(`Synchronisé — ${r.fixed} mise(s) à jour`, true);
    },
  });

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4500);
  };

  const copyLink = async () => {
    if (!data?.referralLink) return;
    await navigator.clipboard.writeText(data.referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareWhatsApp = () => {
    if (!data?.referralLink) return;
    const text = encodeURIComponent(`🚀 Rejoins Subul — la plateforme de formation en IA, Cloud & Cybersécurité. Inscris-toi via mon lien :\n${data.referralLink}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  if (isLoading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  const { referralCode, referralLink, totalInvited, emailVerified, qualified, milestone, progressPercent, rewards, claimableAmountCents, referrals } = data;
  const remaining = Math.max(0, milestone - qualified);
  const visibleReferrals = showAllReferrals ? referrals : referrals.slice(0, 8);

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Toast */}
      {toast && (
        <div className={cn(
          'fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-sm font-medium border',
          toast.ok ? 'bg-white text-emerald-800 border-emerald-200' : 'bg-white text-red-700 border-red-200',
        )}>
          {toast.ok ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <AlertTriangle className="h-4 w-4 text-red-500" />}
          {toast.msg}
        </div>
      )}

      {/* Payout Modal */}
      {showModal && (
        <ClaimRewardsModal
          onClose={() => setShowModal(false)}
          rewards={rewards}
          accounts={payoutAccounts ?? []}
          onSubmit={(args) => payoutMutation.mutate(args)}
          loading={payoutMutation.isPending}
        />
      )}

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg,#3b0764 0%,#6d28d9 45%,#be185d 100%)' }}>
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(ellipse at 10% 90%,rgba(255,255,255,.12) 0%,transparent 60%),radial-gradient(ellipse at 90% 10%,rgba(255,255,255,.08) 0%,transparent 60%)' }} />
        <div className="relative max-w-3xl mx-auto px-5 py-10">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-yellow-300" />
            <span className="text-white/70 text-xs font-semibold uppercase tracking-widest">Programme de parrainage</span>
          </div>
          <h1 className="text-3xl font-black text-white leading-tight mb-1">
            Parrainez & gagnez <span className="text-yellow-300">100 DT</span>
          </h1>
          <p className="text-white/70 text-sm mb-7">Invitez 20 amis qui souscrivent à un abonnement payant.</p>

          {/* Progress card */}
          <div className="bg-white/10 backdrop-blur rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-black text-white">{qualified}</span>
                <span className="text-white/50 text-xl font-semibold">/ {milestone}</span>
                <span className="text-white/60 text-sm ml-1">qualifiés</span>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-yellow-300">{progressPercent}%</div>
                <div className="text-white/50 text-xs">{remaining > 0 ? `encore ${remaining}` : 'Objectif atteint!'}</div>
              </div>
            </div>
            <div className="h-3 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{ width: `${progressPercent}%`, background: 'linear-gradient(90deg,#a78bfa,#f9a8d4)' }}
              />
            </div>
            <div className="flex justify-between mt-2.5 text-xs text-white/50">
              <span>{totalInvited} invités au total</span>
              <span>{emailVerified} ont vérifié leur email</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-5 py-6 space-y-5">

        {/* ── REWARD (prominent, top of content) ─────────────────────────── */}
        {rewards && rewards.length > 0 ? (
          <RewardCard rewards={rewards} claimableAmountCents={claimableAmountCents} onClaimAll={() => setShowModal(true)} />
        ) : remaining > 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-violet-300 p-6 text-center">
            <div className="h-14 w-14 rounded-full mx-auto mb-3 flex items-center justify-center text-2xl"
              style={{ background: 'linear-gradient(135deg,#ede9fe,#fce7f3)' }}>
              🎯
            </div>
            <p className="text-base font-bold text-gray-800 mb-1">
              Plus que <span className="text-violet-600">{remaining}</span> filleul{remaining > 1 ? 's' : ''} pour débloquer 100 DT
            </p>
            <p className="text-sm text-gray-500">Continuez à partager votre lien.</p>
          </div>
        ) : null}

        {/* ── PAYOUT HISTORY ─────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <p className="text-sm font-bold text-gray-800">Historique des demandes</p>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{payoutRequests?.length ?? 0}</span>
          </div>
          {!payoutRequests || payoutRequests.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-400">Aucune demande pour le moment.</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {payoutRequests.slice(0, 6).map((r) => (
                <div key={r.id} className="flex items-center justify-between px-5 py-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      {(r.totalAmountCents / 1000).toFixed(3)} DT · {r.rewardCount} récompense(s)
                    </p>
                    <p className="text-xs text-gray-400">{fmt(r.submittedAt ?? r.createdAt)}</p>
                  </div>
                  <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-gray-100 text-gray-700">
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── PAYOUT ACCOUNTS ────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <p className="text-sm font-bold text-gray-800">Mes comptes de paiement</p>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{payoutAccounts?.length ?? 0}</span>
          </div>
          {!payoutAccounts || payoutAccounts.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-400">
              Aucun compte enregistré. Ajoutez-en un lors d’une demande de paiement.
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {payoutAccounts.map((a) => (
                <div key={a.id} className="flex items-center justify-between px-5 py-4 gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800">
                      {a.method === 'bank' ? 'Virement bancaire' : 'D17'}
                      {a.label ? <span className="text-gray-500 font-medium"> · {a.label}</span> : null}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {a.method === 'bank'
                        ? (a.accountDetails?.iban || a.accountDetails?.accountNumber || '—')
                        : (a.accountDetails?.phone || '—')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => deactivateAccountMutation.mutate(a.id)}
                    disabled={deactivateAccountMutation.isPending}
                    className="shrink-0 rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Désactiver
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── REFERRAL LINK ───────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Votre lien de parrainage</p>

          {/* Link row */}
          <div className="flex gap-2 mb-3">
            <div className="flex-1 flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 min-w-0">
              <span className="text-xs text-gray-600 truncate font-mono">{referralLink}</span>
            </div>
            <button
              onClick={copyLink}
              className={cn(
                'shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all',
                copied ? 'bg-emerald-500 text-white' : 'bg-violet-600 text-white hover:bg-violet-700',
              )}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copié!' : 'Copier'}
            </button>
          </div>

          {/* Code badge */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs text-gray-400">Code :</span>
            <code className="text-sm font-mono font-bold text-violet-700 bg-violet-50 border border-violet-100 px-3 py-1 rounded-lg tracking-widest">
              {referralCode}
            </code>
          </div>

          {/* Share buttons */}
          <div className="flex gap-2">
            <button
              onClick={shareWhatsApp}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#25D366] text-white text-sm font-semibold hover:bg-[#1ebe5d] transition-colors"
            >
              <Share2 className="h-4 w-4" />
              WhatsApp
            </button>
            <button
              onClick={() => {
                const s = encodeURIComponent('Formation IA & Cloud — Rejoins Subul');
                const b = encodeURIComponent(`Salut,\n\nJe t'invite sur Subul : ${referralLink}`);
                window.open(`mailto:?subject=${s}&body=${b}`);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors"
            >
              Email
            </button>
            <button
              onClick={() => recomputeMutation.mutate()}
              disabled={recomputeMutation.isPending}
              className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl text-gray-400 text-xs hover:bg-gray-50 transition-colors"
              title="Synchroniser les statuts"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', recomputeMutation.isPending && 'animate-spin')} />
              Sync
            </button>
          </div>
        </div>

        {/* ── STATS ───────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Invités', value: totalInvited, color: 'text-gray-700' },
            { label: 'Email OK', value: emailVerified, color: 'text-blue-600' },
            { label: 'Qualifiés', value: qualified, color: 'text-emerald-600' },
            { label: 'Objectif', value: milestone, color: 'text-violet-600' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
              <div className={cn('text-2xl font-black', s.color)}>{s.value}</div>
              <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── REFERRAL LIST ───────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <p className="text-sm font-bold text-gray-800">Mes filleuls</p>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{referrals.length}</span>
          </div>

          {referrals.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="h-10 w-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400">Aucun filleul pour l'instant.</p>
              <p className="text-xs text-gray-300 mt-1">Partagez votre lien pour commencer.</p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-gray-50">
                {visibleReferrals.map((r: ReferralRecord, i: number) => (
                  <div key={r.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50/60 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-100 to-pink-100 flex items-center justify-center text-xs font-bold text-violet-600">
                        {i + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Filleul #{r.referredUserId}</p>
                        <p className="text-xs text-gray-400">{fmt(r.signupAt || r.createdAt)}</p>
                      </div>
                    </div>
                    <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full border', STATUS_COLOR[r.status] ?? 'bg-gray-50 text-gray-500 border-gray-200')}>
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
                  </div>
                ))}
              </div>

              {referrals.length > 8 && (
                <button
                  onClick={() => setShowAllReferrals(!showAllReferrals)}
                  className="w-full py-3.5 text-sm font-medium text-violet-600 hover:bg-violet-50 transition-colors flex items-center justify-center gap-1.5 border-t border-gray-100"
                >
                  {showAllReferrals ? (
                    <><ChevronUp className="h-4 w-4" /> Voir moins</>
                  ) : (
                    <><ChevronDown className="h-4 w-4" /> Voir les {referrals.length - 8} autres</>
                  )}
                </button>
              )}
            </>
          )}
        </div>

        {/* ── HOW IT WORKS ────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm font-bold text-gray-800 mb-4">Comment ça marche</p>
          <div className="space-y-4">
            {[
              { n: '1', t: 'Partagez votre lien', d: 'Envoyez votre lien unique à vos amis par WhatsApp, email ou SMS.' },
              { n: '2', t: 'Ils s\'inscrivent & vérifient', d: 'Votre ami crée un compte et confirme son adresse email.' },
              { n: '3', t: 'Ils souscrivent', d: 'Ils choisissent un abonnement payant. Ils deviennent qualifiés.' },
              { n: '4', t: 'Vous touchez 100 DT', d: 'À 20 qualifiés, cliquez sur "Demander le virement". Paiement sous 5 jours.' },
            ].map((step) => (
              <div key={step.n} className="flex gap-4">
                <div className="h-8 w-8 rounded-full shrink-0 flex items-center justify-center text-sm font-black text-white"
                  style={{ background: 'linear-gradient(135deg,#7c3aed,#c2185b)' }}>
                  {step.n}
                </div>
                <div className="pt-0.5">
                  <p className="text-sm font-semibold text-gray-800">{step.t}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{step.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── FAQ ─────────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <p className="text-sm font-bold text-gray-800 px-5 py-4 border-b border-gray-100">Questions fréquentes</p>
          {FAQS.map((f, i) => (
            <div key={i} className="border-b border-gray-50 last:border-0">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
              >
                <span className="text-sm font-medium text-gray-800">{f.q}</span>
                {openFaq === i ? <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />}
              </button>
              {openFaq === i && (
                <p className="px-5 pb-4 text-sm text-gray-500 leading-relaxed">{f.a}</p>
              )}
            </div>
          ))}
        </div>

        {/* Bottom spacer */}
        <div className="h-6" />
      </div>
    </div>
  );
}
