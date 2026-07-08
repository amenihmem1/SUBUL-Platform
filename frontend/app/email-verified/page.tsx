'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { Suspense } from 'react';

function EmailVerifiedContent() {
  const searchParams = useSearchParams();
  const status = searchParams?.get('status') ?? 'success';

  const isSuccess = status === 'success';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-white to-violet-50 px-4">
      <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden">
        {/* Top accent bar */}
        <div className={`h-1.5 w-full ${isSuccess ? 'bg-gradient-to-r from-emerald-400 to-teal-500' : 'bg-gradient-to-r from-rose-400 to-orange-400'}`} />

        <div className="p-10 text-center">
          {/* Icon */}
          <div className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full ${isSuccess ? 'bg-emerald-50' : 'bg-rose-50'}`}>
            {isSuccess
              ? <CheckCircle2 className="h-10 w-10 text-emerald-600" />
              : <XCircle className="h-10 w-10 text-rose-500" />
            }
          </div>

          {/* Title */}
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            {isSuccess ? 'Email vérifié !' : 'Lien invalide'}
          </h1>

          {/* Description */}
          <p className="mt-3 text-sm text-slate-500 leading-relaxed">
            {isSuccess
              ? 'Votre adresse email a été vérifiée avec succès. Vous pouvez maintenant vous connecter et profiter de toutes les fonctionnalités.'
              : 'Ce lien de vérification est invalide ou a expiré. Les liens sont valides pendant 24 heures seulement.'}
          </p>

          {/* CTAs */}
          <div className="mt-8 flex flex-col gap-3">
            {isSuccess ? (
              <Link
                href="/en/auth/login"
                className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-3 text-sm font-bold text-white shadow-md transition hover:from-violet-700 hover:to-fuchsia-700"
              >
                Se connecter →
              </Link>
            ) : (
              <>
                <Link
                  href="/en/auth/resend-verification"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-3 text-sm font-bold text-white shadow-md transition hover:from-violet-700 hover:to-fuchsia-700"
                >
                  <RefreshCw className="h-4 w-4" />
                  Renvoyer le lien de vérification
                </Link>
                <Link
                  href="/en/auth/login"
                  className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  Retour à la connexion
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Brand */}
      <p className="mt-8 text-xs text-slate-400">
        © {new Date().getFullYear()} Subul Platform
      </p>
    </div>
  );
}

export default function EmailVerifiedPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <EmailVerifiedContent />
    </Suspense>
  );
}
