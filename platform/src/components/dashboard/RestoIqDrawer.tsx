'use client'

import React, { useState, useEffect, useRef } from 'react'

interface MessageItem {
  id: string
  role: 'user' | 'assistant'
  content: string
  executedTools?: Array<{ toolName: string; summary: string }>
  actionType?: string
  actionDirectives?: Array<{
    id: string
    label: string
    prompt: string
    severity?: 'CRITICAL' | 'WARNING' | 'OPPORTUNITY' | 'INFO'
  }>
  timestamp: string
}

export function RestoIqDrawer() {
  const [isOpen, setIsOpen] = useState(false)
  const [inputPrompt, setInputPrompt] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: 'msg-welcome',
      role: 'assistant',
      content: `### 🧠 Resto IQ Autonomous Agent Active

I am continuously monitoring and managing **every operational domain** across live POS, KDS velocity, ingredient stock pars, labor ratios, and void audits:
* 🎯 **Shift Health Score & Threat Index**
* 🚨 **Proactive Anomaly Triage & Root Cause Diagnoses**
* ⚡ **1-Click Autonomous Action Directives**
* 📦 **Auto-86 Dish Protection & Supplier POs**

*How can I assist your operations right now?* Tap any autonomous directive below or enter a directive command.`,
      actionDirectives: [
        { id: 'act-init-update', label: '🧠 Full Resto IQ Agent Update', prompt: 'Resto IQ Agent Update', severity: 'OPPORTUNITY' },
        { id: 'act-init-triage', label: '🚨 Proactive Anomaly Triage', prompt: 'Proactive Anomaly Triage', severity: 'WARNING' },
        { id: 'act-init-86', label: '🚫 86 Atlantic Salmon', prompt: '86 Atlantic Salmon', severity: 'CRITICAL' },
        { id: 'act-init-po', label: '📦 Auto-Draft Restock PO', prompt: 'Create purchase order for low stock items', severity: 'WARNING' },
      ],
      timestamp: '',
    },
  ])

  const chatEndRef = useRef<HTMLDivElement>(null)

  // Avoid SSR hydration mismatch for timestamp
  useEffect(() => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === 'msg-welcome' && m.timestamp === ''
          ? { ...m, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
          : m
      )
    )
  }, [])

  useEffect(() => {
    if (isOpen && chatEndRef.current) {
      chatEndRef.current.scrollTop = chatEndRef.current.scrollHeight
    }
  }, [messages, isThinking, isOpen])

  const quickPills = [
    '🧠 Resto IQ Agent Update',
    '🚨 Proactive Anomaly Triage',
    '🍳 Kitchen Velocity & Delays',
    '💰 Labor Margin & Profitability',
    '🛡️ Loss Prevention & Voids',
    '🚫 86 Atlantic Salmon',
    '📦 Auto-Draft Restock PO',
    '👥 Suggest Labor Cuts',
  ]

  const handleSend = async (customText?: string) => {
    const text = (customText || inputPrompt).trim()
    if (!text || isThinking) return

    const userMessage: MessageItem = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputPrompt('')
    setIsThinking(true)

    try {
      const res = await fetch('/api/ai/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: text,
          history: messages.slice(-5).map((m) => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content,
          })),
        }),
      })

      if (res.ok) {
        const data = await res.json()
        const agentMessage: MessageItem = {
          id: `agt-${Date.now()}`,
          role: 'assistant',
          content: data.reply || 'No response generated.',
          executedTools: data.executedTools || [],
          actionType: data.actionType,
          actionDirectives: data.actionDirectives || [],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
        setMessages((prev) => [...prev, agentMessage])
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'assistant',
            content: '⚠️ Unable to process query. Please check network connection.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ])
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: `⚠️ Error communicating with Resto IQ orchestrator: ${err.message}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ])
    } finally {
      setIsThinking(false)
    }
  }

  return (
    <>
      {/* ── Floating Trigger Button (Bottom Right) ─────────────────────────── */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          position: 'fixed',
          bottom: 24,
          right: 28,
          zIndex: 1050,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '12px 20px',
          background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
          color: '#ffffff',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: 9999,
          fontWeight: 800,
          fontSize: 14,
          boxShadow: '0 10px 25px -5px rgba(37, 99, 235, 0.4), 0 8px 10px -6px rgba(37, 99, 235, 0.2)',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          transform: isOpen ? 'scale(0.96)' : 'scale(1)',
        }}
        title="Open Resto IQ Autonomous Co-Pilot"
      >
        <span style={{ fontSize: 18 }}>🧠</span>
        <span>Resto IQ Co-Pilot</span>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#22c55e',
            boxShadow: '0 0 8px #22c55e',
            marginLeft: 2,
          }}
        />
      </button>

      {/* ── Co-Pilot Drawer / Floating Console ─────────────────────────────── */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: 84,
            right: 28,
            width: 440,
            maxWidth: 'calc(100vw - 40px)',
            height: 600,
            maxHeight: 'calc(100vh - 120px)',
            backgroundColor: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 20,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
            zIndex: 1100,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'kpiModalFadeIn 0.2s ease-out',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px 20px',
              background: 'var(--color-bg-card)',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  background: 'rgba(37, 99, 235, 0.12)',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                }}
              >
                🧠
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--color-text-primary)' }}>
                  Resto IQ Operations Co-Pilot
                </h4>
                <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
                  Connected to Live PostgreSQL Telemetry
                </span>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--color-text-secondary)',
                cursor: 'pointer',
                fontSize: 18,
                fontWeight: 700,
                padding: '4px 8px',
                borderRadius: 6,
              }}
              title="Minimize Co-Pilot"
            >
              ✕
            </button>
          </div>

          {/* Quick Action Prompt Chips */}
          <div
            style={{
              padding: '10px 16px',
              background: 'var(--color-bg-primary)',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              gap: 6,
              overflowX: 'auto',
              whiteSpace: 'nowrap',
            }}
          >
            {quickPills.map((pill) => (
              <button
                key={pill}
                onClick={() => handleSend(pill)}
                disabled={isThinking}
                style={{
                  padding: '5px 10px',
                  borderRadius: 8,
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-bg-card)',
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#2563eb'
                  e.currentTarget.style.color = '#2563eb'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-border)'
                  e.currentTarget.style.color = 'var(--color-text-secondary)'
                }}
              >
                {pill}
              </button>
            ))}
          </div>

          {/* Chat Messages List */}
          <div
            ref={chatEndRef}
            style={{
              flex: 1,
              padding: '16px 20px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            {messages.map((m) => {
              const isAgent = m.role === 'assistant'
              return (
                <div
                  key={m.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isAgent ? 'flex-start' : 'flex-end',
                  }}
                >
                  <div
                    style={{
                      maxWidth: '92%',
                      padding: '12px 16px',
                      borderRadius: 14,
                      background: isAgent ? 'var(--color-bg-primary)' : '#2563eb',
                      color: isAgent ? 'var(--color-text-primary)' : '#ffffff',
                      border: isAgent ? '1px solid var(--color-border)' : 'none',
                      fontSize: 13,
                      lineHeight: 1.5,
                      boxShadow: 'var(--shadow-sm)',
                    }}
                  >
                    {/* Tool Badges if Agent executed tools */}
                    {m.executedTools && m.executedTools.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                        {m.executedTools.map((t, idx) => (
                          <span
                            key={idx}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: 10,
                              fontWeight: 800,
                              background: 'rgba(37, 99, 235, 0.12)',
                              color: '#2563eb',
                              padding: '2px 6px',
                              borderRadius: 4,
                            }}
                            title={t.summary}
                          >
                            ⚡ Tool: {t.toolName}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Formatted Markdown-like Content */}
                    <div style={{ whiteSpace: 'pre-wrap' }}>{m.content}</div>

                    {/* Action Execution Confirmation Badge */}
                    {m.actionType && (
                      <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8, background: 'rgba(48, 209, 88, 0.15)', border: '1px solid rgba(48, 209, 88, 0.35)', color: '#30D158', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>⚡</span> Action Executed: <strong>{m.actionType}</strong>
                      </div>
                    )}

                    {/* Interactive Autonomous Action Directives */}
                    {m.actionDirectives && m.actionDirectives.length > 0 && (
                      <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--color-border)' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>⚡</span> Click to Execute Recommended Directive:
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {m.actionDirectives.map((act) => (
                            <button
                              key={act.id}
                              onClick={() => handleSend(act.prompt)}
                              disabled={isThinking}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                fontSize: 11,
                                fontWeight: 700,
                                padding: '6px 12px',
                                borderRadius: 8,
                                backgroundColor: act.severity === 'CRITICAL' ? 'rgba(239, 68, 68, 0.15)' : act.severity === 'WARNING' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(37, 99, 235, 0.15)',
                                color: act.severity === 'CRITICAL' ? '#ef4444' : act.severity === 'WARNING' ? '#f59e0b' : '#3b82f6',
                                border: act.severity === 'CRITICAL' ? '1px solid rgba(239, 68, 68, 0.35)' : act.severity === 'WARNING' ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid rgba(37, 99, 235, 0.35)',
                                cursor: isThinking ? 'not-allowed' : 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              {act.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Timestamp */}
                    {m.timestamp && (
                      <div
                        style={{
                          fontSize: 10,
                          color: isAgent ? 'var(--color-text-tertiary)' : 'rgba(255, 255, 255, 0.7)',
                          marginTop: 6,
                          textAlign: 'right',
                        }}
                      >
                        {m.timestamp}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            {isThinking && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--color-bg-primary)', borderRadius: 10, width: 'fit-content' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#2563eb', animation: 'ping 1s infinite' }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)' }}>
                  Resto IQ is querying live telemetry & reasoning...
                </span>
              </div>
            )}
          </div>

          {/* Input Footer */}
          <div
            style={{
              padding: '12px 16px',
              background: 'var(--color-bg-card)',
              borderTop: '1px solid var(--color-border)',
              display: 'flex',
              gap: 8,
              alignItems: 'center',
            }}
          >
            <input
              type="text"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSend()
              }}
              placeholder="Ask Resto IQ about kitchen, stock, tables, voids, sales..."
              disabled={isThinking}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: 12,
                border: '1px solid var(--color-border)',
                background: 'var(--color-bg-primary)',
                color: 'var(--color-text-primary)',
                fontSize: 13,
                outline: 'none',
              }}
            />
            <button
              onClick={() => handleSend()}
              disabled={isThinking || !inputPrompt.trim()}
              style={{
                padding: '10px 16px',
                borderRadius: 12,
                border: 'none',
                background: isThinking || !inputPrompt.trim() ? 'var(--color-border)' : '#2563eb',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: 13,
                cursor: isThinking || !inputPrompt.trim() ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  )
}
