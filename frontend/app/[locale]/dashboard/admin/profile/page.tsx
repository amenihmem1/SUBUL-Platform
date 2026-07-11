'use client';

import { useEffect, useId, useState, type ChangeEvent, type ElementType } from 'react';
import {
  Building2, Mail, MapPin, Phone, User as UserIcon,
  Shield, Save, RotateCcw, Camera
} from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/LanguageContext';
import { useCurrentUser, useUpdateProfile, useUploadProfilePicture } from '@/hooks/api/useUsers';
import type { User } from '@/services/user';
import { MAX_UPLOAD_FILE_SIZE_BYTES, MAX_UPLOAD_FILE_SIZE_LABEL } from '@/lib/upload.constants';

type ProfileForm = {
  fullName: string;
  email: string;
  companyName: string;
  phone: string;
  address: string;
  bio: string;
};

const buildForm = (user: User): ProfileForm => ({
  fullName: user.fullName || '',
  email: user.email,
  companyName: (user as unknown as Record<string, unknown>).companyName as string || '',
  phone: (user as unknown as Record<string, unknown>).phone as string || '',
  address: (user as unknown as Record<string, unknown>).address as string || '',
  bio: (user as unknown as Record<string, unknown>).bio as string || '',
});

function AdminProfileInput({
  icon: Icon,
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  disabled = false,
}: {
  icon: ElementType;
  label: string;
  value: string;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
      <div className={`flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 transition focus-within:ring-2 focus-within:ring-blue-500 ${
        disabled ? 'bg-slate-50 text-slate-400' : 'bg-white'
      }`}>
        <Icon className="h-4 w-4 shrink-0 text-slate-400" />
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          className="h-full min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 disabled:text-slate-400"
        />
      </div>
    </div>
  );
}

export default function AdminProfilePage() {
  const { t } = useTranslation();
  const photoInputId = useId();

  const { data: currentUser = null, isLoading: loading } = useCurrentUser();
  const updateProfileMutation = useUpdateProfile();
  const uploadPictureMutation = useUploadProfilePicture();
  const [form, setForm] = useState<ProfileForm>({
    fullName: '', email: '', companyName: '', phone: '', address: '', bio: '',
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    type === 'success' ? toast.success(message) : toast.error(message);
  };

  useEffect(() => {
    if (currentUser) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm(buildForm(currentUser));
    }
  }, [currentUser]);

  useEffect(() => {
    if (!photoFile) { 
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPhotoPreviewUrl(null); 
      return; 
    }
    const url = URL.createObjectURL(photoFile);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPhotoPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  const onChange =
    (key: keyof ProfileForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSave = async () => {
    if (!currentUser) return;
    try {
      if (photoFile) {
        await uploadPictureMutation.mutateAsync(photoFile);
        setPhotoFile(null);
      }
      await updateProfileMutation.mutateAsync({
        fullName: form.fullName,
        companyName: form.companyName,
        phone: form.phone,
        address: form.address,
        bio: form.bio,
      });
      showToast('Profile updated successfully!', 'success');
    } catch {
      showToast('Failed to update profile. Please try again.', 'error');
    }
  };

  const handleReset = () => {
    if (currentUser) {
      setForm(buildForm(currentUser));
      setPhotoFile(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        Please log in to view your profile.
      </div>
    );
  }

  const avatarInitials = (currentUser.fullName || currentUser.email)
    .split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-600" />
            {t('common.profile')}
          </h1>
          <p className="text-slate-500 text-sm mt-1">Manage your admin account information</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <RotateCcw className="w-4 h-4" /> Reset
          </button>
          <button
            onClick={handleSave}
            disabled={updateProfileMutation.isPending || uploadPictureMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            <Save className="w-4 h-4" />
            {updateProfileMutation.isPending || uploadPictureMutation.isPending ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left — Avatar card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex flex-col items-center text-center gap-4">
            {/* Avatar */}
            <div className="relative">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-bold text-2xl overflow-hidden">
                {(photoPreviewUrl || currentUser.profilePicture) ? (
                  <Image
                    src={photoPreviewUrl || currentUser.profilePicture || ''}
                    alt="Profile"
                    width={96}
                    height={96}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                ) : (
                  avatarInitials
                )}
              </div>
              <label
                htmlFor={photoInputId}
                className="absolute -bottom-2 -right-2 w-8 h-8 bg-primary rounded-full flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors shadow-md"
                title="Change photo"
              >
                <Camera className="w-4 h-4 text-white" />
              </label>
              <input
                id={photoInputId}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  if (file && file.size > MAX_UPLOAD_FILE_SIZE_BYTES) {
                    showToast(`Photo must be ${MAX_UPLOAD_FILE_SIZE_LABEL} or smaller.`, 'error');
                    e.target.value = '';
                    return;
                  }
                  setPhotoFile(file);
                }}
              />
            </div>

            <div>
              <p className="font-semibold text-slate-900 text-lg">{currentUser.fullName || currentUser.email}</p>
              <span className="inline-block mt-1 px-2.5 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded-full capitalize">
                {currentUser.role || 'admin'}
              </span>
            </div>

            <div className="w-full space-y-2 text-sm text-left pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2 text-slate-600">
                <Mail className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{currentUser.email}</span>
              </div>
              {form.phone && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Phone className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{form.phone}</span>
                </div>
              )}
              {form.companyName && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Building2 className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{form.companyName}</span>
                </div>
              )}
              {form.address && (
                <div className="flex items-center gap-2 text-slate-600">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{form.address}</span>
                </div>
              )}
            </div>

            <div className="w-full text-xs text-slate-400 text-left border-t border-slate-100 pt-2">
              <p>Member since {new Date(currentUser.createdAt).toLocaleDateString()}</p>
              {currentUser.lastLogin && (
                <p className="mt-1">Last login: {new Date(currentUser.lastLogin).toLocaleDateString()}</p>
              )}
            </div>
          </div>
        </div>

        {/* Right — Form */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="font-semibold text-slate-900 mb-5 flex items-center gap-2">
              <UserIcon className="w-4 h-4 text-slate-500" /> Personal information
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <AdminProfileInput
                icon={UserIcon}
                label="Full name"
                value={form.fullName}
                onChange={onChange('fullName')}
                placeholder="Enter your full name"
              />

              <AdminProfileInput
                icon={Mail}
                label="Email"
                type="email"
                value={form.email}
                disabled
              />

              <AdminProfileInput
                icon={Building2}
                label="Company"
                value={form.companyName}
                onChange={onChange('companyName')}
                placeholder="Your organization"
              />

              <AdminProfileInput
                icon={Phone}
                label="Phone"
                value={form.phone}
                onChange={onChange('phone')}
                placeholder="+00 000 000 000"
              />

              <div className="sm:col-span-2">
                <AdminProfileInput
                  icon={MapPin}
                  label="Address"
                  value={form.address}
                  onChange={onChange('address')}
                  placeholder="Your address"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Bio</label>
                <div className="relative">
                  <Shield className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                  <textarea
                    value={form.bio}
                    onChange={onChange('bio')}
                    rows={4}
                    placeholder="A short description about yourself"
                    className="w-full resize-none rounded-lg border border-slate-200 py-2 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Account info (read-only) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-slate-500" /> Account details
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Role</p>
                <p className="font-semibold text-slate-900 capitalize">{currentUser.role || 'admin'}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Status</p>
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                  currentUser.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
                }`}>
                  {currentUser.status || 'active'}
                </span>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Email verified</p>
                <p className="font-semibold text-slate-900">{currentUser.isEmailVerified ? 'Yes' : 'No'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
