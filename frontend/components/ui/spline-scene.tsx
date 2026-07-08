'use client';

import dynamic from 'next/dynamic';

const Spline = dynamic(
  () => import('@splinetool/react-spline').then((m) => ({ default: m.default })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center">
        <div className="h-24 w-24 animate-pulse rounded-full bg-white/10" />
      </div>
    ),
  },
);

interface SplineSceneProps {
  scene: string;
  className?: string;
}

export function SplineScene({ scene, className }: SplineSceneProps) {
  return <Spline scene={scene} className={className} />;
}
