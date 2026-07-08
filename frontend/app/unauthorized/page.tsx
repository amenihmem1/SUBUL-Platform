'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ShieldX } from 'lucide-react';
import { Button } from '@/components/ui/button';

const defaultLocale = 'en';

const messages: Record<string, { title: string; description: string }> = {
  admin_required: {
    title: 'Accès administrateur requis',
    description: "Vous n'avez pas les droits nécessaires pour accéder à cette page. Contactez un administrateur si vous pensez qu'il s'agit d'une erreur.",
  },
  learner_required: {
    title: 'Accès apprenant requis',
    description: "Cette section est réservée aux apprenants. Connectez-vous avec un compte apprenant pour y accéder.",
  },
  employer_required: {
    title: 'Accès employeur requis',
    description: "Cette section est réservée aux employeurs. Connectez-vous avec un compte employeur pour y accéder.",
  },
  unauthorized: {
    title: 'Accès non autorisé',
    description: "Vous n'avez pas les droits nécessaires pour accéder à cette ressource.",
  },
};

function UnauthorizedContent() {
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason') || 'unauthorized';
  const { title, description } = messages[reason] || messages.unauthorized;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-card border border-border p-8 rounded-2xl shadow-lg max-w-lg w-full">
        <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldX className="h-8 w-8 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-3">{title}</h1>
        <p className="text-muted-foreground mb-8">{description}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild>
            <Link href={`/${defaultLocale}`}>Retour à l&apos;accueil</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`${process.env.NEXT_PUBLIC_FRONTEND_URL || ''}/${defaultLocale}?login=required`}>
              Se connecter
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function UnauthorizedPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
      </div>
    }>
      <UnauthorizedContent />
    </Suspense>
  );
}
