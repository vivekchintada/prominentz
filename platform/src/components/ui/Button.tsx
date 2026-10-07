import React from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      className = '',
      type = 'button',
      ...props
    },
    ref
  ) => {
    const sizeClasses: Record<ButtonSize, string> = {
      sm: 'btn--sm',
      md: 'btn--md',
      lg: 'btn--lg',
    }

    const variantClasses: Record<ButtonVariant, string> = {
      primary: 'btn--primary',
      secondary: 'btn--secondary',
      outline: 'btn--outline',
      ghost: 'btn--ghost',
      danger: 'btn--danger',
    }

    const isInteractionDisabled = disabled || loading

    return (
      <button
        ref={ref}
        type={type}
        disabled={isInteractionDisabled}
        aria-busy={loading}
        className={`btn ${variantClasses[variant]} ${sizeClasses[size]} ${
          fullWidth ? 'btn--full' : ''
        } ${loading ? 'btn--loading' : ''} ${className}`}
        {...props}
      >
        {loading && (
          <span className="btn__spinner" aria-hidden="true">
            <svg
              className="animate-spin"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </span>
        )}
        {!loading && leftIcon && <span className="btn__icon btn__icon--left">{leftIcon}</span>}
        <span className="btn__text">{children}</span>
        {!loading && rightIcon && <span className="btn__icon btn__icon--right">{rightIcon}</span>}
      </button>
    )
  }
)

Button.displayName = 'Button'

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode
  'aria-label': string
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      icon,
      'aria-label': ariaLabel,
      variant = 'ghost',
      size = 'md',
      loading = false,
      disabled = false,
      className = '',
      type = 'button',
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        aria-label={ariaLabel}
        title={ariaLabel}
        disabled={disabled || loading}
        className={`icon-btn icon-btn--${variant} icon-btn--${size} ${className}`}
        {...props}
      >
        {loading ? (
          <span className="btn__spinner" aria-hidden="true">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            </svg>
          </span>
        ) : (
          icon
        )}
      </button>
    )
  }
)

IconButton.displayName = 'IconButton'
