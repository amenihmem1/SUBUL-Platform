'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Captured by Next.js Error Boundary:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-card border border-border p-8 rounded-3xl shadow-xl max-w-lg w-full">
        <h2 className="text-3xl font-bold text-foreground mb-4">Something went wrong!</h2>
        <p className="text-muted-foreground mb-8">{error.message || 'An unexpected error occurred.'}</p>
        <div className="flex justify-center gap-4">
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
          >
            Reload Page
          </Button>
          <Button
            onClick={() => reset()}
            variant="default"
          >
            Try Again
          </Button>
        </div>
      </div>
    </div>
  );
}
