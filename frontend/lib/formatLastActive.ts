type TFunction = (key: string, opts?: { count?: number }) => string | string[];

export function formatLastActive(
  activityDate: string | undefined | null,
  t: TFunction
): string {
  const translate = (key: string, opts?: { count?: number }) =>
    String(t(key, opts));

  if (!activityDate) return translate('adminDashboard.lastActive.never');
  const diff = Date.now() - new Date(activityDate).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 60) return translate('adminDashboard.lastActive.minutes', { count: mins });
  if (hours < 24) return translate('adminDashboard.lastActive.hours', { count: hours });
  return translate('adminDashboard.lastActive.days', { count: days });
}
