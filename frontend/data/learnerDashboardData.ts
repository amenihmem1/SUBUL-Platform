export const DOMAIN_CONFIG = {
  devops: { name: 'DevOps', icon: '⚙️' },
  ai: { name: 'IA', icon: '🤖' },
  cyber: { name: 'Cyber', icon: '🛡️' },
} as const;

export type StatColor = 'emerald' | 'indigo' | 'violet' | 'amber';

export const getStatBgClass = (color: StatColor) => {
  const map = {
    emerald: 'bg-success-muted text-success-text',
    indigo: 'bg-brand-light text-primary',
    violet: 'bg-secondary text-secondary-foreground',
    amber: 'bg-warning-muted text-warning-text',
  };
  return map[color] || 'bg-muted text-muted-foreground';
};
