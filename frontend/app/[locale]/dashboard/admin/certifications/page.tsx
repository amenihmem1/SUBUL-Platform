'use client';

import React, { useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Plus, Download, Filter, Search, Trash2, Award, TrendingUp, Users,
  CheckCircle, XCircle, Lock, Unlock, Upload, Settings2, GitBranch,
  BookOpen, FlaskConical, ClipboardList, Eye,
} from 'lucide-react';
import { Button, Badge, useToast } from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/contexts/LanguageContext';
import {
  useCertifications,
  useUpdateCertification,
  useDeleteCertification,
  useToggleCertificationAvailability,
} from '@/hooks/api/useCertifications';
import type { Certification } from '@/services/certifications';
import { importCertificationsJson } from '@/services/certifications';
import { ImportResultPanel, type ImportResultLike } from '@/components/admin/import/ImportResultPanel';
import { IndexingBanner } from '@/components/admin/import/IndexingBanner';
import {
  COURSES_TEMPLATE,
  CERTIFICATIONS_FLAT_TEMPLATE,
  downloadJson,
} from '@/components/admin/import/import-templates';
import DeleteCertificationModal from '@/components/modals/Admin/certification/DeleteCertificationModal';
import ToggleAvailabilityModal from '@/components/modals/Admin/certification/ToggleAvailabilityModal';

// ── Provider logo mapping ────────────────────────────────────────────────────
const PROVIDER_LOGOS: Record<string, string> = {
  AWS: '/AWS.png',
  Microsoft: '/MIC.png',
  Google: '/gcp.png',
  NVIDIA: '/NVIDIA.png',
  CNCF: '/Kubernetes.png',
  HashiCorp: '/tf.png',
};

const STATUS_COLORS: Record<string, string> = {
  Active: 'bg-emerald-100 text-emerald-700',
  Draft: 'bg-amber-100 text-amber-700',
  Archived: 'bg-slate-100 text-slate-500',
};

// ── Cert card ────────────────────────────────────────────────────────────────
function CertCard({
  cert,
  locale,
  onDelete,
  onToggleAvail,
  onToggleStatus,
}: {
  cert: Certification;
  locale: string;
  onDelete: (c: Certification) => void;
  onToggleAvail: (c: Certification) => void;
  onToggleStatus: (c: Certification) => void;
}) {
  const [imgError, setImgError] = useState(false);
  const router = useRouter();

  // Fallback badge color
  const color = (cert as any).badgeColor || '#8B1CC8';
  const imageUrl = (cert as any).imageUrl;
  const iconUrl = (cert as any).iconUrl;
  const providerLogo = PROVIDER_LOGOS[cert.provider];

  const showImage = imageUrl && !imgError;

  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md hover:border-primary/30 transition-all flex flex-col ${!cert.available ? 'opacity-70' : ''}`}
    >
      {/* ── Image / Hero ── */}
      <div className="relative h-36 bg-slate-100 shrink-0">
        {showImage ? (
          <img
            src={imageUrl}
            alt={cert.title}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${color}22, ${color}44)` }}
          >
            {providerLogo ? (
              <img src={providerLogo} alt={cert.provider} className="h-14 w-auto object-contain opacity-80" />
            ) : (
              <span className="text-4xl font-extrabold" style={{ color }}>
                {cert.title[0]}
              </span>
            )}
          </div>
        )}

        {/* Status badge overlay */}
        <div className="absolute top-2 left-2">
          <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 ${STATUS_COLORS[cert.status] ?? STATUS_COLORS.Draft}`}>
            {cert.status}
          </span>
        </div>

        {/* Locked overlay */}
        {!cert.available && (
          <div className="absolute top-2 right-2 bg-red-100 text-red-600 rounded-full px-1.5 py-0.5 text-[10px] font-bold flex items-center gap-1">
            <Lock className="h-2.5 w-2.5" /> Fermée
          </div>
        )}

        {/* Provider icon bottom-right */}
        {iconUrl && (
          <div className="absolute bottom-2 right-2 h-7 w-7 rounded-lg bg-white shadow border border-slate-200 flex items-center justify-center overflow-hidden">
            <img src={iconUrl} alt="" className="h-5 w-5 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
          </div>
        )}
      </div>

      {/* ── Body ── */}
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2 flex-1">{cert.title}</h3>
          {(cert as any).examCode && (
            <span className="text-[10px] font-mono font-semibold text-slate-400 shrink-0 mt-0.5">{(cert as any).examCode}</span>
          )}
        </div>
        <p className="text-xs text-slate-400 mb-3">{cert.provider}</p>

        {/* Meta row */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {cert.duration && (
            <span className="text-[10px] bg-slate-100 text-slate-600 rounded-full px-2 py-0.5">{cert.duration}</span>
          )}
          {cert.price && (
            <span className="text-[10px] bg-slate-100 text-slate-600 rounded-full px-2 py-0.5">{cert.price}</span>
          )}
          {(cert as any).domain && (
            <span className="text-[10px] bg-primary/10 text-primary rounded-full px-2 py-0.5 font-medium">{(cert as any).domain}</span>
          )}
          {(cert as any).level && (
            <span className="text-[10px] bg-slate-100 text-slate-600 rounded-full px-2 py-0.5">{(cert as any).level}</span>
          )}
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
          <span className="flex items-center gap-1"><Users className="h-3 w-3" />{cert.students.toLocaleString()}</span>
          <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" />{cert.completion}%</span>
        </div>

        {/* Content counts (if available) */}
        <div className="flex items-center gap-3 text-[11px] text-slate-400 mb-4">
          <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> {(cert as any).coursesCount ?? '—'} cours</span>
          <span className="flex items-center gap-1"><FlaskConical className="h-3 w-3" /> labs</span>
          <span className="flex items-center gap-1"><ClipboardList className="h-3 w-3" /> examens</span>
        </div>

        {/* Completion bar */}
        <div className="w-full bg-slate-100 rounded-full h-1 mb-4">
          <div
            className="h-1 rounded-full bg-gradient-to-r from-primary to-purple-400"
            style={{ width: `${cert.completion}%` }}
          />
        </div>

        {/* Actions */}
        <div className="mt-auto flex flex-col gap-2">
          {/* Primary: full editor */}
          <Link href={`/${locale}/dashboard/admin/certifications/${cert.id}`} className="block">
            <button className="w-full h-8 rounded-xl bg-primary text-white text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-primary/90 transition-colors">
              <Settings2 className="h-3.5 w-3.5" /> Gérer la certification
            </button>
          </Link>

          {/* Secondary row */}
          <div className="flex items-center gap-1.5">
            <Link href={`/${locale}/dashboard/admin/certifications/${cert.id}/path`} className="flex-1">
              <button className="w-full h-7 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 text-[11px] font-medium flex items-center justify-center gap-1 hover:bg-slate-100 transition-colors">
                <GitBranch className="h-3 w-3" /> Parcours
              </button>
            </Link>
            <a href={`/${locale}/dashboard/learner/certifications/${cert.id}`} target="_blank" rel="noopener" className="flex-1">
              <button className="w-full h-7 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 text-[11px] font-medium flex items-center justify-center gap-1 hover:bg-slate-100 transition-colors">
                <Eye className="h-3 w-3" /> Aperçu
              </button>
            </a>

            {/* Toggle availability */}
            <button
              onClick={() => onToggleAvail(cert)}
              className={`h-7 w-7 rounded-lg border flex items-center justify-center transition-colors ${cert.available ? 'border-red-200 bg-red-50 text-red-500 hover:bg-red-100' : 'border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
              title={cert.available ? 'Fermer' : 'Ouvrir'}
            >
              {cert.available ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
            </button>

            {/* Toggle status */}
            <button
              onClick={() => onToggleStatus(cert)}
              className="h-7 w-7 rounded-lg border border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100 flex items-center justify-center transition-colors"
              title={cert.status === 'Active' ? 'Archiver' : 'Activer'}
            >
              {cert.status === 'Active' ? <XCircle className="h-3 w-3" /> : <CheckCircle className="h-3 w-3" />}
            </button>

            {/* Delete */}
            <button
              onClick={() => onDelete(cert)}
              className="h-7 w-7 rounded-lg border border-slate-200 bg-slate-50 text-slate-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 flex items-center justify-center transition-colors"
              title="Supprimer"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────
export default function AdminCertifications() {
  const { t } = useTranslation();
  const { locale } = useParams();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterProvider, setFilterProvider] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [selectedCert, setSelectedCert] = useState<Certification | null>(null);
  const [importResult, setImportResult] = useState<ImportResultLike | null>(null);
  const [showIndexingBanner, setShowIndexingBanner] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: certifications = [], isLoading } = useCertifications({
    search: searchQuery || undefined,
    status: filterStatus !== 'all' ? (filterStatus as 'Active' | 'Draft' | 'Archived') : undefined,
    provider: filterProvider !== 'all' ? filterProvider : undefined,
  });

  const updateCert = useUpdateCertification();
  const deleteCert = useDeleteCertification();
  const toggleAvailability = useToggleCertificationAvailability();

  const providers = ['AWS', 'Microsoft', 'Google', 'NVIDIA', 'CNCF', 'HashiCorp'];

  const activeCerts = certifications.filter((c) => c.status === 'Active');
  const avgCompletion = activeCerts.length
    ? Math.round(activeCerts.reduce((a, c) => a + c.completion, 0) / activeCerts.length)
    : 0;

  const stats = [
    { label: 'Total certifications', value: certifications.length, icon: Award, color: 'bg-primary/10 text-primary' },
    { label: 'Apprenants inscrits', value: certifications.reduce((a, c) => a + c.students, 0).toLocaleString(), icon: Users, color: 'bg-green-50 text-green-700' },
    { label: 'Complétion moyenne', value: `${avgCompletion}%`, icon: TrendingUp, color: 'bg-purple-50 text-purple-700' },
    { label: 'Actives', value: activeCerts.length, icon: CheckCircle, color: 'bg-emerald-50 text-emerald-700' },
  ];

  const filteredCerts = certifications.filter((cert) => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || cert.title.toLowerCase().includes(q) || cert.provider.toLowerCase().includes(q) || ((cert as any).examCode ?? '').toLowerCase().includes(q);
    const matchStatus = filterStatus === 'all' || cert.status === filterStatus;
    const matchProvider = filterProvider === 'all' || cert.provider === filterProvider;
    return matchSearch && matchStatus && matchProvider;
  });

  const handleDelete = async () => {
    if (!selectedCert) return;
    try {
      await deleteCert.mutateAsync(selectedCert.id);
      setShowDeleteModal(false);
      setSelectedCert(null);
      showToast('Certification supprimée', 'success');
    } catch {
      showToast('Erreur lors de la suppression', 'error');
    }
  };

  const handleToggleAvailability = async () => {
    if (!selectedCert) return;
    try {
      await toggleAvailability.mutateAsync({ id: selectedCert.id, data: { available: !selectedCert.available } });
      setShowCloseModal(false);
      setSelectedCert(null);
    } catch {
      showToast('Erreur lors de la mise à jour', 'error');
    }
  };

  const handleToggleStatus = async (cert: Certification) => {
    try {
      const newStatus = cert.status === 'Active' ? 'Archived' : 'Active';
      await updateCert.mutateAsync({ id: cert.id, data: { status: newStatus } });
    } catch {
      showToast('Erreur lors de la mise à jour', 'error');
    }
  };

  const exportData = () => {
    const csv = [
      ['Titre', 'Fournisseur', 'Code', 'Apprenants', 'Complétion', 'Statut', 'Durée', 'Prix'],
      ...certifications.map((c) => [c.title, c.provider, (c as any).examCode ?? '', c.students, c.completion + '%', c.status, c.duration, c.price]),
    ].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'certifications.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (dryRun: boolean) => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) { showToast('Choisissez un fichier JSON', 'error'); return; }
    let payload: unknown;
    try { payload = JSON.parse(await file.text()); } catch (err) {
      showToast(`JSON invalide: ${err instanceof Error ? err.message : 'erreur'}`, 'error'); return;
    }
    if (!payload || (typeof payload !== 'object' && !Array.isArray(payload))) {
      showToast('Format attendu : { certifications: [...] } ou tableau plat', 'error'); return;
    }
    try {
      const result = await importCertificationsJson(payload as Record<string, unknown> | Array<Record<string, unknown>>, dryRun);
      setImportResult(result as ImportResultLike);
      if (dryRun) {
        showToast('Aperçu généré — vérifiez les compteurs ci-dessous.', 'success');
      } else {
        showToast('Certifications importées avec succès.', 'success');
        setShowIndexingBanner(true);
      }
    } catch (err: any) {
      const status = err?.response?.status;
      const detail = err?.response?.data?.message ?? (err instanceof Error ? err.message : 'Échec de l\'import');
      showToast(status ? `${status} — ${Array.isArray(detail) ? detail.join(', ') : detail}` : String(detail), 'error');
    }
  };

  return (
    <div className="space-y-6 p-1">

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex items-center gap-4">
            <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${stat.color}`}>
              <stat.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-slate-900">{stat.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Rechercher une certification…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-9 text-sm"
          />
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          {/* Filter dropdown */}
          <div className="relative">
            <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="h-3.5 w-3.5" /> Filtres
              {(filterStatus !== 'all' || filterProvider !== 'all') && (
                <span className="h-2 w-2 rounded-full bg-primary" />
              )}
            </Button>
            {showFilters && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl p-4 z-20 space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Statut</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm"
                  >
                    <option value="all">Tous</option>
                    <option value="Active">Active</option>
                    <option value="Draft">Brouillon</option>
                    <option value="Archived">Archivée</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Fournisseur</label>
                  <select
                    value={filterProvider}
                    onChange={(e) => setFilterProvider(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm"
                  >
                    <option value="all">Tous</option>
                    {providers.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 h-7 text-xs" onClick={() => setShowFilters(false)}>Appliquer</Button>
                  <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={() => { setFilterStatus('all'); setFilterProvider('all'); setShowFilters(false); }}>Reset</Button>
                </div>
              </div>
            )}
          </div>

          <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={exportData}>
            <Download className="h-3.5 w-3.5" /> Exporter
          </Button>

          <Link href={`/${locale}/dashboard/admin/certifications/new`}>
            <Button size="sm" className="h-9 gap-1.5 bg-primary hover:bg-primary/90 text-white">
              <Plus className="h-3.5 w-3.5" /> Nouvelle certification
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Result count ── */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400">
          {filteredCerts.length} certification{filteredCerts.length !== 1 ? 's' : ''}
          {searchQuery && ` pour "${searchQuery}"`}
        </p>
      </div>

      {/* ── Cards grid ── */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 h-72 animate-pulse" />
          ))}
        </div>
      ) : filteredCerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Award className="h-10 w-10 text-slate-300 mb-3" />
          <p className="text-sm font-medium text-slate-500">Aucune certification trouvée</p>
          <p className="text-xs text-slate-400 mt-1">Modifiez vos filtres ou créez une nouvelle certification.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredCerts.map((cert) => (
            <CertCard
              key={cert.id}
              cert={cert}
              locale={String(locale)}
              onDelete={(c) => { setSelectedCert(c); setShowDeleteModal(true); }}
              onToggleAvail={(c) => { setSelectedCert(c); setShowCloseModal(true); }}
              onToggleStatus={handleToggleStatus}
            />
          ))}
        </div>
      )}

      {/* ── Import section ── */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Import Certifications JSON</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Format <strong>imbriqué</strong> (<code className="font-mono">{`{ certifications: [...] }`}</code> avec modules/leçons/quiz/labs) ou <strong>tableau plat</strong>.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => { downloadJson('subul-certifications-nested-template.json', COURSES_TEMPLATE); showToast('Template imbriqué téléchargé', 'success'); }}>
              <Download className="h-4 w-4 mr-2" /> Template imbriqué
            </Button>
            <Button variant="outline" size="sm" onClick={() => { downloadJson('subul-certifications-flat-template.json', CERTIFICATIONS_FLAT_TEMPLATE); showToast('Template plat téléchargé', 'success'); }}>
              <Download className="h-4 w-4 mr-2" /> Template plat
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input ref={fileInputRef} type="file" accept="application/json" className="text-sm" />
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => handleImport(true)}>Aperçu (dry-run)</Button>
            <Button size="sm" onClick={() => handleImport(false)}>
              <Upload className="h-4 w-4 mr-2" /> Importer
            </Button>
          </div>
          <ImportResultPanel result={importResult} />
          <IndexingBanner visible={showIndexingBanner} onClose={() => setShowIndexingBanner(false)} />
        </CardContent>
      </Card>

      {/* ── Modals ── */}
      <DeleteCertificationModal
        title={selectedCert?.title || ''}
        onDelete={handleDelete}
        onClose={() => { setShowDeleteModal(false); setSelectedCert(null); }}
        isOpen={showDeleteModal}
      />
      <ToggleAvailabilityModal
        available={selectedCert?.available ?? false}
        title={selectedCert?.title || ''}
        onToggle={handleToggleAvailability}
        onClose={() => { setShowCloseModal(false); setSelectedCert(null); }}
        isOpen={showCloseModal}
      />
    </div>
  );
}
