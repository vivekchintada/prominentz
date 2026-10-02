'use client'

import React, { ReactNode } from 'react'
import { motion, Variants, Transition } from 'motion/react'

interface AnimatedGroupProps {
  children: ReactNode
  className?: string
  style?: React.CSSProperties
  variants?: {
    container?: Variants
    item?: Variants
  }
  transition?: Transition
}

const defaultContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.05,
    },
  },
}

const defaultItemVariants: Variants = {
  hidden: { opacity: 0, y: 12, filter: 'blur(4px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] },
  },
}

export function AnimatedGroup({
  children,
  className,
  style,
  variants,
}: AnimatedGroupProps) {
  const containerVariants = variants?.container ?? defaultContainerVariants
  const itemVariants = variants?.item ?? defaultItemVariants

  return (
    <motion.div
      className={className}
      style={style}
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {React.Children.map(children, (child, i) => (
        <motion.div key={i} variants={itemVariants}>
          {child}
        </motion.div>
      ))}
    </motion.div>
  )
}
