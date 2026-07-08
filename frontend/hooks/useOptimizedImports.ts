"use client";

import { useMemo } from 'react';

// Hook pour optimiser les imports et éviter les re-renders inutiles
export function useOptimizedImports() {
  // Import optimisé des composants UI
  const uiComponents = useMemo(() => {
    // Import direct des composants légers
    return {
      lightComponents: {
        Button: () => import('../components/ui/button'),
        Card: () => import('../components/ui/card'),
        Input: () => import('../components/ui/input'),
        Select: () => import('../components/ui/select'),
        Badge: () => import('../components/ui/badge')
      }
    };
  }, []);

  // Optimisation des images
  const optimizedImage = useMemo(() => (src: string, width: number, height: number) => {
    // Ajouter des paramètres d'optimisation d'image
    const params = new URLSearchParams({
      w: width.toString(),
      h: height.toString(),
      q: '80', // qualité 80%
      fm: 'webp' // format webp
    });
    
    return `${src}?${params.toString()}`;
  }, []);

  // Débounce pour les recherches
  const debounce = useMemo(() => {
    let timeout: NodeJS.Timeout;
    return (func: (...args: unknown[]) => void, delay: number) => {
      return (...args: unknown[]) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), delay);
      };
    };
  }, []);

  return {
    uiComponents,
    optimizedImage,
    debounce
  };
}
