import React from 'react'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'surface' | 'glass' | 'outline'
  interactive?: boolean
}

export function Card({ variant = 'default', interactive = false, className = '', children, ...props }: CardProps) {
  const variantClass = {
    default: 'card',
    surface: 'card card--surface',
    glass: 'card card--glass',
    outline: 'card card--outline',
  }[variant]

  return (
    <div className={`${variantClass} ${interactive ? 'card--interactive' : ''} ${className}`} {...props}>
      {children}
    </div>
  )
}

export function CardHeader({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`card-header ${className}`} {...props}>
      {children}
    </div>
  )
}

export function CardTitle({ className = '', children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={`card-title ${className}`} {...props}>
      {children}
    </h3>
  )
}

export function CardDescription({ className = '', children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={`card-desc ${className}`} {...props}>
      {children}
    </p>
  )
}

export function CardContent({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`card-content ${className}`} {...props}>
      {children}
    </div>
  )
}

export function CardFooter({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`card-footer ${className}`} {...props}>
      {children}
    </div>
  )
}

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: string | number
  height?: string | number
  circle?: boolean
}

export function Skeleton({ width, height, circle = false, className = '', style, ...props }: SkeletonProps) {
  return (
    <div
      className={`skeleton ${circle ? 'skeleton--circle' : ''} ${className}`}
      style={{
        width,
        height,
        ...style,
      }}
      aria-hidden="true"
      {...props}
    />
  )
}

export interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`empty-state ${className}`}>
      {icon && <div className="empty-state__icon">{icon}</div>}
      <h4 className="empty-state__title">{title}</h4>
      {description && <p className="empty-state__desc">{description}</p>}
      {action && <div className="empty-state__action">{action}</div>}
    </div>
  )
}

export interface AlertProps {
  variant?: 'info' | 'success' | 'warning' | 'danger'
  title?: string
  children: React.ReactNode
  onDismiss?: () => void
  className?: string
}

export function Alert({ variant = 'info', title, children, onDismiss, className = '' }: AlertProps) {
  return (
    <div className={`alert alert--${variant} ${className}`} role="alert">
      <div className="alert__body">
        {title && <h5 className="alert__title">{title}</h5>}
        <div className="alert__message">{children}</div>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="alert__close"
          aria-label="Dismiss alert"
        >
          ×
        </button>
      )}
    </div>
  )
}
