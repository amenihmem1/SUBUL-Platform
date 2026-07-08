'use client';

import { use, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck, ShieldX, Loader2 } from 'lucide-react';
import { verifyLearnerCertificate } from '@/services/certifications';

type PageProps = {
  params: Promise<{ code: string }>;
};

export default function CertificateVerificationPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const code = resolvedParams.code;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['certificate-verify-public', code],
    queryFn: () => verifyLearnerCertificate(code),
    retry: false,
  });

  const statusBlock = useMemo(() => {
    if (isLoading) {
      return (
        <div className="flex items-center gap-2 text-slate-600">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Checking certificate...</span>
        </div>
      );
    }
    if (isError || !data?.valid) {
      return (
        <div className="inline-flex items-center gap-2 rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-700">
          <ShieldX className="h-4 w-4" />
          Invalid certificate
        </div>
      );
    }
    return (
      <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
        <ShieldCheck className="h-4 w-4" />
        Certificate valid
      </div>
    );
  }, [data?.valid, isError, isLoading]);

  return (
    <main className="min-h-screen bg-slate-50 py-12 px-4">
      <section className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Certificate Verification</h1>
        <p className="mt-1 text-sm text-slate-600">Issuer: Smartovate Ltd / Subul</p>
        <div className="mt-5">{statusBlock}</div>

        {data?.valid && (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Student name</p>
              <p className="text-sm font-semibold text-slate-900">{data.recipientFullName}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Program title</p>
              <p className="text-sm font-semibold text-slate-900">{data.title}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Completion date</p>
              <p className="text-sm font-semibold text-slate-900">{new Date(data.issuedAt).toLocaleDateString()}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Certificate ID</p>
              <p className="text-sm font-semibold text-slate-900">{data.certificateId}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:col-span-2">
              <p className="text-xs text-slate-500">Verification code</p>
              <p className="text-sm font-semibold text-slate-900 break-all">{data.verificationCode}</p>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
