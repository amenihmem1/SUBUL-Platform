'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ShieldCheck, ShieldX, Loader2, Award, BookOpen,
  Calendar, Hash, User, Building2, BadgeCheck,
} from 'lucide-react';
import { verifyLearnerCertificate } from '@/services/certifications';

type PageProps = {
  params: Promise<{ code: string; locale: string }>;
};

function Field({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 flex items-start gap-3">
      <div className="h-8 w-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="h-4 w-4 text-slate-500" />
      </div>
      <div>
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-sm font-semibold text-slate-900 mt-0.5">{value}</p>
      </div>
    </div>
  );
}

export default function CertificateVerificationPage({ params }: PageProps) {
  const { code } = use(params);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['certificate-verify', code],
    queryFn: () => verifyLearnerCertificate(code),
    retry: false,
  });

  const isCourseCompletion = (data as { type?: string } | undefined)?.type === 'course_completion';

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">

        {/* Issuer header */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <svg viewBox="0 0 105 40" xmlns="http://www.w3.org/2000/svg" height="32">
            <defs>
              <linearGradient id="sg2" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#E8177D"/>
                <stop offset="100%" stopColor="#8B1CC8"/>
              </linearGradient>
            </defs>
            <rect x="4" y="18" width="5" height="10" rx="1.5" fill="url(#sg2)"/>
            <rect x="12" y="13" width="5" height="15" rx="1.5" fill="url(#sg2)"/>
            <rect x="20" y="8" width="5" height="20" rx="1.5" fill="url(#sg2)"/>
            <line x1="30" y1="14" x2="3" y2="14" stroke="url(#sg2)" strokeWidth="2.5" strokeLinecap="round"/>
            <polygon points="3,14 9,9 9,19" fill="url(#sg2)"/>
            <text x="38" y="23" fontFamily="Arial Black,Arial,sans-serif" fontSize="14" fontWeight="900" fill="url(#sg2)" letterSpacing="2">SUBUL</text>
          </svg>
          <div className="h-6 w-px bg-slate-300" />
          <svg viewBox="0 0 130 38" xmlns="http://www.w3.org/2000/svg" height="30">
            <circle cx="18" cy="19" r="15" fill="none" stroke="#1a1a2e" strokeWidth="2"/>
            <path d="M18 5 A13 13 0 1 1 6 15" fill="none" stroke="#E8177D" strokeWidth="2" strokeLinecap="round"/>
            <polygon points="5,11 10,16 5,21" fill="#E8177D"/>
            <text x="38" y="24" fontFamily="Arial Black,Arial,sans-serif" fontSize="14" fontWeight="900" fill="#1a1a2e">Smartovate</text>
          </svg>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white shadow-xl overflow-hidden">

          {/* Loading */}
          {isLoading && (
            <div className="p-10 flex flex-col items-center gap-4 text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium">Verifying certificate…</p>
            </div>
          )}

          {/* Invalid */}
          {!isLoading && (isError || !data?.valid) && (
            <div className="p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 rounded-2xl bg-red-100 flex items-center justify-center">
                  <ShieldX className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">Certificate Verification</h1>
                  <p className="text-sm text-slate-500">Issuer: Smartovate Ltd / Subul</p>
                </div>
              </div>
              <div className="rounded-2xl bg-red-50 border border-red-200 p-4 flex items-center gap-3">
                <ShieldX className="h-5 w-5 text-red-500 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-red-800">Invalid or unrecognized certificate</p>
                  <p className="text-xs text-red-600 mt-0.5">
                    This certificate code could not be verified. It may be expired, invalid, or not yet registered.
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-4 text-center">
                Code: <span className="font-mono">{code}</span>
              </p>
            </div>
          )}

          {/* Valid */}
          {!isLoading && data?.valid && (
            <div>
              {/* Green header */}
              <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-8 py-6 text-white">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-white/20 flex items-center justify-center">
                    {isCourseCompletion
                      ? <BookOpen className="h-7 w-7 text-white" />
                      : <Award className="h-7 w-7 text-white" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <BadgeCheck className="h-4 w-4 text-emerald-200" />
                      <span className="text-xs font-bold text-emerald-100 uppercase tracking-wider">
                        {isCourseCompletion ? 'Certificate of Accomplishment' : 'Certification Certificate'}
                      </span>
                    </div>
                    <h1 className="text-xl font-bold">Verified ✓</h1>
                    <p className="text-sm text-white/80 mt-0.5">
                      This certificate is authentic and issued by Smartovate Ltd / Subul
                    </p>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="p-6 space-y-4">
                {/* Valid badge */}
                <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2.5 w-fit">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm font-semibold text-emerald-700">Certificate is valid</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field icon={User} label="Student" value={data.recipientFullName} />
                  <Field
                    icon={isCourseCompletion ? BookOpen : Award}
                    label={isCourseCompletion ? 'Course completed' : 'Certification'}
                    value={data.title}
                  />
                  <Field
                    icon={Calendar}
                    label={isCourseCompletion ? 'Completion date' : 'Issue date'}
                    value={new Date(data.issuedAt).toLocaleDateString('en-GB', {
                      day: '2-digit', month: 'long', year: 'numeric',
                    })}
                  />
                  <Field icon={Building2} label="Issuer" value={data.issuer ?? 'Smartovate Ltd / Subul'} />
                  <Field icon={Hash} label="Certificate ID" value={data.certificateId} />
                  <Field
                    icon={BadgeCheck}
                    label="Type"
                    value={isCourseCompletion ? 'Course Accomplishment' : 'Professional Certification'}
                  />
                </div>

                <div className="mt-2 rounded-2xl bg-slate-50 border border-slate-200 p-4">
                  <p className="text-xs text-slate-500 text-center">
                    Verification code: <span className="font-mono font-medium text-slate-700">{code}</span>
                  </p>
                  <p className="text-[11px] text-slate-400 text-center mt-1">
                    This certificate was issued by Smartovate Ltd and Subul platform. For questions contact{' '}
                    <a href="mailto:support@subul.uk" className="underline text-primary">support@subul.uk</a>
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </main>
  );
}
