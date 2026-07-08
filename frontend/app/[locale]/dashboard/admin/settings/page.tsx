'use client';

import { useState } from 'react';
import {
  Settings, Globe, Mail, Bell, Shield, CreditCard, Code,
  Save, RotateCcw, Check, Eye, EyeOff, Upload, Trash2
} from 'lucide-react';
import { Badge } from '@/components/ui';
import { Button } from '@/components/ui';
import { useTranslation } from '@/contexts/LanguageContext';
import { DEFAULT_ADMIN_SETTINGS, type AdminSettingsState } from '@/lib/adminSettingsDefaults';
import { getAdminUiSettings, setAdminUiSettings } from '@/lib/adminUiSettings';

function cloneDefaultSettings(): AdminSettingsState {
  return JSON.parse(JSON.stringify(DEFAULT_ADMIN_SETTINGS)) as AdminSettingsState;
}

function loadSettingsFromStorage(): AdminSettingsState {
  const next = cloneDefaultSettings();
  const ui = getAdminUiSettings();
  if (ui.panels?.general) {
    next.general = { ...next.general, ...(ui.panels.general as Partial<AdminSettingsState['general']>) };
  }
  if (ui.panels?.notifications) {
    next.notifications = {
      ...next.notifications,
      ...(ui.panels.notifications as Partial<AdminSettingsState['notifications']>),
    };
  }
  if (ui.panels?.security) {
    next.security = { ...next.security, ...(ui.panels.security as Partial<AdminSettingsState['security']>) };
  }
  if (ui.panels?.payment) {
    next.payment = { ...next.payment, ...(ui.panels.payment as Partial<AdminSettingsState['payment']>) };
  }
  next.payment.currency = ui.paymentCurrency || next.payment.currency;
  return next;
}

export default function SettingsPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('general');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [saved, setSaved] = useState(false);

  const [settings, setSettings] = useState(() => loadSettingsFromStorage());

  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});

  const tabs = [
    { id: 'general', label: t('settings.general'), icon: Globe },
    { id: 'notifications', label: t('settings.notifications'), icon: Bell },
    { id: 'security', label: t('settings.security'), icon: Shield },
    { id: 'payment', label: t('settings.payment'), icon: CreditCard },
  ];

  const handleSave = () => {
    setAdminUiSettings({
      paymentCurrency: settings.payment.currency,
      panels: {
        general: { ...settings.general },
        notifications: { ...settings.notifications },
        security: { ...settings.security },
        payment: { ...settings.payment },
      },
    });
    setSaved(true);
    setShowSaveModal(false);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = () => {
    setSettings(loadSettingsFromStorage());
    setShowResetModal(false);
  };

  const updateSetting = (category: string, key: string, value: string | boolean) => {
    setSettings((prev: AdminSettingsState) => ({
      ...prev,
      [category]: {
        ...prev[category as keyof AdminSettingsState],
        [key]: value,
      },
    }));
  };

  const togglePassword = (key: string) => {
    setShowPassword((prev: Record<string, boolean>) => ({ ...prev, [key]: !prev[key] }));
  };

  const renderGeneralSettings = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">{t('settings.platformName')}</label>
          <input
            type="text"
            value={settings.general.platformName}
            onChange={(e) => updateSetting('general', 'platformName', e.target.value)}
            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">{t('settings.tagline')}</label>
          <input
            type="text"
            value={settings.general.tagline}
            onChange={(e) => updateSetting('general', 'tagline', e.target.value)}
            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">{t('settings.supportEmail')}</label>
          <input
            type="email"
            value={settings.general.supportEmail}
            onChange={(e) => updateSetting('general', 'supportEmail', e.target.value)}
            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">{t('settings.defaultLanguage')}</label>
          <select
            value={settings.general.defaultLanguage}
            onChange={(e) => updateSetting('general', 'defaultLanguage', e.target.value)}
            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="fr">Français</option>
            <option value="en">English</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">{t('settings.timezone')}</label>
          <select
            value={settings.general.timezone}
            onChange={(e) => updateSetting('general', 'timezone', e.target.value)}
            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Europe/Paris">Europe/Paris (UTC+1)</option>
            <option value="Europe/London">Europe/London (UTC)</option>
            <option value="America/New_York">America/New_York (UTC-5)</option>
            <option value="Africa/Tunis">Africa/Tunis (UTC+1)</option>
          </select>
        </div>
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
          <div>
            <p className="font-medium text-slate-900">{t('settings.maintenanceMode')}</p>
            <p className="text-sm text-slate-600">{t('settings.maintenanceDesc')}</p>
          </div>
          <button
            onClick={() => updateSetting('general', 'maintenanceMode', !settings.general.maintenanceMode)}
            className={`relative w-12 h-6 rounded-full transition-colors ${settings.general.maintenanceMode ? 'bg-red-500' : 'bg-slate-300'}`}
          >
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.general.maintenanceMode ? 'translate-x-7' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>
    </div>
  );

  

  const renderNotificationSettings = () => (
    <div className="space-y-4">
      {[
        { key: 'newUserNotification', label: t('settings.newUser'), desc: t('settings.newUserDesc') },
        { key: 'courseCompletionNotification', label: t('settings.courseCompleted'), desc: t('settings.courseCompletedDesc') },
        { key: 'paymentNotification', label: t('settings.paymentReceived'), desc: t('settings.paymentReceivedDesc') },
        { key: 'feedbackNotification', label: t('settings.newFeedback'), desc: t('settings.newFeedbackDesc') },
        { key: 'weeklyReportEmail', label: t('settings.weeklyReport'), desc: t('settings.weeklyReportDesc') },
        { key: 'marketingEmails', label: t('settings.marketingEmails'), desc: t('settings.marketingEmailsDesc') },
      ].map(item => (
        <div key={item.key} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
          <div>
            <p className="font-medium text-slate-900">{item.label}</p>
            <p className="text-sm text-slate-600">{item.desc}</p>
          </div>
          <button
            onClick={() => updateSetting('notifications', item.key, !settings.notifications[item.key as keyof typeof settings.notifications])}
            className={`relative w-12 h-6 rounded-full transition-colors ${settings.notifications[item.key as keyof typeof settings.notifications] ? 'bg-primary' : 'bg-slate-300'}`}
          >
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.notifications[item.key as keyof typeof settings.notifications] ? 'translate-x-7' : 'translate-x-1'}`} />
          </button>
        </div>
      ))}
    </div>
  );

  const renderSecuritySettings = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">{t('settings.sessionTimeout')}</label>
          <input
            type="number"
            value={settings.security.sessionTimeout}
            onChange={(e) => updateSetting('security', 'sessionTimeout', e.target.value)}
            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">{t('settings.maxLoginAttempts')}</label>
          <input
            type="number"
            value={settings.security.maxLoginAttempts}
            onChange={(e) => updateSetting('security', 'maxLoginAttempts', e.target.value)}
            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">{t('settings.passwordMinLength')}</label>
          <input
            type="number"
            value={settings.security.passwordMinLength}
            onChange={(e) => updateSetting('security', 'passwordMinLength', e.target.value)}
            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">{t('settings.ipWhitelist')}</label>
          <input
            type="text"
            value={settings.security.ipWhitelist}
            onChange={(e) => updateSetting('security', 'ipWhitelist', e.target.value)}
            placeholder="192.168.1.1, 10.0.0.1"
            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
          <div>
            <p className="font-medium text-slate-900">{t('settings.twoFactorAuth')}</p>
            <p className="text-sm text-slate-600">{t('settings.twoFactorAuthDesc')}</p>
          </div>
          <button
            onClick={() => updateSetting('security', 'twoFactorAuth', !settings.security.twoFactorAuth)}
            className={`relative w-12 h-6 rounded-full transition-colors ${settings.security.twoFactorAuth ? 'bg-primary' : 'bg-slate-300'}`}
          >
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.security.twoFactorAuth ? 'translate-x-7' : 'translate-x-1'}`} />
          </button>
        </div>
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
          <div>
            <p className="font-medium text-slate-900">{t('settings.requireSpecialChar')}</p>
            <p className="text-sm text-slate-600">{t('settings.requireSpecialCharDesc')}</p>
          </div>
          <button
            onClick={() => updateSetting('security', 'requireSpecialChar', !settings.security.requireSpecialChar)}
            className={`relative w-12 h-6 rounded-full transition-colors ${settings.security.requireSpecialChar ? 'bg-primary' : 'bg-slate-300'}`}
          >
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.security.requireSpecialChar ? 'translate-x-7' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>
    </div>
  );

  const renderPaymentSettings = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">{t('settings.currency')}</label>
          <select
            value={settings.payment.currency}
            onChange={(e) => updateSetting('payment', 'currency', e.target.value)}
            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="EUR">EUR (€)</option>
            <option value="USD">USD ($)</option>
            <option value="TND">TND (د.ت)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">{t('settings.taxRate')}</label>
          <input
            type="number"
            value={settings.payment.taxRate}
            onChange={(e) => updateSetting('payment', 'taxRate', e.target.value)}
            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        
      </div>
     
    </div>
  );

  

  const renderContent = () => {
    switch (activeTab) {
      case 'general': return renderGeneralSettings();
      case 'notifications': return renderNotificationSettings();
      case 'security': return renderSecuritySettings();
      case 'payment': return renderPaymentSettings();
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{t('settings.title')}</h1>
          <p className="text-slate-600 mt-1">{t('settings.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowResetModal(true)}>
            <RotateCcw className="w-4 h-4 mr-2" /> {t('settings.reset')}
          </Button>
          <Button onClick={() => setShowSaveModal(true)} className="bg-primary hover:bg-primary/90">
            <Save className="w-4 h-4 mr-2" /> {t('settings.save')}
          </Button>
        </div>
      </div>

      {saved && (
        <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          <Check className="w-5 h-5" />
          <span>{t('settings.savedSuccess')}</span>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
     
        <div className="lg:w-64 flex-shrink-0">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary/10 text-primary'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

       
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-6">
            {tabs.find(t => t.id === activeTab)?.label}
          </h2>
          {renderContent()}
        </div>
      </div>

      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowSaveModal(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
            <h2 className="text-xl font-semibold mb-2">{t('settings.saveChanges')}</h2>
            <p className="text-slate-600 mb-6">
              {t('settings.saveConfirm')}
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowSaveModal(false)}>{t('common.cancel')}</Button>
              <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">{t('settings.save')}</Button>
            </div>
          </div>
        </div>
      )}

      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowResetModal(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
            <h2 className="text-xl font-semibold mb-2">{t('settings.resetSettings')}</h2>
            <p className="text-slate-600 mb-4">
              {t('settings.resetConfirm')}
            </p>
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
              <p className="text-red-700 text-sm">{t('settings.irreversible')}</p>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowResetModal(false)}>{t('common.cancel')}</Button>
              <Button onClick={handleReset} className="bg-red-600 hover:bg-red-700">{t('settings.reset')}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
