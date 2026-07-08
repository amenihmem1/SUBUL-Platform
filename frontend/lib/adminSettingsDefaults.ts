/**
 * Default values for admin settings. Used when no persisted settings exist.
 * Replace with API load when GET /api/admin/settings is implemented.
 */
export type AdminSettingsState = {
  general: {
    platformName: string;
    tagline: string;
    supportEmail: string;
    defaultLanguage: string;
    timezone: string;
    maintenanceMode: boolean;
  };
  notifications: {
    newUserNotification: boolean;
    courseCompletionNotification: boolean;
    paymentNotification: boolean;
    feedbackNotification: boolean;
    weeklyReportEmail: boolean;
    marketingEmails: boolean;
  };
  security: {
    twoFactorAuth: boolean;
    sessionTimeout: string;
    maxLoginAttempts: string;
    passwordMinLength: string;
    requireSpecialChar: boolean;
    ipWhitelist: string;
  };
  payment: {
    currency: string;
    stripePublicKey: string;
    stripeSecretKey: string;
    paypalClientId: string;
    enableTestMode: boolean;
    taxRate: string;
  };
  api: {
    apiEnabled: boolean;
    rateLimitPerMinute: string;
    webhookUrl: string;
    apiVersion: string;
  };
};

export const DEFAULT_ADMIN_SETTINGS: AdminSettingsState = {
  general: {
    platformName: 'SUBUL',
    tagline: 'Plateforme de formation professionnelle',
    supportEmail: 'support@subul.com',
    defaultLanguage: 'fr',
    timezone: 'Europe/Paris',
    maintenanceMode: false,
  },
  notifications: {
    newUserNotification: true,
    courseCompletionNotification: true,
    paymentNotification: true,
    feedbackNotification: true,
    weeklyReportEmail: true,
    marketingEmails: false,
  },
  security: {
    twoFactorAuth: true,
    sessionTimeout: '30',
    maxLoginAttempts: '5',
    passwordMinLength: '8',
    requireSpecialChar: true,
    ipWhitelist: '',
  },
  payment: {
    currency: 'TND',
    stripePublicKey: 'pk_live_••••••••••••',
    stripeSecretKey: 'sk_live_••••••••••••',
    paypalClientId: 'client_••••••••••••',
    enableTestMode: false,
    taxRate: '20',
  },
  api: {
    apiEnabled: true,
    rateLimitPerMinute: '60',
    webhookUrl: 'https://subul.com/api/webhook',
    apiVersion: 'v1',
  },
};
