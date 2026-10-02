'use client'

import React, { ReactNode } from 'react'
import { motion, AnimatePresence } from 'motion/react'

interface PageTransitionProps {
  children: ReactNode
  className?: string
  style?: React.CSSProperties
}

export function PageTransition({ children, className, style }: PageTransitionProps) {
  return (
    <motion.div
      className={className}
      style={style}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {children}
    </motion.div>
  )
}

interface FadeInProps {
  children: ReactNode
  delay?: number
  duration?: number
  className?: string
  style?: React.CSSProperties
  direction?: 'up' | 'down' | 'left' | 'right' | 'none'
}

export function FadeIn({
  children,
  delay = 0,
  duration = 0.4,
  className,
  style,
  direction = 'up',
}: FadeInProps) {
  const dirMap = {
    up: { y: 14 },
    down: { y: -14 },
    left: { x: 14 },
    right: { x: -14 },
    none: {},
  }

  return (
    <motion.div
      className={className}
      style={style}
      initial={{ opacity: 0, ...dirMap[direction] }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration, delay, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {children}
    </motion.div>
  )
}
