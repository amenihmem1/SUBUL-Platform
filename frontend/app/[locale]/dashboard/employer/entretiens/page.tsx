'use client';

import { useState } from 'react';
import {
  CalendarCheck, Plus, Clock, MapPin, Video,
  X, Trash2, Mail, Phone, Search
} from 'lucide-react';
import { Badge } from '@/components/ui';
import { Button } from '@/components/ui';
import { useToast } from '@/components/ui';
import { useConfirmDialog } from '@/components/ui';
import { useTranslation } from '@/contexts/LanguageContext';
import {
  useInterviews,
  useCreateInterview,
  useUpdateInterview,
  useDeleteInterview,
} from '@/hooks/api/useEmployer';

export default function EntretiensPage() {
  const { showToast } = useToast();
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();
  const { t } = useTranslation();
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const { data: entretiens = [], isLoading } = useInterviews();
  const createMutation = useCreateInterview();
  const updateMutation = useUpdateInterview();
  const deleteMutation = useDeleteInterview();

  const [newEntretien, setNewEntretien] = useState<{
    title: string; candidateEmail: string; date: string; heure: string;
    durationMinutes: number; meetingType: 'video' | 'phone' | 'in-person'; lieu: string; notes: string;
  }>({
    title: '', candidateEmail: '', date: '', heure: '',
    durationMinutes: 60, meetingType: 'video', lieu: '', notes: ''
  });

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (minutes: number) => {
    if (minutes >= 60) return `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}min` : ''}`;
    return `${minutes} min`;
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'scheduled': return 'Planifié';
      case 'confirmed': return 'Confirmé';
      case 'completed': return 'Terminé';
      case 'cancelled': return 'Annulé';
      default: return status;
    }
  };

  const handleAddEntretien = async () => {
    if (!newEntretien.title || !newEntretien.date || !newEntretien.heure) {
      showToast(String(t('employerInterviews.fillRequired') || 'Veuillez remplir tous les champs obligatoires.'), 'error');
      return;
    }
    try {
      const scheduledAt = new Date(`${newEntretien.date}T${newEntretien.heure}`);
      await createMutation.mutateAsync({
        title: newEntretien.title,
        candidateEmail: newEntretien.candidateEmail,
        scheduledAt: scheduledAt.toISOString(),
        durationMinutes: newEntretien.durationMinutes,
        meetingType: newEntretien.meetingType,
        location: newEntretien.lieu || undefined,
        notes: newEntretien.notes || undefined,
      });
      setNewEntretien({ title: '', candidateEmail: '', date: '', heure: '', durationMinutes: 60, meetingType: 'video', lieu: '', notes: '' });
      setShowForm(false);
      showToast(`Entretien "${newEntretien.title}" créé.`, 'success');
    } catch (err) {
      console.error(err);
      showToast(String(t('common.error') || 'Une erreur est survenue.'), 'error');
    }
  };

  const handleDeleteEntretien = (id: number) => {
    const entretien = entretiens.find(e => e.id === id);
    confirm({
      title: 'Supprimer cet entretien ?',
      message: `Êtes-vous sûr de vouloir supprimer l'entretien "${entretien?.title}" ?`,
      confirmLabel: 'Oui, supprimer',
      cancelLabel: 'Non, annuler',
      onConfirm: async () => {
        try {
          await deleteMutation.mutateAsync(id);
          showToast(`Entretien supprimé.`, 'info');
        } catch (err) {
          console.error(err);
        }
      },
    });
  };

  const applyEntretienStatus = async (id: number, newStatus: string) => {
    const entretien = entretiens.find(e => e.id === id);
    try {
      await updateMutation.mutateAsync({ id, data: { status: newStatus } });
      const toastType = newStatus === 'confirmed' ? 'success' : newStatus === 'cancelled' ? 'warning' : 'info';
      showToast(`Entretien "${entretien?.title}" : ${getStatusLabel(newStatus)}.`, toastType);
    } catch (err) {
      console.error(err);
    }
  };

  const handleStatusChange = (id: number, newStatus: string) => {
    const entretien = entretiens.find(e => e.id === id);
    if (newStatus === 'cancelled') {
      confirm({
        title: 'Annuler cet entretien ?',
        message: `Êtes-vous sûr de vouloir annuler l'entretien "${entretien?.title}" ?`,
        confirmLabel: 'Oui, annuler',
        cancelLabel: 'Non, garder',
        variant: 'warning',
        onConfirm: () => applyEntretienStatus(id, newStatus),
      });
    } else {
      applyEntretienStatus(id, newStatus);
    }
  };

  const filteredEntretiens = entretiens.filter((e) => {
    const title = e.title ?? '';
    const matchesSearch = !searchQuery || title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || e.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-700';
      case 'confirmed': return 'bg-green-100 text-green-700';
      case 'completed': return 'bg-slate-100 text-slate-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getMeetingTypeLabel = (type: string) => {
    switch (type) {
      case 'video': return 'Visioconférence';
      case 'phone': return 'Téléphone';
      case 'in-person': return 'Présentiel';
      default: return type;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'in-person': return <MapPin className="w-4 h-4" />;
      case 'video': return <Video className="w-4 h-4" />;
      case 'phone': return <Phone className="w-4 h-4" />;
      default: return <MapPin className="w-4 h-4" />;
    }
  };

  return (
    <div className="w-full space-y-6">
      {ConfirmDialogComponent}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900">{t('employerInterviews.title')}</h1>
          <p className="text-slate-600 mt-1">{t('employerInterviews.subtitle')}</p>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          className="bg-violet-600 hover:bg-violet-700 text-white flex items-center gap-2"
        >
          <Plus size={18} />
          {t('employerInterviews.scheduleInterview')}
        </Button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowForm(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl border border-slate-200 p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-slate-900">{t('employerInterviews.scheduleInterview')}</h2>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Titre de l'entretien *</label>
                <input
                  type="text"
                  value={newEntretien.title}
                  onChange={(e) => setNewEntretien({ ...newEntretien, title: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-violet-300 outline-none"
                  placeholder="ex: Entretien avec Jean Dupont"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email du candidat</label>
                <input
                  type="email"
                  value={newEntretien.candidateEmail}
                  onChange={(e) => setNewEntretien({ ...newEntretien, candidateEmail: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-violet-300 outline-none"
                  placeholder="candidat@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Type de rencontre *</label>
                <select
                  value={newEntretien.meetingType}
                  onChange={(e) => setNewEntretien({ ...newEntretien, meetingType: e.target.value as 'video' | 'phone' | 'in-person' })}
                  className="w-full px-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-violet-300 outline-none"
                >
                  <option value="video">Visioconférence</option>
                  <option value="in-person">Présentiel</option>
                  <option value="phone">Téléphone</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date *</label>
                <input
                  type="date"
                  value={newEntretien.date}
                  onChange={(e) => setNewEntretien({ ...newEntretien, date: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-violet-300 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Heure *</label>
                <input
                  type="time"
                  value={newEntretien.heure}
                  onChange={(e) => setNewEntretien({ ...newEntretien, heure: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-violet-300 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Durée</label>
                <select
                  value={String(newEntretien.durationMinutes)}
                  onChange={(e) => setNewEntretien({ ...newEntretien, durationMinutes: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-violet-300 outline-none"
                >
                  <option value="15">15 min</option>
                  <option value="30">30 min</option>
                  <option value="45">45 min</option>
                  <option value="60">60 min</option>
                  <option value="90">90 min</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Lien / Lieu</label>
                <input
                  type="text"
                  value={newEntretien.lieu}
                  onChange={(e) => setNewEntretien({ ...newEntretien, lieu: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-violet-300 outline-none"
                  placeholder="https://zoom.us/... ou adresse"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  value={newEntretien.notes}
                  onChange={(e) => setNewEntretien({ ...newEntretien, notes: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-violet-300 outline-none resize-none"
                  placeholder="Notes sur l'entretien..."
                />
              </div>
            </div>
            <div className="flex justify-end mt-6 gap-3">
              <Button variant="outline" onClick={() => setShowForm(false)}>{t('employerInterviews.cancel')}</Button>
              <Button onClick={handleAddEntretien} className="bg-violet-600 hover:bg-violet-700 text-white flex items-center gap-2">
                <Mail size={18} />
                {t('employerInterviews.sendInvitation')}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 text-center">
          <p className="text-2xl font-bold text-slate-900">{entretiens.length}</p>
          <p className="text-xs text-slate-600">{t('employerInterviews.totalInterviews')}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{entretiens.filter(e => e.status === 'scheduled').length}</p>
          <p className="text-xs text-slate-600">{t('employerInterviews.planned')}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-green-200 p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{entretiens.filter(e => e.status === 'confirmed').length}</p>
          <p className="text-xs text-slate-600">{t('employerInterviews.confirmed')}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-300 p-4 text-center">
          <p className="text-2xl font-bold text-slate-600">{entretiens.filter(e => e.status === 'completed').length}</p>
          <p className="text-xs text-slate-600">{t('employerInterviews.completed')}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={t('employerInterviews.searchPlaceholder') as string}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-violet-300 outline-none"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-violet-300 outline-none"
          >
            <option value="all">Tous les statuts</option>
            <option value="scheduled">Planifié</option>
            <option value="confirmed">Confirmé</option>
            <option value="completed">Terminé</option>
            <option value="cancelled">Annulé</option>
          </select>
        </div>

        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-12 text-slate-500">{t('common.loading')}</div>
          ) : (
            filteredEntretiens.map((entretien) => (
            <div key={entretien.id} className="border border-slate-200 rounded-lg p-5 hover:shadow-md transition-all">
              <div className="flex items-start justify-between">
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center">
                    <CalendarCheck className="w-6 h-6 text-violet-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-semibold text-slate-900">{entretien.candidatName ?? entretien.candidate?.name ?? '-'}</h3>
                      <Badge className={getStatusColor(entretien.status ?? '')}>{entretien.status ?? '-'}</Badge>
                    </div>
                    <p className="text-sm text-slate-600 mb-2">
                      <span className="font-medium">{entretien.poste ?? '-'}</span> &bull; {entretien.candidatEmail ?? '-'}
                    </p>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <CalendarCheck className="w-4 h-4" />
                        {entretien.date ?? '-'} &agrave; {entretien.heure ?? '-'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {entretien.duree ?? '-'}
                      </span>
                      <span className="flex items-center gap-1">
                        {getTypeIcon(entretien.type ?? '')}
                        {entretien.type ?? '-'} - {entretien.lieu ?? '-'}
                      </span>
                    </div>
                    {entretien.notes && (
                      <p className="text-xs text-slate-400 mt-2 italic">{entretien.notes}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {((entretien.status === 'scheduled') || (entretien.status === 'confirmed')) && (
                    <select
                      value={entretien.status}
                      onChange={(e) => handleStatusChange(entretien.id, e.target.value)}
                      className="px-2 py-1 rounded text-xs font-medium border border-slate-200 cursor-pointer"
                    >
                      <option value="scheduled">Planifié</option>
                      <option value="confirmed">Confirmé</option>
                      <option value="completed">Terminé</option>
                      <option value="cancelled">Annulé</option>
                    </select>
                  )}
                  <button
                    onClick={() => handleDeleteEntretien(entretien.id)}
                    className="p-2 hover:bg-red-50 rounded-lg"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>
            </div>
          )))}
        </div>

        {!isLoading && filteredEntretiens.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <CalendarCheck className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="font-medium">Aucun entretien trouvé</p>
            <p className="text-sm">Planifiez un nouvel entretien pour commencer.</p>
          </div>
        )}
      </div>
    </div>
  );
}
