'use client'

import React, { useState, useEffect, useRef } from 'react'

interface AgentFinding {
  id: string
  severity: 'CRITICAL' | 'WARNING' | 'OPPORTUNITY' | 'INFO'
  category: 'KITCHEN' | 'LABOR' | 'INVENTORY' | 'FINANCIAL' | 'VIP_CRM'
  title: string
  description: string
  metric?: string
  actionLabel?: string
  actionDirective?: string
  timestamp: string
}

interface ChatMessage {
  id: string
  sender: 'user' | 'agent'
  text: string
  actionType?: string
  actionData?: unknown
  executedTools?: string[]
  actionDirectives?: Array<{
    id: string
    label: string
    prompt: string
    severity?: 'CRITICAL' | 'WARNING' | 'OPPORTUNITY' | 'INFO'
  }>
  timestamp: string
}

interface AgentTelemetry {
  liveSales: number
  activeTables: string
  kitchenQueue: number
  delayedTickets: number
  laborPercentage: number
  criticalStockCount: number
  vipGuestsTonight: number
}

export default function AgentCommandCenterClient() {
  const [telemetry, setTelemetry] = useState<AgentTelemetry | null>(null)
  const [findings, setFindings] = useState<AgentFinding[]>([])
  const [lastScanAt, setLastScanAt] = useState<string>('')
  const [isScanning, setIsScanning] = useState(false)
  
  // Chat console state — initialize with empty timestamp to avoid SSR/client hydration mismatch
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'agent',
      text: `### 🧠 Resto IQ Autonomous Agent Active

I am continuously monitoring and managing **every operational domain** across live POS, KDS cook velocity, ingredient safety pars, labor overhead, and void audits:
* 🎯 **Dynamic Shift Health Score & Threat Level**
* 🚨 **Proactive Anomaly Triage & Root Cause Diagnoses**
* ⚡ **1-Click Autonomous Action Directives**
* 📦 **Auto-86 Menu Protection & Supplier Restock POs**

*How can I assist your operations right now?* Tap any autonomous directive below or enter a directive command.`,
      actionDirectives: [
        { id: 'act-w-update', label: '🧠 Full Resto IQ Agent Update', prompt: 'Resto IQ Agent Update', severity: 'OPPORTUNITY' },
        { id: 'act-w-triage', label: '🚨 Proactive Anomaly Triage', prompt: 'Proactive Anomaly Triage', severity: 'WARNING' },
        { id: 'act-w-86', label: '🚫 86 Atlantic Salmon', prompt: '86 Atlantic Salmon', severity: 'CRITICAL' },
        { id: 'act-w-po', label: '📦 Auto-Draft Restock PO', prompt: 'Create purchase order for low stock items', severity: 'WARNING' },
      ],
      timestamp: '',
    },
  ])

  // Set welcome message timestamp on client only to avoid hydration mismatch
  useEffect(() => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === 'welcome-1' && m.timestamp === ''
          ? { ...m, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
          : m
      )
    )
  }, [])
  const [inputPrompt, setInputPrompt] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // Quick Action Chips
  const quickChips = [
    '🧠 Resto IQ Agent Update',
    '🚨 Proactive Anomaly Triage',
    '🍳 Kitchen Velocity & Delays',
    '💰 Labor Margin & Profitability',
    '🛡️ Loss Prevention & Voids',
    '🚫 86 Atlantic Salmon',
    '📦 Auto-Draft Restock PO',
    '👥 Suggest Labor Cuts',
  ]

  // Poll autonomous audit
  const runAuditScan = async () => {
    setIsScanning(true)
    try {
      const res = await fetch('/api/ai/agent/audit')
      if (res.ok) {
        const data = await res.json()
        setFindings(data.findings || [])
        setTelemetry(data.telemetry || null)
        setLastScanAt(new Date(data.lastScanAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
      }
    } catch (err) {
      console.error('Failed to run agent scan:', err)
    } finally {
      setIsScanning(false)
    }
  }

  useEffect(() => {
    runAuditScan()
    const interval = setInterval(runAuditScan, 20000) // Autonomous scan every 20s
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages, isThinking])

  // Handle Chat Submit
  const handleSendMessage = async (customPrompt?: string) => {
    const text = (customPrompt || inputPrompt).trim()
    if (!text || isThinking) return

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages((prev) => [...prev, userMsg])
    if (!customPrompt) setInputPrompt('')
    setIsThinking(true)

    try {
      const res = await fetch('/api/ai/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text, currentPage: '/dashboard/ai' }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to get agent response')
      }

      const toolsUsed = Array.isArray(data.executedTools)
        ? data.executedTools.map((t: unknown) => typeof t === 'string' ? t : t.tool)
        : []

      const agentMsg: ChatMessage = {
        id: `agent-${Date.now()}`,
        sender: 'agent',
        text: data.reply || data.message || 'Analysis complete.',
        actionType: data.actionType,
        actionData: data.actionData || data.data,
        executedTools: toolsUsed,
        actionDirectives: data.actionDirectives || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }

      setMessages((prev) => [...prev, agentMsg])

      // If an action was executed (e.g. 86ing, creating PO, priority flag), re-run audit immediately
      if (data.actionType) {
        runAuditScan()
      }
    } catch (err: unknown) {
      setMessages((prev) => [
        ...prev,
        {
          id: `agent-err-${Date.now()}`,
          sender: 'agent',
          text: `⚠️ **Agent Error:** ${err.message || 'Could not complete the directive.'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ])
    } finally {
      setIsThinking(false)
    }
  }

  const getSeverityStyle = (severity: AgentFinding['severity']) => {
    switch (severity) {
      case 'CRITICAL':
        return { bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.4)', text: '#ef4444', badge: '#ef4444' }
      case 'WARNING':
        return { bg: 'rgba(217, 119, 6, 0.12)', border: 'rgba(217, 119, 6, 0.4)', text: 'var(--brand-amber, #d97706)', badge: 'var(--brand-amber, #d97706)' }
      case 'OPPORTUNITY':
        return { bg: 'rgba(5, 150, 105, 0.12)', border: 'rgba(5, 150, 105, 0.4)', text: 'var(--brand-emerald, #059669)', badge: 'var(--brand-emerald, #059669)' }
      default:
        return { bg: 'rgba(5, 150, 105, 0.08)', border: 'rgba(5, 150, 105, 0.25)', text: 'var(--brand-emerald, #059669)', badge: 'var(--brand-emerald, #059669)' }
    }
  }

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
      {/* ── Autonomous Radar HUD Bar ──────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '999px', backgroundColor: 'rgba(5, 150, 105, 0.15)', color: 'var(--brand-emerald, #059669)', border: '1px solid rgba(5, 150, 105, 0.3)' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--brand-emerald, #059669)', boxShadow: '0 0 8px var(--brand-emerald, #059669)' }} />
            AUTONOMOUS AGENT ACTIVE
          </span>
          <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
            360° Real-Time Cross-System Observability (Llama 3.1 Function Calling Engine)
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
            Last scan: <strong style={{ color: 'var(--color-text-primary)' }}>{lastScanAt || 'Scanning...'}</strong>
          </span>
          <button
            onClick={runAuditScan}
            disabled={isScanning}
            className="btn btn--secondary btn--sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            🔄 {isScanning ? 'Scanning...' : 'Scan Now'}
          </button>
        </div>
      </div>

      {/* ── Live Telemetry Cards HUD ────────────────────────────────────────── */}
      {telemetry && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '24px' }}>
          <div className="card" style={{ padding: '14px 16px', borderRadius: '12px', backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>Live Sales Today</div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--brand-emerald, #059669)', marginTop: '4px' }}>${telemetry.liveSales.toFixed(2)}</div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: '2px' }}>{telemetry.activeTables} tables active</div>
          </div>

          <div className="card" style={{ padding: '14px 16px', borderRadius: '12px', backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>Kitchen Queue</div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: telemetry.delayedTickets > 0 ? '#ef4444' : '#60a5fa', marginTop: '4px' }}>
              {telemetry.kitchenQueue} Tickets
            </div>
            <div style={{ fontSize: '11px', color: telemetry.delayedTickets > 0 ? '#ef4444' : 'var(--color-text-tertiary)', marginTop: '2px' }}>
              {telemetry.delayedTickets} delayed &gt; 15m
            </div>
          </div>

          <div className="card" style={{ padding: '14px 16px', borderRadius: '12px', backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>Labor Cost %</div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: telemetry.laborPercentage > 35 ? 'var(--brand-amber, #d97706)' : 'var(--brand-emerald, #059669)', marginTop: '4px' }}>
              {telemetry.laborPercentage}%
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: '2px' }}>Target &le; 30%</div>
          </div>

          <div className="card" style={{ padding: '14px 16px', borderRadius: '12px', backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>Low Stock Alerts</div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: telemetry.criticalStockCount > 0 ? 'var(--brand-amber, #d97706)' : 'var(--brand-emerald, #059669)', marginTop: '4px' }}>
              {telemetry.criticalStockCount} Items
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: '2px' }}>below minimum</div>
          </div>

          <div className="card" style={{ padding: '14px 16px', borderRadius: '12px', backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>VIP Diners Tonight</div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--brand-amber, #d97706)', marginTop: '4px' }}>
              {telemetry.vipGuestsTonight} Guests
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: '2px' }}>high LTV priority</div>
          </div>
        </div>
      )}


      {/* ── Main Two-Column Layout ─────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 420px) 1fr', gap: '24px', alignItems: 'start' }}>
        
        {/* Left Column: Autonomous Findings Stream */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🚨</span> Autonomous Agent Findings ({findings.length})
            </h2>
            <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)' }}>Real-time evaluation</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '720px', overflowY: 'auto', paddingRight: '4px' }}>
            {findings.length === 0 ? (
              <div style={{ padding: '24px', borderRadius: '12px', backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px dashed rgba(255, 255, 255, 0.1)', textAlign: 'center', color: 'rgba(255, 255, 255, 0.4)' }}>
                <span style={{ fontSize: '24px' }}>✅</span>
                <p style={{ margin: '8px 0 0', fontSize: '13px' }}>All systems operating within optimal thresholds. No anomalies detected.</p>
              </div>
            ) : (
              findings.map((f) => {
                const style = getSeverityStyle(f.severity)
                return (
                  <div
                    key={f.id}
                    style={{
                      padding: '16px',
                      borderRadius: '12px',
                      backgroundColor: style.bg,
                      border: `1px solid ${style.border}`,
                      transition: 'transform 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                      <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', backgroundColor: style.badge, color: '#000000', textTransform: 'uppercase' }}>
                        {f.severity}
                      </span>
                      {f.metric && (
                        <span style={{ fontSize: '11px', fontWeight: 700, color: style.text }}>
                          {f.metric}
                        </span>
                      )}
                    </div>

                    <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '10px 0 4px', color: '#ffffff' }}>
                      {f.title}
                    </h3>
                    <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.75)', margin: '0 0 12px', lineHeight: 1.4 }}>
                      {f.description}
                    </p>

                    {f.actionDirective && (
                      <button
                        onClick={() => handleSendMessage(f.actionDirective)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          fontSize: '12px',
                          fontWeight: 700,
                          borderRadius: '8px',
                          backgroundColor: style.badge,
                          color: '#000000',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                        }}
                      >
                        ⚡ {f.actionLabel || 'Investigate & Resolve'}
                      </button>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Right Column: Multi-Turn Agent Interactive Console */}
        <div style={{ backgroundColor: 'var(--color-bg-card)', borderRadius: '16px', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', height: '640px', overflow: 'hidden' }}>
          
          {/* Console Header */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--color-bg-card)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--surface-raised)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
                🧠
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)' }}>Resto IQ Interactive Dialogue</div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>Powered by Llama 3.1 &bull; 360&deg; Telemetry Connected</div>
              </div>
            </div>
            <button
              onClick={() => setMessages([messages[0]])}
              style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Clear History
            </button>
          </div>

          {/* Quick Action Suggestion Chips */}
          <div style={{ padding: '12px 16px', backgroundColor: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)', display: 'flex', gap: '8px', overflowX: 'auto', whiteSpace: 'nowrap' }}>
            {quickChips.map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(chip)}
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '5px 12px',
                  borderRadius: '20px',
                  backgroundColor: 'rgba(99, 102, 241, 0.12)',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  color: '#818cf8',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Chat Message Stream */}
          <div ref={chatContainerRef} style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {messages.map((m) => (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: m.sender === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginBottom: '4px', padding: '0 4px' }}>
                  {m.sender === 'user' ? 'You' : 'Resto IQ Agent'} &bull; {m.timestamp}
                </div>

                <div
                  style={{
                    maxWidth: '85%',
                    padding: '14px 18px',
                    borderRadius: m.sender === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    backgroundColor: m.sender === 'user' ? 'var(--brand-emerald, #059669)' : 'var(--color-bg)',
                    border: m.sender === 'user' ? 'none' : '1px solid var(--color-border)',
                    color: m.sender === 'user' ? '#ffffff' : 'var(--color-text-primary)',
                    fontSize: '13px',
                    lineHeight: '1.6',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {m.executedTools && m.executedTools.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                      {m.executedTools.map((tool, idx) => (
                        <span
                          key={idx}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            backgroundColor: 'rgba(99, 102, 241, 0.15)',
                            color: '#818cf8',
                            border: '1px solid rgba(99, 102, 241, 0.3)',
                          }}
                        >
                          ⚙️ {tool}
                        </span>
                      ))}
                    </div>
                  )}

                  {m.text}

                  {m.actionType && (
                    <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '8px', backgroundColor: 'rgba(48, 209, 88, 0.15)', border: '1px solid rgba(48, 209, 88, 0.4)', color: '#30D158', fontSize: '12px', fontWeight: 600 }}>
                      ⚡ Action Executed: <strong>{m.actionType}</strong>
                    </div>
                  )}

                  {/* Interactive Recommended Directives */}
                  {m.actionDirectives && m.actionDirectives.length > 0 && (
                    <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--color-border)' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>⚡</span> Click to Execute Recommended Directive:
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {m.actionDirectives.map((act) => (
                          <button
                            key={act.id}
                            onClick={() => handleSendMessage(act.prompt)}
                            disabled={isThinking}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '6px 12px',
                              borderRadius: '8px',
                              backgroundColor: act.severity === 'CRITICAL' ? 'rgba(239, 68, 68, 0.15)' : act.severity === 'WARNING' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                              color: act.severity === 'CRITICAL' ? '#ef4444' : act.severity === 'WARNING' ? '#f59e0b' : '#818cf8',
                              border: act.severity === 'CRITICAL' ? '1px solid rgba(239, 68, 68, 0.35)' : act.severity === 'WARNING' ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid rgba(99, 102, 241, 0.35)',
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
                </div>
              </div>
            ))}

            {isThinking && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 18px', borderRadius: '12px', backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', maxWidth: '300px' }}>
                <span style={{ fontSize: '16px' }}>🧠</span>
                <span style={{ fontSize: '12px', color: '#a855f7', fontWeight: 600 }}>
                  Agent reasoning &amp; querying telemetry...
                </span>
              </div>
            )}
          </div>

          {/* Chat Input Console */}
          <div style={{ padding: '16px', borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-card)' }}>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSendMessage()
              }}
              style={{ display: 'flex', gap: '10px' }}
            >
              <input
                type="text"
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                placeholder='Ask "Audit today comps", "86 Salmon", "Who is clocked in?", "Draft PO for Metro"...'
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--color-bg)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                disabled={isThinking || !inputPrompt.trim()}
                style={{
                  padding: '12px 24px',
                  borderRadius: '10px',
                  background: isThinking || !inputPrompt.trim() ? 'rgba(5, 150, 105, 0.4)' : 'var(--brand-emerald, #059669)',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: isThinking || !inputPrompt.trim() ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'background 0.15s ease',
                }}
              >
                Send Directive →
              </button>
            </form>
          </div>

        </div>
      </div>

      {/* ── Autonomous Operations Automation Rules ─────────────────── */}
      <div style={{ marginTop: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>⚡</span> Autonomous Operations &amp; Safety Guardrails
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
              Proactive system policies triggered automatically across inventory, cook velocity, and labor thresholds
            </p>
          </div>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--brand-emerald, #059669)', padding: '3px 8px', borderRadius: '6px', background: 'rgba(5, 150, 105, 0.12)' }}>
            4 / 4 Rules Active
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
          {[
            {
              id: 'rule-86',
              name: 'Zero-Stock Auto 86',
              desc: 'Automatically mark menu items unavailable on POS & QR when primary ingredient inventory reaches zero.',
              status: 'ACTIVE',
              trigger: 'Stock = 0 kg/unit',
              icon: '🚫',
            },
            {
              id: 'rule-kds-expedite',
              name: 'Ticket Velocity Escalation',
              desc: 'Highlight tickets in urgent red on expo pass when cook ticket age exceeds 15 minutes without prep bump.',
              status: 'ACTIVE',
              trigger: 'Age > 15 mins',
              icon: '⏱️',
            },
            {
              id: 'rule-overtime-guard',
              name: 'Overtime Margin Guard',
              desc: 'Proactively flag employees approaching 38 scheduled weekly hours to prevent 1.5x overtime wage surge.',
              status: 'ACTIVE',
              trigger: 'Hours >= 38h',
              icon: '⚠️',
            },
            {
              id: 'rule-vip-seat',
              name: 'VIP Guest Arrival Alert',
              desc: 'Notify manager and senior server instantly when high-LTV or VIP tier reservation is seated.',
              status: 'ACTIVE',
              trigger: 'VIP Diners Table Link',
              icon: '👑',
            },
          ].map((rule) => (
            <div
              key={rule.id}
              style={{
                padding: '16px 18px',
                borderRadius: '12px',
                background: 'var(--color-bg-card)',
                border: '1px solid var(--color-border)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>{rule.icon}</span>
                    <span style={{ fontWeight: 800, fontSize: '13px', color: 'var(--color-text-primary)' }}>{rule.name}</span>
                  </div>
                  <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', background: 'rgba(5, 150, 105, 0.15)', color: 'var(--brand-emerald, #059669)' }}>
                    {rule.status}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: '1.4' }}>
                  {rule.desc}
                </p>
              </div>
              <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
                <span>Trigger: <strong style={{ color: 'var(--color-text-primary)' }}>{rule.trigger}</strong></span>
                <span style={{ color: 'var(--brand-emerald, #059669)', fontWeight: 700 }}>● Automated</span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
