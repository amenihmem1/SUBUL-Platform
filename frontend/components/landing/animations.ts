export const fadeInUp = {
  hidden: { 
    opacity: 0, 
    y: 60,
    scale: 0.95
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { 
      duration: 0.8,
      ease: [0.25, 0.46, 0.45, 0.94] as const,
      type: "spring" as const,
      stiffness: 100
    },
  },
};

export const fadeInLeft = {
  hidden: { 
    opacity: 0, 
    x: -60,
    scale: 0.95
  },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { 
      duration: 0.8,
      ease: [0.25, 0.46, 0.45, 0.94] as const,
      type: "spring" as const,
      stiffness: 100
    },
  },
};

export const fadeInRight = {
  hidden: { 
    opacity: 0, 
    x: 60,
    scale: 0.95
  },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { 
      duration: 0.8,
      ease: [0.25, 0.46, 0.45, 0.94] as const,
      type: "spring" as const,
      stiffness: 100
    },
  },
};

export const scaleIn = {
  hidden: { 
    opacity: 0, 
    scale: 0.8,
    rotate: -5
  },
  visible: {
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: { 
      duration: 0.6,
      ease: [0.25, 0.46, 0.45, 0.94] as const,
      type: "spring" as const,
      stiffness: 120
    },
  },
};

export const slideUp = {
  hidden: { 
    opacity: 0, 
    y: 100,
    rotateX: 15
  },
  visible: {
    opacity: 1,
    y: 0,
    rotateX: 0,
    transition: { 
      duration: 0.7,
      ease: [0.25, 0.46, 0.45, 0.94] as const,
      type: "spring" as const,
      stiffness: 80
    },
  },
};

export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.3,
      ease: [0.25, 0.46, 0.45, 0.94] as const,
    },
  },
};

export const staggerContainerFast = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
      ease: [0.25, 0.46, 0.45, 0.94] as const,
    },
  },
};

export const bounceIn = {
  hidden: { 
    opacity: 0, 
    scale: 0.3,
    y: -50
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { 
      duration: 0.8,
      type: "spring" as const,
      stiffness: 200,
      damping: 15
    },
  },
};

export const rotateIn = {
  hidden: { 
    opacity: 0, 
    scale: 0,
    rotate: -180
  },
  visible: {
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: { 
      duration: 0.6,
      ease: [0.25, 0.46, 0.45, 0.94] as const,
      type: "spring" as const,
      stiffness: 150
    },
  },
};
