'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  Users, Search, Eye, Mail, CheckCircle2, XCircle,
  CalendarCheck, Download, Filter, ChevronDown,
  FileText, Star, Clock, X, Send, History, Bell
} from 'lucide-react';
import { Badge } from '@/components/ui';
import { Button } from '@/components/ui';
import { useToast } from '@/components/ui';
import { useConfirmDialog } from '@/components/ui';
import { useTranslation } from '@/contexts/LanguageContext';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCandidates, useEmployerJobs, useUpdateCandidateStatus } from '@/hooks/api/useEmployer';
import type { Candidate } from '@/services/employer';

interface SentEmail {
  id: string;
  candidatId: number;
  to: string;
  subject: string;
  body: string;
  template: string;
  sentAt: string;
}

type EmailTemplate = 'acceptance' | 'rejection' | 'interview' | 'blank';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function CandidatsPage() {
  const { t } = useTranslation();
  const { locale } = useParams<{ locale: string }>();
  const { showToast } = useToast();
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterJobId, setFilterJobId] = useState('all');

  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailTemplate, setEmailTemplate] = useState<EmailTemplate>('blank');
  const [emailCandidatId, setEmailCandidatId] = useState<number | null>(null);

  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewCandidat, setViewCandidat] = useState<Candidate | null>(null);

  const [sentEmails, setSentEmails] = useState<SentEmail[]>([]);

  const { data: employerJobsResp } = useEmployerJobs({ page: 1, limit: 200 });
  const employerJobs = employerJobsResp?.data ?? [];

  const jobTitle = useMemo(() => {
    const map = new Map<string, string>();
    for (const j of employerJobs) {
      map.set(j.id, j.title);
    }
    return (jobId: string | number | undefined) => {
      if (jobId == null || jobId === '') return '';
      return map.get(String(jobId)) ?? '';
    };
  }, [employerJobs]);

  const { data: candidats = [], isLoading } = useCandidates({
    status: filterStatus !== 'all' ? filterStatus : undefined,
    jobId: filterJobId !== 'all' ? filterJobId : undefined,
  });
  const updateStatusMutation = useUpdateCandidateStatus();

  const getTemplateContent = (template: EmailTemplate, candidat: Candidate | undefined) => {
    const candidatName = candidat?.name || '';
    const candidatPoste = candidat ? jobTitle(candidat.jobId) || candidat.poste || '' : '';

    switch (template) {
      case 'acceptance':
        return {
          subject: `${String(t('employer.acceptanceTemplate'))} - ${candidatPoste}`,
          body: `${String(t('employer.dear'))} ${candidatName},\n\n${String(t('employer.acceptanceBody'))}\n\n${String(t('employer.position'))}: ${candidatPoste}\n\n${String(t('employer.acceptanceClosing'))}\n\n${String(t('employer.regards'))}`,
        };
      case 'rejection':
        return {
          subject: `${String(t('employer.rejectionTemplate'))} - ${candidatPoste}`,
          body: `${String(t('employer.dear'))} ${candidatName},\n\n${String(t('employer.rejectionBody'))}\n\n${String(t('employer.position'))}: ${candidatPoste}\n\n${String(t('employer.rejectionClosing'))}\n\n${String(t('employer.regards'))}`,
        };
      case 'interview':
        return {
          subject: `${String(t('employer.interviewTemplate'))} - ${candidatPoste}`,
          body: `${String(t('employer.dear'))} ${candidatName},\n\n${String(t('employer.interviewBody'))}\n\n${String(t('employer.position'))}: ${candidatPoste}\n\n${String(t('employer.interviewClosing'))}\n\n${String(t('employer.regards'))}`,
        };
      default:
        return { subject: '', body: '' };
    }
  };

  const openEmailModal = (candidatId: number, template: EmailTemplate) => {
    const candidat = candidats.find(c => c.id === candidatId);
    if (!candidat) return;

    const content = getTemplateContent(template, candidat);
    setEmailCandidatId(candidatId);
    setEmailTo(candidat.email);
    setEmailSubject(content.subject);
    setEmailBody(content.body);
    setEmailTemplate(template);
    setEmailModalOpen(true);
  };

  const handleTemplateChange = (template: EmailTemplate) => {
    const candidat = candidats.find(c => c.id === emailCandidatId);
    const content = getTemplateContent(template, candidat);
    setEmailTemplate(template);
    setEmailSubject(content.subject);
    setEmailBody(content.body);
  };

  const handleSendEmail = useCallback(() => {
    if (!emailCandidatId || !emailSubject.trim() || !emailBody.trim()) return;
    const candidat = candidats.find(c => c.id === emailCandidatId);
    if (!candidat) return;
    const newEmail: SentEmail = {
      id: generateId(),
      candidatId: emailCandidatId,
      to: emailTo,
      subject: emailSubject,
      body: emailBody,
      template: emailTemplate,
      sentAt: new Date().toISOString(),
    };
    setSentEmails(prev => [...prev, newEmail]);
    setEmailModalOpen(false);
    setEmailTo('');
    setEmailSubject('');
    setEmailBody('');
    setEmailTemplate('blank');
    setEmailCandidatId(null);
    showToast(`${String(t('employer.emailSent'))} ${candidat.name} (${candidat.email})`, 'success');
  }, [emailCandidatId, emailSubject, emailBody, emailTemplate, emailTo, candidats, showToast, t]);

  const handleAccept = (id: number) => {
    const candidat = candidats.find(c => c.id === id);
    confirm({
      title: String(t('employer.confirmAcceptTitle')),
      message: `${String(t('employer.confirmAcceptMessage'))} ${candidat?.name} ${String(t('employer.forPosition'))} "${candidat ? jobTitle(candidat.jobId) || candidat.poste || '' : ''}" ?`,
      confirmLabel: String(t('employer.yesAccept')),
      cancelLabel: String(t('common.cancel')),
      variant: 'warning',
      onConfirm: async () => {
        try {
          await updateStatusMutation.mutateAsync({ id, status: 'accepted' });
          showToast(`${String(t('employer.statusChanged'))} ${candidat?.name} → "${String(t('employer.statusAccepted'))}"`, 'success');
          openEmailModal(id, 'acceptance');
        } catch (err) {
          console.error('Failed to accept candidate:', err);
          showToast(String(t('common.error')) || 'Failed to update candidate status', 'error');
        }
      },
    });
  };

  const handleReject = (id: number) => {
    const candidat = candidats.find(c => c.id === id);
    confirm({
      title: String(t('employer.confirmRejectTitle')),
      message: `${String(t('employer.confirmRejectMessage'))} ${candidat?.name} ?`,
      confirmLabel: String(t('employer.yesReject')),
      cancelLabel: String(t('common.cancel')),
      onConfirm: async () => {
        try {
          await updateStatusMutation.mutateAsync({ id, status: 'rejected' });
          showToast(`${String(t('employer.statusChanged'))} ${candidat?.name} → "${String(t('employer.statusRejected'))}"`, 'error');
          openEmailModal(id, 'rejection');
        } catch (err) {
          console.error('Failed to reject candidate:', err);
          showToast(String(t('common.error')) || 'Failed to update candidate status', 'error');
        }
      },
    });
  };

  const handleInterview = (id: number) => {
    const candidat = candidats.find(c => c.id === id);
    updateStatusMutation.mutate(
      { id, status: 'interview' },
      {
        onSuccess: () => {
          showToast(`${String(t('employer.statusChanged'))} ${candidat?.name} → "${String(t('employer.statusInterview'))}"`, 'info');
          openEmailModal(id, 'interview');
        },
        onError: (err) => {
          console.error('Failed to set interview status:', err);
          showToast(String(t('common.error')) || 'Failed to update candidate status', 'error');
        },
      },
    );
  };

  const openViewModal = (candidat: Candidate) => {
    setViewCandidat(candidat);
    setViewModalOpen(true);
  };

  const applyStatusChange = async (id: number, newStatus: string) => {
    const candidat = candidats.find(c => c.id === id);
    try {
      await updateStatusMutation.mutateAsync({ id, status: newStatus });
      const toastType = newStatus === 'accepted' ? 'success' : newStatus === 'rejected' ? 'error' : 'info';
      showToast(`${String(t('employer.statusChanged'))} ${candidat?.name} → "${getStatusLabel(newStatus)}"`, toastType);
    } catch (err) {
      console.error('Failed to update candidate status:', err);
      showToast(String(t('common.error')) || 'Failed to update candidate status', 'error');
    }
  };

  const handleStatusChange = (id: number, newStatus: string) => {
    const candidat = candidats.find(c => c.id === id);
    if (newStatus === 'rejected') {
      confirm({
        title: String(t('employer.confirmRejectTitle')),
        message: `${String(t('employer.confirmRejectMessage'))} ${candidat?.name} ?`,
        confirmLabel: String(t('employer.yesReject')),
        cancelLabel: String(t('common.cancel')),
        onConfirm: () => applyStatusChange(id, newStatus),
      });
    } else if (newStatus === 'accepted') {
      confirm({
        title: String(t('employer.confirmAcceptTitle')),
        message: `${String(t('employer.confirmAcceptMessage'))} ${candidat?.name} ${String(t('employer.forPosition'))} "${candidat ? jobTitle(candidat.jobId) || candidat.poste || '' : ''}" ?`,
        confirmLabel: String(t('employer.yesAccept')),
        cancelLabel: String(t('common.cancel')),
        variant: 'warning',
        onConfirm: () => applyStatusChange(id, newStatus),
      });
    } else {
      applyStatusChange(id, newStatus);
    }
  };

  const filteredCandidats = candidats.filter((c) => {
    const matchesSearch = !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
    const matchesJob =
      filterJobId === 'all' || String(c.jobId) === String(filterJobId);
    return matchesSearch && matchesStatus && matchesJob;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-blue-100 text-blue-700';
      case 'review': return 'bg-yellow-100 text-yellow-700';
      case 'interview': return 'bg-violet-100 text-violet-700';
      case 'accepted': return 'bg-green-100 text-green-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return String(t('employer.statusNew'));
      case 'review': return String(t('employer.statusInReview'));
      case 'interview': return String(t('employer.statusInterview'));
      case 'accepted': return String(t('employer.statusAccepted'));
      case 'rejected': return String(t('employer.statusRejected'));
      default: return status;
    }
  };

  const statusCounts = {
    total: candidats.length,
    nouveau: candidats.filter(c => c.status === 'pending').length,
    enRevue: candidats.filter(c => c.status === 'review').length,
    entretien: candidats.filter(c => c.status === 'interview').length,
    accepte: candidats.filter(c => c.status === 'accepted').length,
    refuse: candidats.filter(c => c.status === 'rejected').length,
  };

  const getCandidatEmails = (candidatId: number) => {
    return sentEmails.filter(e => e.candidatId === candidatId);
  };

  const formatEmailDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="w-full space-y-6">
      {ConfirmDialogComponent}

      <div>
        <h1 className="text-3xl font-black text-slate-900">{String(t('employer.candidatesTitle'))}</h1>
        <p className="text-slate-600 mt-1">{String(t('employer.candidatesSubtitle'))}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-card rounded-2xl border border-border shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-slate-900">{statusCounts.total}</p>
          <p className="text-xs text-slate-600">{String(t('common.total'))}</p>
        </div>
        <div className="bg-card rounded-2xl border border-blue-200 shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{statusCounts.nouveau}</p>
          <p className="text-xs text-slate-600">{String(t('employer.statusNew'))}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-yellow-200 p-4 text-center">
          <p className="text-2xl font-bold text-yellow-600">{statusCounts.enRevue}</p>
          <p className="text-xs text-slate-600">{String(t('employer.statusInReview'))}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-violet-200 p-4 text-center">
          <p className="text-2xl font-bold text-violet-600">{statusCounts.entretien}</p>
          <p className="text-xs text-slate-600">{String(t('employer.statusInterview'))}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-green-200 p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{statusCounts.accepte}</p>
          <p className="text-xs text-slate-600">{String(t('employer.statusAccepted'))}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-red-200 p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{statusCounts.refuse}</p>
          <p className="text-xs text-slate-600">{String(t('employer.statusRejected'))}</p>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={String(t('employer.searchPlaceholder'))}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-violet-300 outline-none"
            />
          </div>
          <select
            value={filterJobId}
            onChange={(e) => setFilterJobId(e.target.value)}
            className="px-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-violet-300 outline-none"
          >
            <option value="all">{String(t('employer.allPositions'))}</option>
            {employerJobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title}
              </option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-violet-300 outline-none"
          >
            <option value="all">{String(t('employer.allStatuses'))}</option>
            <option value="pending">{String(t('employer.statusNew'))}</option>
            <option value="review">{String(t('employer.statusInReview'))}</option>
            <option value="interview">{String(t('employer.statusInterview'))}</option>
            <option value="accepted">{String(t('employer.statusAccepted'))}</option>
            <option value="rejected">{String(t('employer.statusRejected'))}</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left p-3 text-sm font-medium text-slate-600">{String(t('employer.candidate'))}</th>
                <th className="text-left p-3 text-sm font-medium text-slate-600">{String(t('employer.position'))}</th>
                <th className="text-left p-3 text-sm font-medium text-slate-600">{String(t('employer.experience'))}</th>
                <th className="text-left p-3 text-sm font-medium text-slate-600">{String(t('employer.score'))}</th>
                <th className="text-left p-3 text-sm font-medium text-slate-600">{String(t('common.date'))}</th>
                <th className="text-left p-3 text-sm font-medium text-slate-600">{String(t('common.status'))}</th>
                <th className="text-left p-3 text-sm font-medium text-slate-600">{String(t('employer.quickActions'))}</th>
                <th className="text-left p-3 text-sm font-medium text-slate-600">{String(t('common.actions'))}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">{t('common.loading')}</td>
                </tr>
              ) : (
                filteredCandidats.map((candidat) => (
                <tr key={candidat.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-violet-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-violet-700">
                          {(candidat.name || ' ').split(' ').map(n => n[0]).filter(Boolean).join('').substring(0, 2).toUpperCase() || 'NA'}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-slate-900">{candidat.name}</p>
                          {candidat.notified === true && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-semibold rounded-full">
                              <Bell className="w-2.5 h-2.5" />
                              {String(t('employer.notified'))}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">{candidat.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-sm text-slate-700">{jobTitle(candidat.jobId) || candidat.poste || String(t('common.noData'))}</td>
                  <td className="p-3 text-sm text-slate-700">{candidat.experience ?? String(t('common.noData'))}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                      <span className="text-sm font-medium text-slate-900">{candidat.score != null ? `${candidat.score}%` : String(t('common.noData'))}</span>
                    </div>
                  </td>
                  <td className="p-3 text-sm text-slate-500">{candidat.datePostulation ?? String(t('common.noData'))}</td>
                  <td className="p-3">
                    <select
                      value={candidat.status}
                      onChange={(e) => handleStatusChange(candidat.id, e.target.value)}
                      className={`px-2 py-1 rounded text-xs font-medium border-0 cursor-pointer ${getStatusColor(candidat.status)}`}
                    >
                      <option value="pending">{String(t('employer.statusNew'))}</option>
                      <option value="review">{String(t('employer.statusInReview'))}</option>
                      <option value="interview">{String(t('employer.statusInterview'))}</option>
                      <option value="accepted">{String(t('employer.statusAccepted'))}</option>
                      <option value="rejected">{String(t('employer.statusRejected'))}</option>
                    </select>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleAccept(candidat.id)}
                        className="px-2 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors"
                        title={String(t('employer.accept'))}
                      >
                        {String(t('employer.accept'))}
                      </button>
                      <button
                        onClick={() => handleReject(candidat.id)}
                        className="px-2 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
                        title={String(t('employer.reject'))}
                      >
                        {String(t('employer.reject'))}
                      </button>
                      <button
                        onClick={() => handleInterview(candidat.id)}
                        className="px-2 py-1 text-xs font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-md transition-colors"
                        title={String(t('employer.scheduleInterview'))}
                      >
                        {String(t('employer.scheduleInterview'))}
                      </button>
                      <button
                        onClick={() => openEmailModal(candidat.id, 'blank')}
                        className="px-2 py-1 text-xs font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-md transition-colors"
                        title={String(t('employer.sendEmail'))}
                      >
                        {String(t('employer.sendEmail'))}
                      </button>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openViewModal(candidat)}
                        className="p-1.5 hover:bg-slate-100 rounded" title={String(t('employer.viewProfile'))}
                      >
                        <Eye className="w-4 h-4 text-slate-600" />
                      </button>
                      {candidat.cv === true && (
                        <button
                          onClick={() => showToast(`CV ${String(t('employer.downloadedCv'))} ${candidat.name}`, 'success')}
                          className="p-1.5 hover:bg-slate-100 rounded" title={String(t('employer.downloadCv'))}
                        >
                          <FileText className="w-4 h-4 text-slate-600" />
                        </button>
                      )}
                      <button
                        onClick={() => openEmailModal(candidat.id, 'blank')}
                        className="p-1.5 hover:bg-slate-100 rounded" title={String(t('employer.sendEmail'))}
                      >
                        <Mail className="w-4 h-4 text-slate-600" />
                      </button>
                      {candidat.status === 'accepted' && (
                        <Link href={`/${String(locale)}/dashboard/employer/entretiens`}>
                          <button className="p-1.5 hover:bg-violet-100 rounded" title={String(t('employer.scheduleInterview'))}>
                            <CalendarCheck className="w-4 h-4 text-violet-600" />
                          </button>
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>

        {!isLoading && filteredCandidats.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="font-medium">{String(t('employer.noCandidatesFound'))}</p>
            <p className="text-sm">{String(t('employer.adjustFilters'))}</p>
          </div>
        )}
      </div>

      {emailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setEmailModalOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-violet-100 rounded-full flex items-center justify-center">
                  <Mail className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">{String(t('employer.sendEmail'))}</h2>
                  <p className="text-sm text-slate-500">{String(t('employer.composeEmail'))}</p>
                </div>
              </div>
              <button
                onClick={() => setEmailModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {String(t('employer.emailTemplate'))}
                </label>
                <select
                  value={emailTemplate}
                  onChange={(e) => handleTemplateChange(e.target.value as EmailTemplate)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-300 outline-none"
                >
                  <option value="blank">{String(t('employer.blankEmail'))}</option>
                  <option value="acceptance">{String(t('employer.acceptanceTemplate'))}</option>
                  <option value="rejection">{String(t('employer.rejectionTemplate'))}</option>
                  <option value="interview">{String(t('employer.interviewTemplate'))}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {String(t('employer.recipient'))}
                </label>
                <input
                  type="email"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-300 outline-none bg-slate-50"
                  readOnly
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {String(t('employer.emailSubject'))}
                </label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder={String(t('employer.emailSubjectPlaceholder'))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-300 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {String(t('employer.emailBody'))}
                </label>
                <textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  placeholder={String(t('employer.emailBodyPlaceholder'))}
                  rows={10}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-300 outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200">
              <Button
                variant="outline"
                onClick={() => setEmailModalOpen(false)}
              >
                {String(t('common.cancel'))}
              </Button>
              <Button
                onClick={handleSendEmail}
                disabled={!emailSubject.trim() || !emailBody.trim()}
                className="bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
                {String(t('employer.send'))}
              </Button>
            </div>
          </div>
        </div>
      )}

      {viewModalOpen && viewCandidat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setViewModalOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-violet-100 rounded-full flex items-center justify-center">
                  <span className="text-lg font-semibold text-violet-700">
                    {(viewCandidat.name || ' ').split(' ').map(n => n[0]).filter(Boolean).join('').substring(0, 2).toUpperCase() || 'NA'}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-slate-900">{viewCandidat.name}</h2>
                    {viewCandidat.notified === true && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">
                        <Bell className="w-3 h-3" />
                        {String(t('employer.notified'))}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500">{jobTitle(viewCandidat.jobId) || viewCandidat.poste || String(t('common.noData'))}</p>
                </div>
              </div>
              <button
                onClick={() => setViewModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-slate-500 font-medium">{String(t('common.email'))}</p>
                    <p className="text-sm text-slate-900">{viewCandidat.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">{String(t('common.phone'))}</p>
                    <p className="text-sm text-slate-900">{viewCandidat.telephone ?? String(t('common.noData'))}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">{String(t('employer.experience'))}</p>
                    <p className="text-sm text-slate-900">{viewCandidat.experience ?? String(t('common.noData'))}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-slate-500 font-medium">{String(t('employer.applicationDate'))}</p>
                    <p className="text-sm text-slate-900">{viewCandidat.datePostulation ?? String(t('common.noData'))}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">{String(t('employer.score'))}</p>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                      <span className="text-sm font-medium text-slate-900">{viewCandidat.score != null ? `${viewCandidat.score}%` : String(t('common.noData'))}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">{String(t('common.status'))}</p>
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getStatusColor(viewCandidat.status)}`}>
                      {getStatusLabel(viewCandidat.status)}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-500 font-medium mb-2">{String(t('employer.skills'))}</p>
                <div className="flex flex-wrap gap-2">
                  {(viewCandidat.competences ?? []).map((comp, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 bg-violet-50 text-violet-700 text-xs font-medium rounded-full"
                    >
                      {comp}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <History className="w-4 h-4 text-slate-500" />
                  <p className="text-sm font-semibold text-slate-900">{String(t('employer.emailHistory'))}</p>
                </div>
                {getCandidatEmails(viewCandidat.id).length === 0 ? (
                  <div className="text-center py-6 bg-slate-50 rounded-lg">
                    <Mail className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-sm text-slate-500">{String(t('employer.noEmailsSent'))}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {getCandidatEmails(viewCandidat.id).map((email) => (
                      <div
                        key={email.id}
                        className="bg-slate-50 rounded-lg p-4 border border-slate-100"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium text-slate-900">{email.subject}</p>
                          <span className="text-xs text-slate-500">{formatEmailDate(email.sentAt)}</span>
                        </div>
                        <p className="text-xs text-slate-600 whitespace-pre-line line-clamp-3">{email.body}</p>
                        <div className="mt-2">
                          <span className="inline-flex items-center px-2 py-0.5 bg-violet-100 text-violet-700 text-[10px] font-medium rounded-full">
                            {email.template === 'acceptance' ? String(t('employer.acceptanceTemplate')) :
                             email.template === 'rejection' ? String(t('employer.rejectionTemplate')) :
                             email.template === 'interview' ? String(t('employer.interviewTemplate')) :
                             String(t('employer.blankEmail'))}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200">
              <Button
                variant="outline"
                onClick={() => setViewModalOpen(false)}
              >
                {String(t('common.close'))}
              </Button>
              <Button
                onClick={() => {
                  setViewModalOpen(false);
                  openEmailModal(viewCandidat.id, 'blank');
                }}
                className="bg-violet-600 hover:bg-violet-700 text-white"
              >
                <Mail className="w-4 h-4" />
                {String(t('employer.sendEmail'))}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
