'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Building2, Mail, Phone, MapPin, Globe,
  Save, Bell, Shield, Upload, ImageIcon, Trash2
} from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui';
import { Badge } from '@/components/ui';
import { useToast } from '@/components/ui';
import { useConfirmDialog } from '@/components/ui';
import { useEmployerCompany, useUpdateEmployerCompany } from '@/hooks/api/useEmployer';
import { useTranslation } from '@/contexts/LanguageContext';

export default function EmployerSettingsPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState('entreprise');

  const { data: company, isLoading } = useEmployerCompany();
  const updateMutation = useUpdateEmployerCompany();

  const [companyInfo, setCompanyInfo] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    website: '',
    secteur: '',
    taille: '50-100 employés',
    description: '',
  });

  useEffect(() => {
    if (company) {
      setCompanyInfo((prev) => ({
        ...prev,
        name: company.name ?? '',
        email: company.email ?? '',
        secteur: company.sector ?? '',
        phone: typeof company.phone === 'string' ? company.phone : '',
        address: typeof company.location === 'string' ? company.location : '',
        website: typeof company.website === 'string' ? company.website : '',
        taille: typeof company.companySize === 'string' ? company.companySize : prev.taille,
        description: typeof company.description === 'string' ? company.description : '',
      }));
    }
  }, [company]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const result = ev.target?.result as string;
      try {
        await updateMutation.mutateAsync({ logo: result });
        showToast(String(t('employerSettings.logoUpdated')), 'success');
      } catch (err) {
        console.error(err);
        showToast(String(t('employerSettings.logoUpdateError')), 'error');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    confirm({
      title: String(t('employerSettings.removeLogoTitle')),
      message: String(t('employerSettings.removeLogoMessage')),
      confirmLabel: String(t('employerSettings.removeLogoConfirm')),
      cancelLabel: String(t('employerSettings.removeLogoCancel')),
      onConfirm: async () => {
        try {
          await updateMutation.mutateAsync({ logo: null });
          if (fileInputRef.current) fileInputRef.current.value = '';
          showToast(String(t('employerSettings.logoRemoved')), 'info');
        } catch (err) {
          console.error(err);
        }
      },
    });
  };

  const handleSaveCompanyInfo = async () => {
    try {
      await updateMutation.mutateAsync({
        name: companyInfo.name,
        email: companyInfo.email,
        sector: companyInfo.secteur || undefined,
        phone: companyInfo.phone || undefined,
        location: companyInfo.address || undefined,
        website: companyInfo.website || undefined,
        companySize: companyInfo.taille || undefined,
        description: companyInfo.description || undefined,
      });
      showToast(String(t('employerSettings.companySaved')), 'success');
    } catch (err) {
      console.error(err);
      showToast(String(t('employerSettings.saveError')), 'error');
    }
  };

  const [notifications, setNotifications] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('employer-notification-prefs');
      if (saved) {
        try { return JSON.parse(saved); } catch {}
      }
    }
    return {
      newCandidature: true,
      interviewReminder: true,
      candidateStatusChange: true,
      weeklyReport: false,
      employeeProgress: true,
    };
  });

  const tabs = [
    { id: 'entreprise', label: String(t('employerSettings.tabs.company')), icon: Building2 },
    { id: 'notifications', label: String(t('employerSettings.tabs.notifications')), icon: Bell },
    { id: 'securite', label: String(t('employerSettings.tabs.security')), icon: Shield },
  ];

  return (
    <div className="w-full space-y-6">
      {ConfirmDialogComponent}
      <div>
        <h1 className="text-3xl font-black text-slate-900">{String(t('employerSettings.title'))}</h1>
        <p className="text-slate-600 mt-1">{String(t('employerSettings.subtitle'))}</p>
      </div>

      <div className="flex space-x-1 border-b border-slate-200">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-violet-50 text-violet-600 border-b-2 border-violet-600'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'entreprise' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-6">{String(t('employerSettings.companyInfoTitle'))}</h2>

          <div className="mb-8 p-4 bg-slate-50 rounded-lg">
            <label className="block text-sm font-medium text-slate-700 mb-3">{String(t('employerSettings.companyLogo'))}</label>
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center bg-white overflow-hidden">
                {company?.logo ? (
                  <Image src={company.logo} alt={String(t('employerSettings.logoAlt'))} width={96} height={96} className="w-full h-full object-contain" />
                ) : (
                  <ImageIcon className="w-10 h-10 text-slate-300" />
                )}
              </div>
              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2"
                >
                  <Upload size={16} />
                  {company?.logo ? String(t('employerSettings.changeLogo')) : String(t('employerSettings.addLogo'))}
                </Button>
                {company?.logo && (
                  <Button
                    variant="outline"
                    onClick={handleRemoveLogo}
                    className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 size={16} />
                    {String(t('common.delete'))}
                  </Button>
                )}
                <p className="text-xs text-slate-400">{String(t('employerSettings.logoHint'))}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{String(t('employerSettings.companyName'))}</label>
              <input
                type="text"
                value={companyInfo.name}
                onChange={(e) => setCompanyInfo({ ...companyInfo, name: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-violet-300 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{String(t('common.email'))}</label>
              <input
                type="email"
                value={companyInfo.email}
                onChange={(e) => setCompanyInfo({ ...companyInfo, email: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-violet-300 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{String(t('common.phone'))}</label>
              <input
                type="text"
                value={companyInfo.phone}
                onChange={(e) => setCompanyInfo({ ...companyInfo, phone: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-violet-300 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{String(t('common.address'))}</label>
              <input
                type="text"
                value={companyInfo.address}
                onChange={(e) => setCompanyInfo({ ...companyInfo, address: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-violet-300 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{String(t('employerSettings.website'))}</label>
              <input
                type="text"
                value={companyInfo.website}
                onChange={(e) => setCompanyInfo({ ...companyInfo, website: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-violet-300 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{String(t('employerSettings.sector'))}</label>
              <input
                type="text"
                value={companyInfo.secteur}
                onChange={(e) => setCompanyInfo({ ...companyInfo, secteur: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-violet-300 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{String(t('employerSettings.companySize'))}</label>
              <select
                value={companyInfo.taille}
                onChange={(e) => setCompanyInfo({ ...companyInfo, taille: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-violet-300 outline-none"
              >
                <option>{String(t('employerSettings.size.1_10'))}</option>
                <option>{String(t('employerSettings.size.11_50'))}</option>
                <option>{String(t('employerSettings.size.50_100'))}</option>
                <option>{String(t('employerSettings.size.100_500'))}</option>
                <option>{String(t('employerSettings.size.500_plus'))}</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">{String(t('common.description'))}</label>
              <textarea
                value={companyInfo.description}
                onChange={(e) => setCompanyInfo({ ...companyInfo, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-violet-300 outline-none resize-none"
              />
            </div>
          </div>
          <div className="flex justify-end mt-6">
            <Button onClick={handleSaveCompanyInfo} className="bg-violet-600 hover:bg-violet-700 text-white flex items-center gap-2">
              <Save size={18} />
              {String(t('common.save'))}
            </Button>
          </div>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-6">{String(t('employerSettings.notificationsTitle'))}</h2>
          <div className="space-y-4">
            {[
              { key: 'newCandidature', label: String(t('employerSettings.notifications.newApplication.label')), desc: String(t('employerSettings.notifications.newApplication.desc')) },
              { key: 'interviewReminder', label: String(t('employerSettings.notifications.interviewReminder.label')), desc: String(t('employerSettings.notifications.interviewReminder.desc')) },
              { key: 'candidateStatusChange', label: String(t('employerSettings.notifications.statusChange.label')), desc: String(t('employerSettings.notifications.statusChange.desc')) },
              { key: 'weeklyReport', label: String(t('employerSettings.notifications.weeklyReport.label')), desc: String(t('employerSettings.notifications.weeklyReport.desc')) },
              { key: 'employeeProgress', label: String(t('employerSettings.notifications.employeeProgress.label')), desc: String(t('employerSettings.notifications.employeeProgress.desc')) },
            ].map((notif) => (
              <div key={notif.key} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                  <p className="font-medium text-slate-900">{notif.label}</p>
                  <p className="text-sm text-slate-500">{notif.desc}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifications[notif.key as keyof typeof notifications]}
                    onChange={(e) => setNotifications({ ...notifications, [notif.key]: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:ring-2 peer-focus:ring-violet-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600"></div>
                </label>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-4 italic">
            {String(t('employerSettings.notificationsLocalNote'))}
          </p>
          <div className="flex justify-end mt-4">
            <Button onClick={() => {
              localStorage.setItem('employer-notification-prefs', JSON.stringify(notifications));
              showToast(String(t('employerSettings.notificationsSaved')), 'success');
            }} className="bg-violet-600 hover:bg-violet-700 text-white flex items-center gap-2">
              <Save size={18} />
              {String(t('common.save'))}
            </Button>
          </div>
        </div>
      )}

      {activeTab === 'securite' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-6">{String(t('employerSettings.securityTitle'))}</h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-medium text-slate-900 mb-3">{String(t('employerSettings.changePassword'))}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{String(t('employerSettings.currentPassword'))}</label>
                  <input
                    type="password"
                    className="w-full px-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-violet-300 outline-none"
                    placeholder="••••••••"
                  />
                </div>
                <div></div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{String(t('employerSettings.newPassword'))}</label>
                  <input
                    type="password"
                    className="w-full px-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-violet-300 outline-none"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{String(t('employerSettings.confirmPassword'))}</label>
                  <input
                    type="password"
                    className="w-full px-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-violet-300 outline-none"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div>
                <p className="font-medium text-slate-900">{String(t('employerSettings.twoFactor'))}</p>
                <p className="text-sm text-slate-500">{String(t('employerSettings.twoFactorDesc'))}</p>
              </div>
              <Badge className="bg-red-100 text-red-700">{String(t('employerSettings.disabled'))}</Badge>
            </div>
          </div>
          <div className="flex justify-end mt-6">
            <Button onClick={() => showToast(String(t('employerSettings.securitySaved')), 'success')} className="bg-violet-600 hover:bg-violet-700 text-white flex items-center gap-2">
              <Save size={18} />
              {String(t('common.save'))}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
