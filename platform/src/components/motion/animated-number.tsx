'use client'

import React, { useEffect } from 'react'
import { useSpring, useTransform, motion, SpringOptions, useMotionValueEvent } from 'motion/react'

interface AnimatedNumberProps {
  value: number
  className?: string
  style?: React.CSSProperties
  springOptions?: SpringOptions
  precision?: number
  prefix?: string
  suffix?: string
  formatFn?: (value: number) => string
}

const defaultSpring: SpringOptions = {
  bounce: 0,
  duration: 800,
}

export function AnimatedNumber({
  value,
  className,
  style,
  springOptions = defaultSpring,
  precision = 0,
  prefix = '',
  suffix = '',
  formatFn,
}: AnimatedNumberProps) {
  const spring = useSpring(value, springOptions)

  useEffect(() => {
    spring.set(value)
  }, [value, spring])

  const display = useTransform(spring, (current: number) => {
    if (formatFn) return formatFn(current)
    const rounded = parseFloat(current.toFixed(precision))
    return `${prefix}${rounded.toLocaleString()}${suffix}`
  })

  return (
    <motion.span className={className} style={{ ...style, display: 'inline' }}>
      {display}
    </motion.span>
  )
}
