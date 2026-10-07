import React, { useId } from 'react'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  helperText?: string
  error?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, helperText, error, leftIcon, rightIcon, className = '', id, disabled, ...props }, ref) => {
    const generatedId = useId()
    const inputId = id || generatedId
    const isInvalid = Boolean(error)

    return (
      <div className={`form-field ${disabled ? 'form-field--disabled' : ''} ${isInvalid ? 'form-field--error' : ''}`}>
        {label && (
          <label htmlFor={inputId} className="form-label">
            {label}
          </label>
        )}
        <div className="input-wrapper">
          {leftIcon && <span className="input-icon input-icon--left">{leftIcon}</span>}
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            aria-invalid={isInvalid}
            aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-help` : undefined}
            className={`form-input ${leftIcon ? 'form-input--has-left' : ''} ${
              rightIcon ? 'form-input--has-right' : ''
            } ${className}`}
            {...props}
          />
          {rightIcon && <span className="input-icon input-icon--right">{rightIcon}</span>}
        </div>
        {error ? (
          <p id={`${inputId}-error`} className="form-feedback form-feedback--error" role="alert">
            {error}
          </p>
        ) : helperText ? (
          <p id={`${inputId}-help`} className="form-feedback form-feedback--helper">
            {helperText}
          </p>
        ) : null}
      </div>
    )
  }
)

Input.displayName = 'Input'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  helperText?: string
  error?: string
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, helperText, error, className = '', id, disabled, rows = 3, ...props }, ref) => {
    const generatedId = useId()
    const textareaId = id || generatedId
    const isInvalid = Boolean(error)

    return (
      <div className={`form-field ${disabled ? 'form-field--disabled' : ''} ${isInvalid ? 'form-field--error' : ''}`}>
        {label && (
          <label htmlFor={textareaId} className="form-label">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          disabled={disabled}
          rows={rows}
          aria-invalid={isInvalid}
          aria-describedby={error ? `${textareaId}-error` : helperText ? `${textareaId}-help` : undefined}
          className={`form-input form-textarea ${className}`}
          {...props}
        />
        {error ? (
          <p id={`${textareaId}-error`} className="form-feedback form-feedback--error" role="alert">
            {error}
          </p>
        ) : helperText ? (
          <p id={`${textareaId}-help`} className="form-feedback form-feedback--helper">
            {helperText}
          </p>
        ) : null}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'

export interface SelectOption {
  value: string | number
  label: string
  disabled?: boolean
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  helperText?: string
  error?: string
  options?: SelectOption[]
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, helperText, error, options, children, className = '', id, disabled, ...props }, ref) => {
    const generatedId = useId()
    const selectId = id || generatedId
    const isInvalid = Boolean(error)

    return (
      <div className={`form-field ${disabled ? 'form-field--disabled' : ''} ${isInvalid ? 'form-field--error' : ''}`}>
        {label && (
          <label htmlFor={selectId} className="form-label">
            {label}
          </label>
        )}
        <div className="select-wrapper">
          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            aria-invalid={isInvalid}
            className={`form-input form-select ${className}`}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                    {opt.label}
                  </option>
                ))
              : children}
          </select>
          <span className="select-arrow" aria-hidden="true">
            ▾
          </span>
        </div>
        {error ? (
          <p id={`${selectId}-error`} className="form-feedback form-feedback--error" role="alert">
            {error}
          </p>
        ) : helperText ? (
          <p id={`${selectId}-help`} className="form-feedback form-feedback--helper">
            {helperText}
          </p>
        ) : null}
      </div>
    )
  }
)

Select.displayName = 'Select'

export interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  description?: string
  disabled?: boolean
  id?: string
}

export function Switch({ checked, onChange, label, description, disabled = false, id }: SwitchProps) {
  const generatedId = useId()
  const switchId = id || generatedId

  return (
    <div className={`switch-row ${disabled ? 'switch-row--disabled' : ''}`}>
      {(label || description) && (
        <div className="switch-text">
          {label && (
            <label htmlFor={switchId} className="switch-label">
              {label}
            </label>
          )}
          {description && <p className="switch-desc">{description}</p>}
        </div>
      )}
      <button
        type="button"
        role="switch"
        id={switchId}
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`switch-track ${checked ? 'switch-track--active' : ''}`}
      >
        <span className={`switch-thumb ${checked ? 'switch-thumb--active' : ''}`} />
      </button>
    </div>
  )
}
