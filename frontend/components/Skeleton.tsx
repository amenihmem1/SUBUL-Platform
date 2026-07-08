import React from 'react';
interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  lines?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({ 
  className = '', 
  variant = 'rectangular',
  width,
  height,
  lines = 1
}) => {
  const baseClasses = 'animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:var(--skeleton-shine)_100%] bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.4),transparent)]';
  
  const variantClasses = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded',
    rounded: 'rounded-lg'
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  if (variant === 'text' && lines > 1) {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={`${baseClasses} ${variantClasses[variant]}`}
            style={{
              ...style,
              width: index === lines - 1 ? '70%' : '100%' 
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div 
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={style}
    />
  );
};

export const RoadmapSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-primary/5 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-gradient-to-r from-primary via-accent to-palette-4 rounded-2xl sm:rounded-3xl shadow-xl sm:shadow-2xl p-4 sm:p-8 border border-gray-100 mb-6 sm:mb-8">
          <div className="flex items-center gap-3 sm:gap-4 mb-4">
            <Skeleton variant="circular" width={40} height={40} className="sm:w-12 sm:h-12" />
            <div className="flex-1">
              <Skeleton width={200} height={24} className="mb-2 sm:w-[300px] sm:h-8" />
              <Skeleton width={150} height={16} className="sm:w-[400px]" />
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <Skeleton height={60} variant="rounded" className="sm:h-20" />
            <Skeleton height={60} variant="rounded" className="sm:h-20" />
            <Skeleton height={60} variant="rounded" className="sm:h-20" />
          </div>
        </div>

        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-lg sm:shadow-xl p-4 sm:p-8 border border-gray-100 mb-6 sm:mb-8">
          <Skeleton width={150} height={20} className="mb-6 sm:mb-8 mx-auto sm:w-[200px] sm:h-7" />
          
          <div className="relative">
            <div className="absolute top-6 sm:top-8 left-0 right-0 h-1 bg-gray-200 rounded-full">
              <div className="h-full bg-gray-300 rounded-full w-3/4"></div>
            </div>
            
            <div className="relative flex justify-between">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="flex flex-col items-center">
                  <Skeleton variant="circular" width={60} height={60} className="sm:w-20 sm:h-20" />
                  <Skeleton width={80} height={12} className="mt-3 sm:mt-4 sm:w-[100px] sm:h-4" />
                  <Skeleton width={40} height={10} className="mt-1 sm:w-[60px] sm:h-3" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-lg sm:shadow-xl p-4 sm:p-8 border border-gray-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="bg-white border-2 rounded-xl sm:rounded-2xl p-4 sm:p-6">
                <div className="flex items-start justify-between mb-3 sm:mb-4">
                  <Skeleton variant="circular" width={40} height={40} className="sm:w-12 sm:h-12" />
                  <Skeleton variant="circular" width={20} height={20} className="sm:w-6 sm:h-6" />
                </div>
                
                <Skeleton height={20} className="mb-2 sm:h-6" />
                <Skeleton lines={2} className="mb-3 sm:mb-4" />
                
                <div className="flex gap-1 sm:gap-2 mb-3 sm:mb-4">
                  <Skeleton width={50} height={20} variant="rounded" className="sm:w-[60px] sm:h-6" />
                  <Skeleton width={40} height={20} variant="rounded" className="sm:w-[50px] sm:h-6" />
                  <Skeleton width={30} height={20} variant="rounded" className="sm:w-[40px] sm:h-6" />
                </div>
                
                <div className="space-y-1 sm:space-y-2 mb-3 sm:mb-4">
                  <Skeleton width={60} height={10} className="sm:w-[80px] sm:h-3" />
                  <div className="flex flex-wrap gap-1">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} width={30} height={14} variant="rounded" className="sm:w-[40px] sm:h-4" />
                    ))}
                  </div>
                </div>
                
                <Skeleton height={32} variant="rounded" className="sm:h-10" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export const GoalsSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-12">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="bg-white/70 backdrop-blur-xl rounded-xl sm:rounded-2xl p-3 sm:p-6 shadow-lg border border-white/30">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <Skeleton variant="circular" width={40} height={40} className="sm:w-12 sm:h-12" />
                <Skeleton width={50} height={24} className="sm:w-[60px]" />
              </div>
              <Skeleton height={12} className="sm:h-4" />
            </div>
          ))}
        </div>

        {/* Daily/Weekly Goals Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8 mb-6 sm:mb-12">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="bg-white/70 backdrop-blur-xl rounded-xl sm:rounded-2xl shadow-lg sm:shadow-xl p-4 sm:p-6 lg:p-8 border border-white/30">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <Skeleton width={150} height={20} className="sm:w-[200px] sm:h-6" />
                <div className="flex gap-2">
                  <Skeleton width={60} height={20} variant="rounded" className="sm:w-[80px] sm:h-6" />
                  <Skeleton width={50} height={20} variant="rounded" className="sm:w-[60px] sm:h-6" />
                </div>
              </div>
              
              <div className="space-y-2 sm:space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-2 sm:p-4 rounded-xl border">
                    <div className="flex items-center gap-2 sm:gap-3 flex-1">
                      <Skeleton variant="circular" width={16} height={16} className="sm:w-5 sm:h-5" />
                      <div className="flex-1">
                        <Skeleton width={120} height={14} className="mb-1 sm:w-[150px] sm:h-4" />
                        <Skeleton width={30} height={10} className="sm:w-[40px] sm:h-3" />
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Skeleton variant="circular" width={24} height={24} className="sm:w-8 sm:h-8" />
                      <Skeleton variant="circular" width={24} height={24} className="sm:w-8 sm:h-8" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Main Goals Skeleton */}
        <div className="bg-white/70 backdrop-blur-xl rounded-xl sm:rounded-2xl shadow-lg sm:shadow-xl p-4 sm:p-6 border border-white/30">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
            <Skeleton width={150} height={24} className="sm:w-[200px] sm:h-7" />
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Skeleton width={150} height={32} className="sm:w-[200px] sm:h-10" />
              <Skeleton width={80} height={32} className="sm:w-[100px] sm:h-10" />
              <Skeleton width={100} height={32} className="sm:w-[120px] sm:h-10" />
            </div>
          </div>
          
          <div className="space-y-4 sm:space-y-6">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="bg-white/40 backdrop-blur-md rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-200/30">
                <div className="flex items-start justify-between mb-3 sm:mb-4">
                  <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                    <Skeleton variant="circular" width={40} height={40} className="sm:w-12 sm:h-12" />
                    <Skeleton width={140} height={16} className="sm:w-[180px] sm:h-5" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton variant="circular" width={24} height={24} className="sm:w-8 sm:h-8" />
                    <Skeleton variant="circular" width={24} height={24} className="sm:w-8 sm:h-8" />
                  </div>
                </div>
                
                <Skeleton lines={2} className="mb-3 sm:mb-4" />
                <Skeleton height={6} variant="rounded" className="mb-3 sm:mb-4 sm:h-2" />
                <Skeleton height={80} variant="rounded" className="sm:h-24" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Skeleton;
