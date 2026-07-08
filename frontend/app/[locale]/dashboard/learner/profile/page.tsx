'use client';

import { useEffect, useId, useState } from 'react';
import {
  Building2,
  Camera,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  MapPin,
  Phone,
  User as UserIcon,
  CheckCircle2,
  Loader2,
  RotateCcw,
  Cpu,
  Shield,
  Cloud,
  Brain,
  BarChart3,
} from 'lucide-react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/LanguageContext';
import { useCurrentUser, useUpdateProfile, useUploadProfilePicture } from '@/hooks/api/useUsers';
import { useLatestAssessment, useQuizHistory } from '@/hooks/api/useQuizResults';
import type { User, UpdateProfileRequest } from '@/services/user';
import { MAX_UPLOAD_FILE_SIZE_BYTES, MAX_UPLOAD_FILE_SIZE_LABEL } from '@/lib/upload.constants';

/* ─── types ── */
type ProfileFormState = {
  fullName: string;
  email: string;
  companyName: string;
  phone: string;
  address: string;
  bio: string;
};

type ProviderCredential = {
  providerId: 'aws' | 'azure' | 'gcp';
  providerLabel: string;
  username: string;
  accessKeyId: string;
  secretAccessKey: string;
};

/* ─── helpers ── */
const PHONE_REGEX = /^\+?[0-9\s\-()]{7,20}$/;

const TRACK_STYLES: Record<string, { label: string; class: string }> = {
  cloud: { label: 'Cloud', class: 'bg-sky-50 text-sky-700 border-sky-200' },
  cyber: { label: 'Cybersecurity', class: 'bg-rose-50 text-rose-700 border-rose-200' },
  ai: { label: 'AI & Data', class: 'bg-violet-50 text-violet-700 border-violet-200' },
};

const DOMAIN_STYLES: Record<string, { bg: string; text: string }> = {
  cloud: { bg: '#0ea5e9', text: 'Cloud' },
  azure: { bg: '#0078d4', text: 'Azure' },
  aws: { bg: '#f59e0b', text: 'AWS' },
  gcp: { bg: '#4ade80', text: 'GCP' },
  cyber: { bg: '#f43f5e', text: 'Cyber' },
  cybersecurity: { bg: '#f43f5e', text: 'Cybersecurity' },
  securite: { bg: '#f43f5e', text: 'Sécurité' },
  ai: { bg: '#8b5cf6', text: 'IA' },
  devops: { bg: '#10b981', text: 'DevOps' },
  data: { bg: '#a855f7', text: 'Data' },
};

const SCORE_BAR_CONFIGS = [
  { key: 'cloudPercentage', label: 'Cloud', color: '#0ea5e9', icon: Cloud },
  { key: 'cyberPercentage', label: 'Cybersecurity', color: '#f43f5e', icon: Shield },
  { key: 'aiPercentage', label: 'AI & Data', color: '#8b5cf6', icon: Brain },
] as const;

/* ─── sub-components ── */
function ScoreBar({ label, value, color, Icon }: { label: string; value: number; color: string; Icon: React.ElementType }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5" style={{ color }} />
          <span className="text-sm font-medium text-slate-700">{label}</span>
        </div>
        <span className="text-sm font-bold" style={{ color }}>{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
    </div>
  );
}

function InputField({
  id, label, type = 'text', value, onChange, placeholder, disabled, error, autoComplete,
}: {
  id: string; label: string; type?: string; value: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string; disabled?: boolean; error?: string | null; autoComplete?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete={autoComplete}
        className={`mt-1.5 h-11 w-full rounded-xl border px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 ${
          disabled
            ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'
            : error
              ? 'border-rose-400 bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
              : 'border-slate-200 bg-white focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20'
        }`}
      />
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
}

/* ─── page ── */
export default function LearnerProfilePage() {
  const { t, dir } = useTranslation();
  const isRTL = dir === 'rtl';
  const photoInputId = useId();
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, boolean>>({});

  const { data: currentUser = null, isLoading: loading } = useCurrentUser();
  const updateProfileMutation = useUpdateProfile();
  const uploadPictureMutation = useUploadProfilePicture();
  const { data: latestAssessment = null } = useLatestAssessment();
  const { data: quizHistory } = useQuizHistory();

  const [form, setForm] = useState<ProfileFormState>({
    fullName: '', email: '', companyName: '', phone: '', address: '', bio: '',
  });
  const [providerCredentials] = useState<ProviderCredential[]>([]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const buildForm = (user: User): ProfileFormState => ({
    fullName: user.fullName || '',
    email: user.email,
    companyName: (user as any).companyName || '',
    phone: (user as any).phone || '',
    address: (user as any).address || '',
    bio: (user as any).bio || '',
  });

  useEffect(() => {
    if (currentUser) { setForm(buildForm(currentUser)); setIsDirty(false); }
  }, [currentUser]);

  useEffect(() => {
    if (!photoFile) { setPhotoPreviewUrl(null); return; }
    const url = URL.createObjectURL(photoFile);
    setPhotoPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  const onChange = (key: keyof ProfileFormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    setIsDirty(true);
  };

  const handleSaveProfile = async () => {
    if (!currentUser) return;
    if (form.phone && !PHONE_REGEX.test(form.phone)) {
      const err = 'Format invalide. Ex: +216 12 345 678';
      setPhoneError(err);
      return;
    }
    setPhoneError(null);
    try {
      await updateProfileMutation.mutateAsync({
        fullName: form.fullName, companyName: form.companyName,
        phone: form.phone, address: form.address, bio: form.bio,
      } as UpdateProfileRequest);
      toast.success(t('profile.profileUpdated'));
      setIsDirty(false);
    } catch {
      toast.error('Failed to update profile. Please try again.');
    }
  };

  const handlePhotoUpload = async () => {
    if (!photoFile || !currentUser) return;
    if (photoFile.size > MAX_UPLOAD_FILE_SIZE_BYTES) {
      toast.error(`Photo must be ${MAX_UPLOAD_FILE_SIZE_LABEL} or smaller.`);
      return;
    }
    try {
      await uploadPictureMutation.mutateAsync(photoFile);
      setPhotoFile(null);
      toast.success('Profile picture updated!');
    } catch {
      toast.error('Failed to upload profile picture.');
    }
  };

  const quizLevelResults = quizHistory?.quizLevelResults ?? [];
  const track = (currentUser as any)?.track as string | undefined;
  const trackStyle = track ? TRACK_STYLES[track] : null;
  const avatarSrc = photoPreviewUrl || currentUser?.profilePicture || null;
  const initials = currentUser?.fullName
    ? currentUser.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : currentUser?.email?.[0]?.toUpperCase() ?? 'U';

  /* ── loading ── */
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-violet-600" />
          <p className="text-sm text-slate-500">Loading profile...</p>
        </div>
      </div>
    );
  }
  if (!currentUser) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-slate-500">Please log in to view your profile.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Page header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">{t('profile.title')}</h1>
          <p className="mt-0.5 text-sm text-slate-500">{t('profile.personalInfo')}</p>
        </div>
        <div className="flex items-center gap-2">
          {photoFile && (
            <button
              type="button"
              onClick={handlePhotoUpload}
              disabled={uploadPictureMutation.isPending}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
            >
              {uploadPictureMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
              Upload Photo
            </button>
          )}
          <button
            type="button"
            onClick={handleSaveProfile}
            disabled={updateProfileMutation.isPending || !isDirty}
            className="inline-flex h-10 items-center gap-2 rounded-xl px-5 text-sm font-bold text-white shadow-sm transition-all disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #c026d3 0%, #7c3aed 100%)' }}
          >
            {updateProfileMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {t('common.save')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ── Sidebar ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-4 lg:col-span-1"
        >
          {/* Avatar card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            {/* Avatar */}
            <div className="flex flex-col items-center text-center">
              <div className="relative">
                <div
                  className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl text-2xl font-black text-white shadow-md"
                  style={{ background: 'linear-gradient(135deg, #c026d3, #7c3aed, #4f46e5)' }}
                >
                  {avatarSrc ? (
                    <Image src={avatarSrc} alt="Profile" width={80} height={80} className="h-full w-full object-cover" unoptimized />
                  ) : (
                    initials
                  )}
                </div>
                <label
                  htmlFor={photoInputId}
                  className="absolute -bottom-2 -right-2 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-violet-600 shadow-md transition hover:bg-violet-700"
                  title="Change photo"
                >
                  <Camera className="h-3.5 w-3.5 text-white" />
                </label>
                <input
                  id={photoInputId}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    if (file && file.size > MAX_UPLOAD_FILE_SIZE_BYTES) {
                      toast.error(`Photo must be ${MAX_UPLOAD_FILE_SIZE_LABEL} or smaller.`);
                      e.target.value = '';
                      return;
                    }
                    setPhotoFile(file);
                  }}
                />
              </div>

              <h2 className="mt-4 text-lg font-black text-slate-900">
                {currentUser.fullName || currentUser.email}
              </h2>
              <p className="text-sm text-slate-500 capitalize">
                {currentUser.role ? t(`roles.${currentUser.role}`) : t('roles.student')}
              </p>

              {/* Track badge */}
              {trackStyle && (
                <span className={`mt-2 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${trackStyle.class}`}>
                  {trackStyle.label}
                </span>
              )}

              <p className="mt-2 text-xs text-slate-400">
                {t('common.joined')} {new Date(currentUser.createdAt).toLocaleDateString()}
              </p>
            </div>

            {/* Quick info */}
            <div className="mt-5 space-y-3 border-t border-slate-100 pt-5">
              {[
                { icon: Mail, value: currentUser.email },
                { icon: Building2, value: form.companyName, placeholder: 'Company' },
                { icon: Phone, value: form.phone, placeholder: '+00 000 000 000' },
                { icon: MapPin, value: form.address, placeholder: 'Location' },
              ].map(({ icon: Icon, value, placeholder }, i) => (
                <div key={i} className={`flex items-center gap-2.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <Icon className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className={`truncate text-sm ${value ? 'text-slate-700' : 'text-slate-400 italic'}`}>
                    {value || placeholder}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Assessment card */}
          {latestAssessment ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50">
                  <BarChart3 className="h-4 w-4 text-violet-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Profil Assessment</h3>
                  <p className="text-xs text-slate-400">
                    {new Date(latestAssessment.completedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Primary profile badge */}
              <div
                className="mb-4 rounded-xl px-3 py-2 text-center text-sm font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #c026d3 0%, #7c3aed 100%)' }}
              >
                {latestAssessment.primaryProfile}
              </div>

              {/* Score bars */}
              <div className="space-y-3">
                {SCORE_BAR_CONFIGS.map(({ key, label, color, icon: Icon }) => (
                  <ScoreBar
                    key={key}
                    label={label}
                    value={(latestAssessment.scores as any)[key] ?? 0}
                    color={color}
                    Icon={Icon}
                  />
                ))}
              </div>

              {/* Hybrid profiles */}
              {latestAssessment.hybridProfiles?.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {latestAssessment.hybridProfiles.map((p: string) => (
                    <span key={p} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                      {p}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50">
                  <BarChart3 className="h-4 w-4 text-violet-600" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Profil Assessment</h3>
              </div>
              <p className="mt-3 text-sm text-slate-400">Aucun assessment complété.</p>
            </div>
          )}
        </motion.div>

        {/* ── Main content ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-5 lg:col-span-2"
        >
          {/* ── Edit form ── */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            {/* Section: Personal */}
            <div className="px-6 pt-6">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-fuchsia-50">
                  <UserIcon className="h-4 w-4 text-fuchsia-600" />
                </div>
                <h2 className="text-base font-bold text-slate-900">{t('profile.personalInfo')}</h2>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <InputField
                  id="fullName"
                  label={t('common.fullName') || 'Full name'}
                  value={form.fullName}
                  onChange={onChange('fullName')}
                  placeholder="Enter your full name"
                  autoComplete="name"
                />
                <InputField
                  id="email"
                  label={t('auth.email') || 'Email'}
                  type="email"
                  value={form.email}
                  disabled
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="mx-6 my-5 border-t border-slate-100" />

            {/* Section: Contact */}
            <div className="px-6">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50">
                  <Phone className="h-4 w-4 text-sky-600" />
                </div>
                <h2 className="text-base font-bold text-slate-900">{t('profile.professionalInfo')}</h2>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <InputField
                  id="phone"
                  label={t('common.phone') || 'Phone'}
                  type="tel"
                  value={form.phone}
                  onChange={(e) => { onChange('phone')(e); if (phoneError) setPhoneError(null); }}
                  placeholder="+216 12 345 678"
                  error={phoneError}
                  autoComplete="tel"
                />
                <InputField
                  id="companyName"
                  label={t('common.name') || 'Company name'}
                  value={form.companyName}
                  onChange={onChange('companyName')}
                  placeholder="Your company"
                  autoComplete="organization"
                />
                <div className="sm:col-span-2">
                  <InputField
                    id="address"
                    label={t('common.address') || 'Address'}
                    value={form.address}
                    onChange={onChange('address')}
                    placeholder="Your location"
                    autoComplete="street-address"
                  />
                </div>
              </div>
            </div>

            <div className="mx-6 my-5 border-t border-slate-100" />

            {/* Section: Bio */}
            <div className="px-6">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
                  <Cpu className="h-4 w-4 text-emerald-600" />
                </div>
                <h2 className="text-base font-bold text-slate-900">{t('profile.bio')}</h2>
              </div>
              <div className="mt-4">
                <label htmlFor="bio" className="block text-sm font-medium text-slate-700">
                  {t('profile.bio')}
                </label>
                <textarea
                  id="bio"
                  value={form.bio}
                  onChange={onChange('bio')}
                  placeholder="Tell us about yourself, your goals, your experience..."
                  className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                  rows={4}
                />
              </div>
            </div>

            {/* Form actions */}
            <div className={`flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button
                type="button"
                onClick={() => { setForm(buildForm(currentUser)); setPhotoFile(null); setIsDirty(false); }}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={updateProfileMutation.isPending || !isDirty}
                className="inline-flex h-10 items-center gap-2 rounded-xl px-5 text-sm font-bold text-white shadow-sm transition-all disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #c026d3 0%, #7c3aed 100%)' }}
              >
                {updateProfileMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                {t('common.save')}
              </button>
            </div>
          </div>

          {/* ── Quiz history ── */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
                <BarChart3 className="h-4 w-4 text-amber-600" />
              </div>
              <h2 className="text-base font-bold text-slate-900">Résultats des quizs de niveau</h2>
            </div>

            {quizLevelResults.length > 0 ? (
              <div className="space-y-3">
                {quizLevelResults.map((result) => {
                  const domainStyle = DOMAIN_STYLES[result.domain?.toLowerCase()] ?? { bg: '#8b5cf6', text: result.domain };
                  const levelColors: Record<string, string> = {
                    Expert: 'bg-violet-100 text-violet-700',
                    Intermédiaire: 'bg-blue-100 text-blue-700',
                    Débutant: 'bg-emerald-100 text-emerald-700',
                  };
                  return (
                    <div
                      key={result.id}
                      className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4"
                    >
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-black text-white"
                        style={{ background: domainStyle.bg }}
                      >
                        {domainStyle.text.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-bold text-slate-900 capitalize">{result.domain}</span>
                          <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${levelColors[result.level] ?? 'bg-slate-100 text-slate-600'}`}>
                            {result.level}
                          </span>
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${result.score.percentage}%`, background: domainStyle.bg }}
                          />
                        </div>
                        <p className="mt-1 text-xs text-slate-400">
                          {result.score.score}/{result.score.total} · {result.score.percentage}% ·{' '}
                          {new Date(result.completedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center">
                <BarChart3 className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-2 text-sm text-slate-400">Aucun quiz de niveau complété.</p>
              </div>
            )}
          </div>

          {/* ── Provider credentials ── */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                  <KeyRound className="h-4 w-4 text-slate-600" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Provider credentials</h2>
                  <p className="text-xs text-slate-400">Lab access credentials — keep private.</p>
                </div>
              </div>
            </div>

            {providerCredentials.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center">
                <KeyRound className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-2 text-sm text-slate-400">
                  {t('learnerProfile.noProviderCredentials')}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {providerCredentials.map((cred) => {
                  const secretKey = `${cred.providerId}-secretAccessKey`;
                  const isSecretVisible = Boolean(revealedSecrets[secretKey]);
                  const copy = async (val: string) => {
                    try { await navigator.clipboard.writeText(val); toast.success('Copied!'); } catch {}
                  };

                  return (
                    <div key={cred.providerId} className="rounded-xl border border-slate-200 p-4">
                      <p className="mb-3 text-sm font-semibold text-slate-900">{cred.providerLabel}</p>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {[
                          { label: 'Username', value: cred.username },
                          { label: 'Access key', value: cred.accessKeyId },
                        ].map(({ label, value }) => (
                          <div key={label}>
                            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
                            <div className="flex gap-2">
                              <input
                                value={value}
                                readOnly
                                className="h-9 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-600"
                              />
                              <button type="button" onClick={() => void copy(value)}
                                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white transition hover:bg-slate-50">
                                <Copy className="h-3.5 w-3.5 text-slate-400" />
                              </button>
                            </div>
                          </div>
                        ))}
                        <div className="sm:col-span-2">
                          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Secret key</p>
                          <div className="flex gap-2">
                            <input
                              value={cred.secretAccessKey}
                              readOnly
                              type={isSecretVisible ? 'text' : 'password'}
                              className="h-9 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-600"
                            />
                            <button type="button"
                              onClick={() => setRevealedSecrets((p) => ({ ...p, [secretKey]: !p[secretKey] }))}
                              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white transition hover:bg-slate-50">
                              {isSecretVisible ? <EyeOff className="h-3.5 w-3.5 text-slate-400" /> : <Eye className="h-3.5 w-3.5 text-slate-400" />}
                            </button>
                            <button type="button" onClick={() => void copy(cred.secretAccessKey)}
                              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white transition hover:bg-slate-50">
                              <Copy className="h-3.5 w-3.5 text-slate-400" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
