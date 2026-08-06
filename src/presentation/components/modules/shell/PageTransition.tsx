'use client';

import { motion } from 'framer-motion';

/**
 * Transición suave al cambiar de ruta dentro del dashboard. Duración corta
 * (150ms) a propósito: en una app de datos financieros la prioridad es que
 * se sienta rápida, la animación es un detalle, no el protagonista.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}
