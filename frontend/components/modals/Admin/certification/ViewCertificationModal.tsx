'use client';

import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui';
import { Badge } from '@/components/ui';
import { Edit2 } from 'lucide-react';

interface ViewCertificationModalProps {
  cert: any; 
  onClose: () => void;
  isOpen: boolean;
}

export default function ViewCertificationModal({
  cert,
  onClose,
  isOpen,
}: ViewCertificationModalProps) {
  const router = useRouter();
  const { locale } = useParams();
  if (!isOpen || !cert) return null;

  const getStatusBadge = (status: string) => {
    const styles = {
      Active: 'bg-green-100 text-green-700',
      Draft: 'bg-amber-100 text-amber-700',
      Archived: 'bg-slate-100 text-slate-700',
    };
    return <Badge variant="secondary" className={styles[status as keyof typeof styles]}>{status}</Badge>;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6">
        <div className={`bg-gradient-to-br ${cert.color} -mx-6 -mt-6 mb-6 p-6 rounded-t-xl`}>
          <div className="flex items-center justify-between">
            {cert.provider === 'AWS' ? (
              <img 
                src="/AWS.png" 
                alt={`${cert.provider} Logo`} 
                className="h-16 w-auto object-contain"
              />
            ) : cert.provider === 'Microsoft' ? (
              <img 
                src="/MIC.png" 
                alt={`${cert.provider} Logo`} 
                className="h-16 w-auto object-contain"
              />
            ) : cert.provider === 'Google' ? (
              <img 
                src="/gcp.png" 
                alt={`${cert.provider} Logo`} 
                className="h-16 w-auto object-contain"
              />
            ) : cert.provider === 'NVIDIA' ? (
              <img 
                src="/NVIDIA.png" 
                alt={`${cert.provider} Logo`} 
                className="h-16 w-auto object-contain"
              />
            ) : cert.provider === 'CNCF' ? (
              <img 
                src="/Kubernetes.png" 
                alt={`${cert.provider} Logo`} 
                className="h-16 w-auto object-contain"
              />
            ) : cert.provider === 'HashiCorp' ? (
              <img 
                src="/tf.png" 
                alt={`${cert.provider} Logo`} 
                className="h-20 w-auto object-contain"
              />
            ) : (
              <span className="text-5xl">{cert.icon}</span>
            )}
            {getStatusBadge(cert.status)}
          </div>
          <h2 className="text-xl font-bold mt-4">{cert.title}</h2>
          <p className="text-slate-700">{cert.provider}</p>
        </div>

        <div className="space-y-4">
          <p className="text-slate-600">{cert.description}</p>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-500">Apprenants</p>
              <p className="font-bold text-lg">{cert.students.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-500">Complétion</p>
              <p className="font-bold text-lg">{cert.completion}%</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-500">Durée</p>
              <p className="font-bold text-lg">{cert.duration}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-500">Prix</p>
              <p className="font-bold text-lg">{cert.price}</p>
            </div>
          </div>

          <p className="text-sm text-slate-500">Dernière mise à jour: {cert.lastUpdated}</p>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
          <Button onClick={() => { onClose(); router.push(`/${locale}/dashboard/admin/certifications/${cert.id}/edit`); }} className="bg-primary hover:bg-primary/90">
            <Edit2 className="w-4 h-4 mr-2" /> Modifier
          </Button>
        </div>
      </div>
    </div>
  );
}