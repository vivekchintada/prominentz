'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export interface AppNotification {
  id: string
  type: 'ORDER' | 'STOCK' | 'WAITLIST' | 'PAYMENT' | 'SYSTEM'
  title: string
  message: string
  timestamp: string
  read: boolean
  link?: string
  severity?: 'info' | 'warning' | 'success' | 'urgent'
}

interface NotificationsDropdownProps {
  isOpen: boolean
  onClose: () => void
}

export function NotificationsDropdown({ isOpen, onClose }: NotificationsDropdownProps) {
  const router = useRouter()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/notifications')
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications || [])
      }
    } catch (err) {
      console.error('Failed to load notifications', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchNotifications()
    }
  }, [isOpen])

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const handleNotificationClick = (item: AppNotification) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, read: true } : n))
    )
    onClose()
    if (item.link) {
      router.push(item.link)
    }
  }

  const getRelativeTime = (timestamp: string) => {
    const diffSecs = Math.max(0, Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000))
    if (diffSecs < 60) return 'Just now'
    const diffMins = Math.floor(diffSecs / 60)
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    return `${Math.floor(diffHours / 24)}d ago`
  }

  const getIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'ORDER':
        return '🛎️'
      case 'PAYMENT':
        return '💳'
      case 'STOCK':
        return '⚠️'
      case 'WAITLIST':
        return '⏱️'
      default:
        return '🔔'
    }
  }

  if (!isOpen) return null

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <div
      ref={dropdownRef}
      style={{
        position: 'absolute',
        top: 'calc(100% + 8px)',
        right: '0',
        width: '360px',
        maxHeight: '480px',
        backgroundColor: 'var(--color-bg-card, #1e2230)',
        border: '1px solid var(--color-border, #2e354b)',
        borderRadius: '16px',
        boxShadow: '0 16px 36px rgba(0,0,0,0.35)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: 'fadeInSlide 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px',
          borderBottom: '1px solid var(--color-border, #2e354b)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary, #fff)' }}>
            Notifications
          </span>
          {unreadCount > 0 && (
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                backgroundColor: 'var(--apple-blue, #0a84ff)',
                color: '#fff',
                padding: '2px 7px',
                borderRadius: '10px',
              }}
            >
              {unreadCount} new
            </span>
          )}
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--apple-blue, #0a84ff)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              padding: '2px 4px',
            }}
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Body List */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          maxHeight: '360px',
        }}
      >
        {loading && notifications.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--color-text-secondary, #94a3b8)', fontSize: '13px' }}>
            Syncing notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div style={{ padding: '40px 16px', textAlign: 'center' }}>
            <span style={{ fontSize: '28px' }}>🎉</span>
            <p style={{ marginTop: '8px', fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary, #fff)' }}>
              All caught up!
            </p>
            <p style={{ fontSize: '12px', color: 'var(--color-text-secondary, #94a3b8)', marginTop: '2px' }}>
              No pending alerts or unread operational notices.
            </p>
          </div>
        ) : (
          notifications.map((item) => (
            <div
              key={item.id}
              onClick={() => handleNotificationClick(item)}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '12px 16px',
                borderBottom: '1px solid var(--color-border, #242938)',
                cursor: 'pointer',
                backgroundColor: item.read ? 'transparent' : 'rgba(10, 132, 255, 0.05)',
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)')}
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = item.read ? 'transparent' : 'rgba(10, 132, 255, 0.05)')
              }
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  backgroundColor:
                    item.severity === 'urgent'
                      ? 'rgba(255, 69, 58, 0.15)'
                      : item.severity === 'warning'
                      ? 'rgba(255, 159, 10, 0.15)'
                      : item.severity === 'success'
                      ? 'rgba(48, 209, 88, 0.15)'
                      : 'rgba(10, 132, 255, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px',
                  flexShrink: 0,
                }}
              >
                {getIcon(item.type)}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p
                    style={{
                      fontSize: '13px',
                      fontWeight: item.read ? 600 : 700,
                      color: 'var(--color-text-primary, #fff)',
                      margin: 0,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {item.title}
                  </p>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-secondary, #94a3b8)', flexShrink: 0, marginLeft: '6px' }}>
                    {getRelativeTime(item.timestamp)}
                  </span>
                </div>
                <p
                  style={{
                    fontSize: '12px',
                    color: 'var(--color-text-secondary, #94a3b8)',
                    margin: '3px 0 0 0',
                    lineHeight: '1.4',
                  }}
                >
                  {item.message}
                </p>
              </div>

              {!item.read && (
                <div
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--apple-blue, #0a84ff)',
                    marginTop: '5px',
                    flexShrink: 0,
                  }}
                />
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '10px 16px',
          borderTop: '1px solid var(--color-border, #2e354b)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'rgba(0,0,0,0.1)',
        }}
      >
        <Link
          href="/dashboard/orders"
          onClick={onClose}
          style={{
            fontSize: '12px',
            color: 'var(--apple-blue, #0a84ff)',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          View Live Orders →
        </Link>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-text-secondary, #94a3b8)',
            fontSize: '12px',
            cursor: 'pointer',
          }}
        >
          Close
        </button>
      </div>
    </div>
  )
}
