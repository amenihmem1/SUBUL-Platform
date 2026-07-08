import { Suspense } from 'react';
import { Mail } from 'lucide-react';
import VerifyEmailInner from './VerifyEmailInner';
import { PageLoader } from '@/components/ui/loading';

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="auth-card">
          <div className="relative mb-6 flex flex-col items-center">
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7C4DFF]/10 to-[#C2185B]/10 dark:from-[#7C4DFF]/20 dark:to-[#C2185B]/20">
              <Mail className="h-8 w-8 text-[#7C4DFF]" />
            </div>
          </div>
          <div className="flex flex-col items-center justify-center py-8">
            <PageLoader />
          </div>
        </div>
      }
    >
      <VerifyEmailInner />
    </Suspense>
  );
}
