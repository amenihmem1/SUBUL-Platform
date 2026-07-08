'use client';

import { ArrowLeft, Cloud } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslation } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function GcpComputeLabsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split('/')[1] || 'fr';

  return (
    <div className="learner-page-shell space-y-6 min-h-full">
      <div className="flex flex-wrap items-center gap-3 py-3 border-b border-border">
        <button
          onClick={() => router.push(`/${locale}/dashboard/learner/labs`)}
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('learnerLabs.backToLabs')}
        </button>
      </div>

      <Card className="border-2 border-primary/20">
        <CardContent className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
            <Cloud className="h-10 w-10 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Google Cloud labs — Coming soon
          </h2>
          <p className="text-muted-foreground mb-6 max-w-md">
            Les laboratoires Google Cloud Platform sont en cours de développement. Revenez bientôt !
          </p>
          <Button
            variant="outline"
            onClick={() => router.push(`/${locale}/dashboard/learner/labs`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour aux labs
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
