'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

const MIN_DISPLAY_MS = 800;

export default function GlobalLoader() {
  const pathname = usePathname();
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Listen for route change start
    const handleStart = () => {
      setShow(true);
      setProgress(0);
    };

    // Listen for route change complete
    const handleComplete = () => {
      // Ensure minimum display time for smooth UX
      const startTime = Date.now();
      const checkMin = () => {
        if (Date.now() - startTime >= MIN_DISPLAY_MS) {
          setProgress(100);
          setTimeout(() => setShow(false), 300);
        } else {
          requestAnimationFrame(checkMin);
        }
      };
      checkMin();
    };

    // Simulate progress
    let interval: ReturnType<typeof setInterval>;
    if (show) {
      setProgress(0);
      interval = setInterval(() => {
        setProgress(p => {
          if (p >= 90) return p;
          return p + Math.random() * 15 + 5;
        });
      }, 100);
    }

    // Use router events if available (Next.js App Router doesn't have router events,
    // so we use a simple approach with pathname changes)
    window.addEventListener('route:start', handleStart);
    window.addEventListener('route:end', handleComplete);

    // Also trigger on pathname change
    handleComplete();

    return () => {
      window.removeEventListener('route:start', handleStart);
      window.removeEventListener('route:end', handleComplete);
      if (interval) clearInterval(interval);
    };
  }, [pathname, show]);

  // Also show on initial page load
  useEffect(() => {
    const timer = setTimeout(() => {
      setProgress(100);
      setTimeout(() => setShow(false), 400);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[9999] pointer-events-none"
        >
          {/* Subtle overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.03 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black"
          />

          {/* Progress bar at top */}
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-slate-100">
            <motion.div
              className="h-full bg-gradient-to-r from-[#7C4DFF] via-[#C2185B] to-[#7C4DFF]"
              style={{
                width: `${Math.min(progress, 100)}%`,
                boxShadow: '0 0 12px rgba(124, 77, 255, 0.4)',
              }}
              transition={{ duration: 0.1 }}
            />
          </div>

          {/* Center spinner */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative"
            >
              {/* Outer ring */}
              <div className="w-12 h-12 rounded-full border-2 border-slate-200" />
              {/* Spinning arc */}
              <motion.div
                className="absolute inset-0 w-12 h-12 rounded-full border-2 border-transparent border-t-[#7C4DFF] border-r-[#C2185B]"
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
              />
              {/* Center dot */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-gradient-to-r from-[#7C4DFF] to-[#C2185B]" />
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
