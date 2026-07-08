'use client';

import { useState } from 'react';
import {
  MessageSquare, Search, Filter, Download, Eye, Reply,
  Star, CheckCircle, Clock, Trash2,
  AlertCircle, User, BookOpen, Award, Inbox
} from 'lucide-react';
import { Badge, Button, useToast } from '@/components/ui';
import { useTranslation } from '@/contexts/LanguageContext';
import {
  useFeedbacks,
  useFeedbackStats,
  useUpdateFeedback,
  useDeleteFeedback,
} from '@/hooks/api/useFeedback';
import type { Feedback } from '@/services/feedback';

const getAvatar = (name: string) =>
  name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

export default function FeedbackPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [showViewModal, setShowViewModal] = useState(false);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [responseText, setResponseText] = useState('');

  const { data: feedbacks = [], isLoading, isError, refetch, isFetching } = useFeedbacks({
    status: filterStatus !== 'all' ? filterStatus : undefined,
    type: filterType !== 'all' ? filterType : undefined,
  });
  const { data: statsData } = useFeedbackStats();
  const updateFeedback = useUpdateFeedback();
  const deleteFeedback = useDeleteFeedback();

  const stats = [
    { label: t('feedback.totalFeedbacks'), value: statsData?.total ?? 0, icon: MessageSquare, color: 'bg-primary/10 text-primary' },
    { label: t('feedback.pending'), value: statsData?.pending ?? 0, icon: Clock, color: 'bg-amber-50 text-amber-700' },
    { label: t('feedback.avgRating'), value: (statsData?.avgRating ?? 0).toFixed(1), icon: Star, color: 'bg-yellow-50 text-yellow-700' },
    { label: t('feedback.resolved'), value: statsData?.resolved ?? 0, icon: CheckCircle, color: 'bg-green-50 text-green-700' },
  ];

  const filteredFeedbacks = feedbacks.filter((feedback) => {
    const matchesSearch =
      !searchQuery ||
      feedback.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
      feedback.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      feedback.message.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const handleRespond = async () => {
    if (selectedFeedback && responseText.trim()) {
      try {
        await updateFeedback.mutateAsync({
          id: selectedFeedback.id,
          data: { status: 'responded', response: responseText },
        });
        setShowResponseModal(false);
        setResponseText('');
        setSelectedFeedback(null);
      } catch (err) {
        console.error(err);
        showToast(String(t('common.error') || 'Failed to send response'), 'error');
      }
    }
  };

  const handleMarkResolved = async (id: number) => {
    try {
      await updateFeedback.mutateAsync({ id, data: { status: 'resolved' } });
    } catch (err) {
      console.error(err);
      showToast(String(t('common.error') || 'Failed to mark as resolved'), 'error');
    }
  };

  const handleMarkRead = async (id: number, status: string) => {
    if (status !== 'pending') return;
    try {
      await updateFeedback.mutateAsync({ id, data: { status: 'read' } });
    } catch (err) {
      console.error(err);
      showToast(String(t('common.error') || 'Failed to update feedback'), 'error');
    }
  };

  const handleDelete = async () => {
    if (selectedFeedback) {
      try {
        await deleteFeedback.mutateAsync(selectedFeedback.id);
        setShowDeleteModal(false);
        setSelectedFeedback(null);
      } catch (err) {
        console.error(err);
        showToast(String(t('common.error') || 'Failed to delete feedback'), 'error');
      }
    }
  };

  const exportData = () => {
    const csv = [
      [
        t('feedback.csvId'),
        t('feedback.csvUser'),
        t('feedback.csvType'),
        t('feedback.csvSubject'),
        t('feedback.csvRating'),
        t('feedback.csvStatus'),
        t('feedback.csvDate'),
      ],
      ...filteredFeedbacks.map((f) => [
        f.id,
        f.user,
        f.type,
        f.subject,
        f.rating,
        f.status,
        f.createdAt ? new Date(f.createdAt).toLocaleDateString() : '',
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'feedbacks.csv';
    a.click();
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-amber-100 text-amber-700',
      read: 'bg-primary/10 text-primary',
      responded: 'bg-purple-100 text-purple-700',
      resolved: 'bg-green-100 text-green-700'
    };
    const labels: Record<string, string> = {
      pending: t('feedback.statusPending') as string,
      read: t('feedback.statusRead') as string,
      responded: t('feedback.statusResponded') as string,
      resolved: t('feedback.statusResolved') as string
    };
    return <Badge variant="secondary" className={styles[status as keyof typeof styles] ?? 'bg-slate-100'}>{labels[status as keyof typeof labels] ?? status}</Badge>;
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      course: <BookOpen className="w-4 h-4" />,
      platform: <AlertCircle className="w-4 h-4" />,
      instructor: <User className="w-4 h-4" />,
      certification: <Award className="w-4 h-4" />
    };
    return icons[type] ?? <MessageSquare className="w-4 h-4" />;
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      course: t('feedback.typeCourse') as string,
      platform: t('feedback.typePlatform') as string,
      instructor: t('feedback.typeInstructor') as string,
      certification: t('feedback.typeCertification') as string
    };
    return labels[type];
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(star => (
          <Star
            key={star}
            className={`w-4 h-4 ${star <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`}
          />
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-sm text-destructive flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {String(t('feedback.loadError'))}
          </p>
          <Button type="button" variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            {String(t('common.retry'))}
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center justify-between">
              <div className={`p-3 rounded-lg ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-3">{stat.value}</p>
            <p className="text-sm text-slate-600">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={t('feedback.searchPlaceholder') as string}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="w-4 h-4 mr-2" /> {t('feedback.filters')}
            </Button>
            {showFilters && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-lg shadow-lg p-4 z-10">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t('feedback.status')}</label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    >
                      <option value="all">{t('feedback.all')}</option>
                      <option value="pending">{t('feedback.statusPending')}</option>
                      <option value="read">{t('feedback.statusRead')}</option>
                      <option value="responded">{t('feedback.statusResponded')}</option>
                      <option value="resolved">{t('feedback.statusResolved')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t('feedback.type')}</label>
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    >
                      <option value="all">{t('feedback.all')}</option>
                      <option value="course">{t('feedback.typeCourse')}</option>
                      <option value="platform">{t('feedback.typePlatform')}</option>
                      <option value="instructor">{t('feedback.typeInstructor')}</option>
                      <option value="certification">{t('feedback.typeCertification')}</option>
                    </select>
                  </div>
                  <Button size="sm" className="w-full" onClick={() => setShowFilters(false)}>{t('feedback.apply')}</Button>
                </div>
              </div>
            )}
          </div>
          <Button variant="outline" onClick={exportData}>
            <Download className="w-4 h-4 mr-2" /> {t('feedback.export')}
          </Button>
        </div>
      </div>

      {!isError && filteredFeedbacks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
          <Inbox className="w-12 h-12 text-slate-300 mb-3" />
          <p className="font-medium text-slate-800">{String(t('feedback.emptyStateTitle'))}</p>
          <p className="text-sm text-slate-500 mt-1 max-w-md">{String(t('feedback.emptyStateHint'))}</p>
        </div>
      )}

      <div className="space-y-4">
        {filteredFeedbacks.map((feedback) => (
          <div
            key={feedback.id}
            className={`bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-shadow ${feedback.status === 'pending' ? 'border-l-4 border-l-amber-400' : ''}`}
            onClick={() => handleMarkRead(feedback.id, feedback.status)}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4 flex-1">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                  {getAvatar(feedback.user)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-semibold text-slate-900">{feedback.user}</h3>
                    <Badge variant="outline" className="flex items-center gap-1">
                      {getTypeIcon(feedback.type)}
                      {getTypeLabel(feedback.type)}
                    </Badge>
                    {getStatusBadge(feedback.status)}
                  </div>
                  <p className="font-medium text-slate-800 mb-1">{feedback.subject}</p>
                  <p className="text-slate-600 text-sm line-clamp-2">{feedback.message}</p>
                  {feedback.response && (
<div className="mt-3 p-3 bg-primary/10 rounded-lg">
                    <p className="text-sm text-foreground"><strong>{t('feedback.response')}:</strong> {feedback.response}</p>
                    </div>
                  )}
                  <div className="flex items-center gap-4 mt-3">
                    {renderStars(feedback.rating)}
                    <span className="text-sm text-slate-500">
                      {feedback.createdAt ? new Date(feedback.createdAt).toLocaleDateString() : '-'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={(e) => { e.stopPropagation(); setSelectedFeedback(feedback); setShowViewModal(true); }}
                  className="p-2 hover:bg-slate-100 rounded-lg"
                  title={t('feedback.viewDetails') as string}
                >
                  <Eye className="w-4 h-4 text-slate-600" />
                </button>
                {feedback.status !== 'resolved' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelectedFeedback(feedback); setShowResponseModal(true); }}
                    className="p-2 hover:bg-primary/10 rounded-lg"
                    title={t('feedback.respond') as string}
                  >
                    <Reply className="w-4 h-4 text-blue-600" />
                  </button>
                )}
                {feedback.status === 'responded' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleMarkResolved(feedback.id); }}
                    className="p-2 hover:bg-green-100 rounded-lg"
                    title={t('feedback.markResolved') as string}
                  >
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); setSelectedFeedback(feedback); setShowDeleteModal(true); }}
                  className="p-2 hover:bg-red-100 rounded-lg"
                  title={t('feedback.delete') as string}
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showViewModal && selectedFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowViewModal(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center text-primary-foreground font-bold text-lg">
                {getAvatar(selectedFeedback.user)}
              </div>
              <div>
                <h2 className="text-xl font-semibold">{selectedFeedback.user}</h2>
                <p className="text-slate-600">{selectedFeedback.email}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="flex items-center gap-1">
                  {getTypeIcon(selectedFeedback.type)}
                  {getTypeLabel(selectedFeedback.type)}
                </Badge>
                {getStatusBadge(selectedFeedback.status)}
                {renderStars(selectedFeedback.rating)}
              </div>

              <div>
                <h3 className="font-medium text-slate-900 mb-1">{selectedFeedback.subject}</h3>
                <p className="text-slate-600">{selectedFeedback.message}</p>
              </div>

              {selectedFeedback.response && (
                <div className="p-4 bg-primary/10 rounded-lg">
                  <p className="text-sm font-medium text-blue-900 mb-1">{t('feedback.yourResponse')}:</p>
                  <p className="text-blue-800">{selectedFeedback.response}</p>
                </div>
              )}

              <p className="text-sm text-slate-500">
                {t('feedback.receivedOn')}{' '}
                {selectedFeedback.createdAt
                  ? new Date(selectedFeedback.createdAt).toLocaleDateString()
                  : '-'}
              </p>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setShowViewModal(false)}>{t('common.close')}</Button>
              {selectedFeedback.status !== 'resolved' && (
                <Button onClick={() => { setShowViewModal(false); setShowResponseModal(true); }} className="bg-primary hover:bg-primary/90">
                  <Reply className="w-4 h-4 mr-2" /> {t('feedback.respond')}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {showResponseModal && selectedFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowResponseModal(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6">
            <h2 className="text-xl font-semibold mb-4">{t('feedback.respondToFeedback')}</h2>
            <div className="mb-4 p-3 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-600 mb-1"><strong>{selectedFeedback.user}</strong> - {selectedFeedback.subject}</p>
              <p className="text-slate-700 text-sm">{selectedFeedback.message}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('feedback.yourResponse')}</label>
              <textarea
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder={t('feedback.writePlaceholder') as string}
              />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => { setShowResponseModal(false); setResponseText(''); }}>{t('common.cancel')}</Button>
              <Button onClick={handleRespond} className="bg-primary hover:bg-primary/90">{t('feedback.send')}</Button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && selectedFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDeleteModal(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
            <h2 className="text-xl font-semibold mb-2">{t('feedback.deleteFeedback')}</h2>
            <p className="text-slate-600 mb-6">
              {t('feedback.deleteConfirm')} <strong>{selectedFeedback.user}</strong> ?
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowDeleteModal(false)}>{t('common.cancel')}</Button>
              <Button onClick={handleDelete} className="bg-red-600 hover:bg-red-700">{t('feedback.delete')}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
