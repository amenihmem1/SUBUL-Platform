'use client';

import { Button } from '@/components/ui';
import { Badge } from '@/components/ui';
import { Edit2 } from 'lucide-react';
import { UserData } from '@/app/[locale]/dashboard/admin/users/page';
import { useTranslation } from '@/contexts/LanguageContext';
import { formatLastActive } from '@/lib/formatLastActive';
interface ViewUserModalProps {
  user: UserData | null;
  onClose: () => void;
  onEdit: () => void;
  isOpen: boolean;
}

export default function ViewUserModal({ user, onClose, onEdit, isOpen }: ViewUserModalProps) {
  const { t } = useTranslation();
  
  if (!isOpen || !user) return null;

  const getRoleColor = (role: string): string => {
    switch (role) {
      case 'learner': return 'bg-primary/10 text-primary';
      case 'admin': return 'bg-purple-100 text-purple-700';
      case 'employer': return 'bg-orange-100 text-orange-700';
      case 'commercial': return 'bg-violet-100 text-violet-800';
      case 'instructor': return 'bg-indigo-100 text-indigo-700';
      case 'student': return 'bg-cyan-100 text-cyan-700';
      case 'university': return 'bg-emerald-100 text-emerald-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getRoleLabel = (role: string): string => {
    switch (role) {
      case 'learner': return String(t('users.learner'));
      case 'student': return String(t('users.student'));
      case 'admin': return String(t('users.admin'));
      case 'employer': return String(t('users.employer'));
      case 'instructor': return String(t('users.instructor'));
      case 'university': return String(t('roles.university') || 'University');
      case 'commercial': return String(t('users.commercial') || 'Commercial');
      default: return role || String(t('users.unknownRole') || 'Unknown role');
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'inactive': return 'bg-slate-100 text-slate-700';
      case 'suspended': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
            {user.avatar}
          </div>
          <div>
            <h2 className="text-xl font-semibold">{user.name}</h2>
            <p className="text-slate-600">{user.email}</p>
            <div className="flex gap-2 mt-2">
              <Badge variant="secondary" className={getRoleColor(user.role)}>{getRoleLabel(user.role)}</Badge>
              <Badge variant="secondary" className={getStatusColor(user.status)}>{user.status}</Badge>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="text-sm text-slate-500">{t('common.phone')}</p>
            <p className="font-medium">{user.phone || t('users.notProvided')}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="text-sm text-slate-500">{t('users.joinDate')}</p>
            <p className="font-medium">{user.joinDate}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="text-sm text-slate-500">{t('users.coursesTaken')}</p>
            <p className="font-medium">{user.courses} {t('users.courses')}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="text-sm text-slate-500">{t('users.averageProgress')}</p>
            <p className="font-medium">{user.progress}%</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg col-span-2">
            <p className="text-sm text-slate-500">{t('users.lastActivity')}</p>
            <p className="font-medium">{formatLastActive(user.lastActivity, t)}</p>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={onClose}>{t('common.close')}</Button>
          <Button onClick={onEdit} className="bg-primary hover:bg-primary/90">
            <Edit2 className="w-4 h-4 mr-2" /> {t('common.edit')}
          </Button>
        </div>
      </div>
    </div>
  );
}