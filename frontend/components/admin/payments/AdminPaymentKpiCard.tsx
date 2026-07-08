'use client';

import { motion } from 'framer-motion';
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from 'lucide-react';

type Trend = 'up' | 'down';

export function AdminPaymentKpiCard(props: {
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  color: string;
  trend?: Trend;
  change?: string;
  index?: number;
}) {
  const {
    label,
    value,
    sub,
    icon: Icon,
    color,
    trend = 'up',
    change = '',
    index = 0,
  } = props;

  return (
    <motion.div
      className="bg-card rounded-2xl p-6 border border-border shadow-sm"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
        <span
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
            trend === 'up' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-500/10 text-slate-600'
          }`}
        >
          {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {change}
        </span>
      </div>
      <h3 className="text-lg font-extrabold tracking-tight text-foreground break-words">{value}</h3>
      <p className="text-slate-500 text-sm mt-1">{label}</p>
      {sub ? <p className="text-xs text-slate-400 mt-1">{sub}</p> : null}
    </motion.div>
  );
}
