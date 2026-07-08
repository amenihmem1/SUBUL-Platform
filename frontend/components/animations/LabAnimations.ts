// Animations optimisées pour les labs
export const labAnimations = {
  // Progress bar simple
  progressBar: {
    initial: { width: 0 },
    animate: { width: "var(--progress)" },
    transition: { duration: 0.3, ease: "easeOut" }
  },
  
  // Hover simple
  hoverScale: {
    whileHover: { scale: 1.02 },
    whileTap: { scale: 0.98 },
    transition: { duration: 0.15 }
  },
  
  // Fade in simple
  fadeIn: {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3 }
  },
  
  // Check animation simple
  checkAnimation: {
    animate: { scale: [1, 1.1, 1] },
    transition: { duration: 0.2 }
  }
};
