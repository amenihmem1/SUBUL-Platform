'use client';

import { CheckCircle, BookOpen, Clock, Award, LucideIcon } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';
import { StatColor, getStatBgClass } from '@/data/learnerDashboardData';
import { useLearnerDashboard } from '@/hooks/api/useLearnerDashboard';
import { Skeleton } from '@/components/ui/skeleton';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

// Animated number component
function AnimatedNumber({ value, duration = 1.5 }: { value: string; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  
  const numericValue = parseInt(value.replace(/[^0-9]/g, '')) || 0;
  const suffix = value.replace(/[0-9]/g, '');
  
  useEffect(() => {
    setIsAnimating(true);
    const startTime = Date.now();
    const startValue = displayValue;
    
    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / (duration * 1000), 1);
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentValue = Math.round(startValue + (numericValue - startValue) * easeOutQuart);
      
      setDisplayValue(currentValue);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
      }
    };
    
    requestAnimationFrame(animate);
  }, [numericValue, duration]);
  
  return (
    <motion.span
      animate={{ scale: isAnimating ? [1, 1.1, 1] : 1 }}
      transition={{ duration: 0.3 }}
    >
      {displayValue}{suffix}
    </motion.span>
  );
}
interface DashboardStatsGridProps {
  stats?: {
    label: string;
    value: string;
    icon: LucideIcon;
    color: StatColor;
  }[];
}

export function DashboardStatsGrid({ stats: propStats }: DashboardStatsGridProps) {
  const { t } = useTranslation();
  const { data, isLoading } = useLearnerDashboard();
  const s = data?.stats;
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [animateNumbers, setAnimateNumbers] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setAnimateNumbers(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const stats = propStats || [
    { 
      label: t('learnerDashboard.coursesCompleted'), 
      value: String(s?.coursesCompleted ?? 0), 
      icon: CheckCircle, 
      color: 'emerald' as StatColor,
    },
    { 
      label: t('learnerDashboard.inProgress'), 
      value: String(s?.inProgress ?? 0), 
      icon: BookOpen, 
      color: 'indigo' as StatColor,
    },
    { 
      label: t('learnerDashboard.totalStudyTime'), 
      value: s?.totalStudyTime ?? '0 h', 
      icon: Clock, 
      color: 'violet' as StatColor,
    },
    { 
      label: t('learnerDashboard.certificates'), 
      value: String(s?.certificatesCount ?? 0), 
      icon: Award, 
      color: 'amber' as StatColor,
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.9 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring" as const,
        stiffness: 100,
        damping: 15,
      },
    },
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="bg-card border border-border rounded-2xl p-6"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0 space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-8 w-1/2" />
                <Skeleton className="h-3 w-2/3" />
              </div>
              <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
            </div>
          </motion.div>
        ))}
      </div>
    );
  }

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-6"
    >
      {stats.map((stat, index) => (
        <motion.div
          key={String(stat.label)}
          variants={cardVariants}
          whileHover={{ 
            y: -8, 
            scale: 1.02,
            boxShadow: "0 20px 40px rgba(0,0,0,0.1), 0 0 0 1px hsl(var(--primary) / 0.2)"
          }}
          onHoverStart={() => setHoveredIndex(index)}
          onHoverEnd={() => setHoveredIndex(null)}
          className="group relative bg-card border border-border rounded-2xl p-6 overflow-hidden transition-all duration-300"
        >
          {/* Background gradient on hover */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          {/* Content */}
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground font-medium truncate mb-2">
                  {stat.label}
                </p>
                <motion.p 
                  animate={{ 
                    scale: hoveredIndex === index ? 1.05 : 1,
                    color: hoveredIndex === index ? "hsl(var(--primary))" : "hsl(var(--foreground))"
                  }}
                  className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold truncate transition-colors duration-300"
                >
                  {animateNumbers ? <AnimatedNumber value={stat.value} /> : stat.value}
                </motion.p>
              </div>
              <motion.div 
                animate={{ 
                  rotate: hoveredIndex === index ? 360 : 0,
                  scale: hoveredIndex === index ? 1.1 : 1
                }}
                transition={{ duration: 0.6, ease: "easeInOut" }}
                className={`p-3 rounded-xl ${getStatBgClass(stat.color)} shrink-0 relative overflow-hidden`}
              >
                <stat.icon className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7 relative z-10" />
                {/* Icon glow effect on hover */}
                <motion.div
                  className="absolute inset-0 bg-white/20 rounded-xl"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: hoveredIndex === index ? 1 : 0 }}
                  transition={{ duration: 0.3 }}
                />
              </motion.div>
            </div>
            
          </div>
          
          {/* Shimmer effect on hover */}
          <motion.div 
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12"
            initial={{ x: -100 }}
            animate={{ x: hoveredIndex === index ? 200 : -100 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
          />
        </motion.div>
      ))}
    </motion.div>
  );
}
