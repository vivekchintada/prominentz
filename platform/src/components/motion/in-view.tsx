'use client'

import React, { useRef, useEffect, useState, ReactNode } from 'react'
import { motion, Variants, Transition } from 'motion/react'

interface InViewProps {
  children: ReactNode
  variants?: Variants
  transition?: Transition
  /** Whether to only animate once (true) or every time in view (false) */
  once?: boolean
  /** IntersectionObserver root margin */
  rootMargin?: string
  /** IntersectionObserver threshold */
  threshold?: number | number[]
  className?: string
  style?: React.CSSProperties
}

const defaultVariants: Variants = {
  hidden: { opacity: 0, y: 16, filter: 'blur(4px)' },
  visible: { opacity: 1, y: 0, filter: 'blur(0px)' },
}

const defaultTransition: Transition = {
  duration: 0.45,
  ease: [0.25, 0.1, 0.25, 1],
}

export function InView({
  children,
  variants = defaultVariants,
  transition = defaultTransition,
  once = true,
  rootMargin = '0px 0px -40px 0px',
  threshold = 0,
  className,
  style,
}: InViewProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true)
        if (once) observer.disconnect()
      } else if (!once) {
        setInView(false)
      }
    }, { rootMargin, threshold })
    observer.observe(el)
    return () => observer.disconnect()
  }, [once, rootMargin, threshold])

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={variants}
      transition={transition}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  )
}
