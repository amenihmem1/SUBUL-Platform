'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TermsPage() {
  const pathname = usePathname();
  const locale = pathname.split('/')[1] || 'fr';

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="flex items-center gap-3 mb-8">
          <FileText className="h-10 w-10 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">Conditions d&apos;utilisation</h1>
        </div>
        <p className="text-muted-foreground mb-6">
          Cette page est en cours de rédaction. Pour toute question concernant nos conditions d&apos;utilisation, contactez-nous à :{' '}
          <a href="mailto:contact@subul.uk" className="text-primary hover:underline">contact@subul.uk</a>
        </p>
        <Button asChild>
          <Link href={`/${locale}`}>Retour à l&apos;accueil</Link>
        </Button>
      </div>
    </div>
  );
}
