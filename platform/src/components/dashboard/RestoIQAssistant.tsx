'use client'

import React, { useState, useEffect, useRef } from 'react'

interface ActionDirective {
  id: string
  label: string
  prompt: string
  severity?: 'CRITICAL' | 'WARNING' | 'OPPORTUNITY' | 'INFO'
}

interface MessageItem {
  id: string
  sender: 'user' | 'assistant'
  text: string
  intent?: string
  actionType?: string
  actionData?: any
  actionDirectives?: ActionDirective[]
  stats?: { label: string; value: string }[]
  actionableDishCards?: Array<{
    id: string
    name: string
    price: number
    category: string
    is86d: boolean
    dietary: string[]
  }>
  suggestedPills?: string[]
  timestamp: string
}

export function RestoIQAssistant() {
  const [isOpen, setIsOpen] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [currentRoute, setCurrentRoute] = useState('')
  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: 'msg-welcome',
      sender: 'assistant',
      text: `### ✨ RestoIQ AI Co-Pilot
I am powered by a universal **RAG + Operational Telemetry** brain. You can ask me **anything** about:

- 🍽️ **Menu, Recipes & Allergens:** (e.g. *"Is the Truffle Risotto gluten-free?"*, *"What wine pairs with Ribeye?"*)
- 💰 **Live Sales & P&L:** (e.g. *"What is our revenue and check average right now?"*)
- 🍳 **Kitchen & KDS Delays:** (e.g. *"Which station has backlogged tickets?"*)
- ⚡ **Direct Actions:** (e.g. *"86 Salmon"*, *"Prioritize Table 4"*, *"Comp 15% Table 2"*)
- 📖 **Platform Guides:** (e.g. *"How do I split a check on the POS?"*)`,
      suggestedPills: [
        '🍷 What wine pairs with Ribeye?',
        '🍳 Check KDS delays',
        '💰 Today sales & labor %',
        '🌾 Show gluten-free dishes',
        '⚡ Prioritize Table 1',
      ],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ])

  const chatEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Track active page route
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentRoute(window.location.pathname)
    }
  }, [isOpen])

  // Global keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setIsOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150)
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [isOpen, messages, loading])

  // Voice speech-to-text recognition
  const toggleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Voice dictation is not supported in this browser. Please use Chrome, Edge, or Safari.')
      return
    }

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRec()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'

    if (isListening) {
      recognition.stop()
      setIsListening(false)
      return
    }

    setIsListening(true)
    recognition.start()

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setPrompt(transcript)
      setIsListening(false)
      sendMessage(transcript)
    }

    recognition.onerror = () => setIsListening(false)
    recognition.onend = () => setIsListening(false)
  }

  // Dynamic context-aware follow-up pills
  const getFollowUpPills = (query: string): string[] => {
    const q = query.toLowerCase()
    if (q.includes('sales') || q.includes('revenue') || q.includes('check')) {
      return ['👥 Check labor cost %', '🏆 Top selling dishes', '💳 Payment breakdown']
    }
    if (q.includes('kitchen') || q.includes('kds') || q.includes('cook') || q.includes('delay')) {
      return ['⚡ Prioritize Table 1', '👥 Who is in kitchen?', '🚫 86 delayed item']
    }
    if (q.includes('stock') || q.includes('inventory') || q.includes('po') || q.includes('ingredient')) {
      return ['📦 Draft PO for Metro', '🚫 86 Salmon', '📋 View all suppliers']
    }
    if (q.includes('labor') || q.includes('staff') || q.includes('team') || q.includes('shift')) {
      return ['👥 Who is clocked in?', '💰 Today wage bill', '📅 Shift schedule']
    }
    if (q.includes('wine') || q.includes('pair') || q.includes('allergy') || q.includes('ingredient')) {
      return ['🍷 Best dessert pairing', '🌱 Vegan options', '🌾 Gluten-free dishes']
    }
    return ['📊 Executive 360° Briefing', '🍳 Kitchen speed check', '📦 Critical low stock']
  }

  const sendMessage = async (customText?: string) => {
    const activeText = (customText || prompt).trim()
    if (!activeText || loading) return

    const userMessage: MessageItem = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: activeText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages((prev) => [...prev, userMessage])
    if (!customText) setPrompt('')
    setLoading(true)

    try {
      const res = await fetch('/api/ai/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: activeText,
          currentPage: currentRoute,
          mode: 'operator',
          history: messages
            .filter((m) => m.sender !== 'assistant' || m.id !== 'msg-welcome')
            .slice(-6)
            .map((m) => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text })),
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to analyze request')
      }

      const assistantMsg: MessageItem = {
        id: `asst-${Date.now()}`,
        sender: 'assistant',
        // new agent returns `reply`, old route returned `message`
        text: data.reply || data.message || 'Analysis complete.',
        intent: data.intent,
        actionType: data.actionType,
        actionData: data.actionData,
        actionDirectives: data.actionDirectives || [],
        stats: data.stats,
        actionableDishCards: data.actionableDishCards,
        suggestedPills: data.suggestedPills || getFollowUpPills(activeText),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }

      setMessages((prev) => [...prev, assistantMsg])
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `asst-err-${Date.now()}`,
          sender: 'assistant',
          text: `⚠️ **Resto IQ Alert:** ${err.message || 'An unexpected error occurred. Please try again.'}`,
          suggestedPills: ['📊 Executive 360° Briefing', '🔄 Try again'],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleUndoAction = (actionType?: string, actionData?: any) => {
    if (actionType === '86_ITEM' && actionData?.itemName) {
      sendMessage(`Restore item ${actionData.itemName}`)
    } else if (actionType === 'PRIORITIZE_TICKET' && actionData?.table) {
      sendMessage(`Table ${actionData.table} priority resolved`)
    } else {
      sendMessage('Undo last action')
    }
  }

  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, sans-serif' }}>
      
      {/* ── Meta AI Signature Gradient Swirl Trigger ──────────────────────── */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '4px',
          borderRadius: '9999px',
          background: 'conic-gradient(from 180deg at 50% 50%, #5b45f5 0deg, #8b5cf6 90deg, #ec4899 180deg, #06b6d4 270deg, #5b45f5 360deg)',
          border: 'none',
          boxShadow: '0 12px 36px -4px rgba(37, 99, 235, 0.4), 0 0 20px rgba(139, 92, 246, 0.25)',
          cursor: 'pointer',
          transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          transform: isOpen ? 'scale(0.92)' : 'scale(1)',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05) translateY(-2px)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = isOpen ? 'scale(0.92)' : 'scale(1)')}
        title="RestoIQ Meta AI Co-Pilot (Cmd+K)"
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          borderRadius: '9999px',
          backgroundColor: '#0a0b10',
          color: '#ffffff',
          fontWeight: 700,
          fontSize: '13px',
          letterSpacing: '-0.01em',
        }}>
          {/* Animated Meta Ring Graphic */}
          <div style={{
            width: '18px',
            height: '18px',
            borderRadius: '50%',
            background: 'conic-gradient(from 0deg, #5b45f5, #8b5cf6, #06b6d4, #5b45f5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#0a0b10' }} />
          </div>
          <span>RestoIQ</span>
          <span style={{ fontSize: '10px', color: '#a1a1aa', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', padding: '1px 5px' }}>
            ⌘K
          </span>
        </div>
      </button>

      {/* ── Executive Meta AI Glassmorphic Copilot Drawer ───────────────────── */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            bottom: '68px',
            right: '0',
            width: '480px',
            maxWidth: 'calc(100vw - 32px)',
            height: '680px',
            maxHeight: 'calc(100vh - 100px)',
            backgroundColor: '#0c0d12',
            borderRadius: '24px',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            boxShadow: '0 36px 80px -12px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.06)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            animation: 'fadeInUp 0.22s ease-out',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px 20px',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backdropFilter: 'blur(12px)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  background: 'conic-gradient(from 0deg, #5b45f5, #8b5cf6, #ec4899, #06b6d4, #5b45f5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
                }}
              >
                <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#0c0d12', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}>
                  ✨
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
                    RestoIQ Meta AI
                  </h3>
                  <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(91,69,245,0.15)', color: '#7b68f7', border: '0.5px solid rgba(91,69,245,0.3)' }}>
                    RAG LIVE
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255, 255, 255, 0.45)' }}>
                  Universal Knowledge &amp; Floor Co-Pilot
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => setMessages([messages[0]])}
                style={{ background: 'none', border: 'none', color: '#a1a1aa', fontSize: '12px', cursor: 'pointer', padding: '4px 8px', borderRadius: '6px' }}
                title="Clear conversation"
              >
                Clear
              </button>
              <button
                onClick={() => setIsOpen(false)}
                style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: '#a1a1aa', width: 28, height: 28, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}
                title="Close"
              >
                ×
              </button>
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            {messages.map((m) => (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: m.sender === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                {/* Bubble Container */}
                <div
                  style={{
                    maxWidth: '92%',
                    padding: '14px 16px',
                    borderRadius: m.sender === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    backgroundColor: m.sender === 'user' ? 'rgba(37, 99, 235, 0.18)' : '#15161d',
                    border: m.sender === 'user' ? '1px solid rgba(37, 99, 235, 0.35)' : '1px solid rgba(255, 255, 255, 0.07)',
                    color: '#ffffff',
                    fontSize: '13px',
                    lineHeight: '1.6',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {m.text}

                  {/* Interactive Executed Action Card */}
                  {m.actionType && (
                    <div style={{
                      marginTop: '12px',
                      padding: '12px 14px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(91,69,245,0.12)',
                      border: '1px solid rgba(91,69,245,0.3)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: '#7b68f7' }}>
                          ⚡ DIRECTIVE EXECUTED: {m.actionType.replace(/_/g, ' ')}
                        </span>
                        <button
                          onClick={() => handleUndoAction(m.actionType, m.actionData)}
                          style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            backgroundColor: 'rgba(255, 255, 255, 0.08)',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            color: '#e5e7eb',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          ↩️ Undo
                        </button>
                      </div>
                      {m.actionData?.message && (
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>{m.actionData.message}</div>
                      )}
                    </div>
                  )}

                  {/* RAG Retrieved Actionable Dish Recommendations */}
                  {m.actionableDishCards && m.actionableDishCards.length > 0 && (
                    <div style={{ marginTop: '12px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '6px' }}>
                        Matched Menu Dishes:
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {m.actionableDishCards.map((dish) => (
                          <div
                            key={dish.id}
                            style={{
                              padding: '8px 12px',
                              borderRadius: '8px',
                              backgroundColor: 'rgba(255, 255, 255, 0.03)',
                              border: '1px solid rgba(255, 255, 255, 0.08)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                          >
                            <div>
                              <div style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc' }}>
                                {dish.name}
                                {dish.is86d && <span style={{ marginLeft: '6px', color: '#ef4444', fontSize: '10px' }}>(86d)</span>}
                              </div>
                              <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                                ${dish.price.toFixed(2)} · {dish.category} {dish.dietary.length > 0 ? `· ${dish.dietary.join(', ')}` : ''}
                              </div>
                            </div>
                            <button
                              onClick={() => sendMessage(`Tell me ingredients and pairings for ${dish.name}`)}
                              style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                padding: '4px 8px',
                                borderRadius: '6px',
                                backgroundColor: 'rgba(91,69,245,0.15)',
                                color: '#7b68f7',
                                border: '1px solid rgba(91,69,245,0.3)',
                                cursor: 'pointer',
                              }}
                            >
                              Details
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Live Stats KPI Cards */}
                  {m.stats && m.stats.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '12px' }}>
                      {m.stats.map((s, idx) => (
                        <div key={idx} style={{ padding: '8px 10px', borderRadius: '8px', backgroundColor: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                          <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.45)', textTransform: 'uppercase', fontWeight: 600 }}>{s.label}</div>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: '#7b68f7', marginTop: '2px' }}>{s.value}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Autonomous Action Directives — clickable agent commands */}
                {m.actionDirectives && m.actionDirectives.length > 0 && (
                  <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>
                      ⚡ Recommended Actions
                    </div>
                    {m.actionDirectives.map((d) => {
                      const severityColor =
                        d.severity === 'CRITICAL' ? '#ef4444'
                        : d.severity === 'WARNING' ? '#f59e0b'
                        : d.severity === 'OPPORTUNITY' ? '#22c55e'
                        : '#7b68f7'
                      const severityBg =
                        d.severity === 'CRITICAL' ? 'rgba(239,68,68,0.12)'
                        : d.severity === 'WARNING' ? 'rgba(245,158,11,0.12)'
                        : d.severity === 'OPPORTUNITY' ? 'rgba(34,197,94,0.12)'
                        : 'rgba(59,130,246,0.12)'
                      return (
                        <button
                          key={d.id}
                          onClick={() => sendMessage(d.prompt)}
                          style={{
                            textAlign: 'left',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            backgroundColor: severityBg,
                            border: `1px solid ${severityColor}40`,
                            color: severityColor,
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            width: '100%',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.8' }}
                          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
                        >
                          {d.label}
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* Suggested Dynamic Follow-Up Prompt Pills */}
                {m.suggestedPills && m.suggestedPills.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px', paddingLeft: '2px' }}>
                    {m.suggestedPills.map((pill, pIdx) => (
                      <button
                        key={pIdx}
                        onClick={() => sendMessage(pill)}
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '5px 12px',
                          borderRadius: '16px',
                          backgroundColor: 'rgba(255, 255, 255, 0.04)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          color: 'rgba(255, 255, 255, 0.85)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(91,69,245,0.15)'
                          e.currentTarget.style.borderColor = 'rgba(37, 99, 235, 0.4)'
                          e.currentTarget.style.color = '#7b68f7'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)'
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)'
                          e.currentTarget.style.color = 'rgba(255, 255, 255, 0.85)'
                        }}
                      >
                        {pill}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Thinking Pulse */}
            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderRadius: '12px', backgroundColor: '#15161d', border: '1px solid rgba(255, 255, 255, 0.08)', width: 'fit-content' }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'conic-gradient(from 0deg, #5b45f5, #8b5cf6, #06b6d4, #5b45f5)', animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: '12px', color: '#7b68f7', fontWeight: 600 }}>
                  RestoIQ is retrieving RAG knowledge &amp; telemetry...
                </span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input Bar */}
          <div
            style={{
              padding: '14px 16px',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault()
                sendMessage()
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              {/* Voice Microphone Button */}
              <button
                type="button"
                onClick={toggleVoiceInput}
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  backgroundColor: isListening ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                  color: isListening ? '#ef4444' : 'rgba(255, 255, 255, 0.65)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '15px',
                  transition: 'all 0.2s ease',
                  flexShrink: 0,
                }}
                title={isListening ? 'Listening... tap to stop' : 'Tap to speak hands-free'}
              >
                {isListening ? '🎙️' : '🎤'}
              </button>

              {/* Chat Input Field */}
              <input
                ref={inputRef}
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder='Ask anything: "Wine pairings", "86 Salmon", "How to split bill"...'
                style={{
                  flex: 1,
                  padding: '11px 14px',
                  borderRadius: '10px',
                  backgroundColor: '#15161d',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#ffffff',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !prompt.trim()}
                style={{
                  padding: '11px 18px',
                  borderRadius: '10px',
                  border: 'none',
                  background: loading || !prompt.trim() ? '#27272a' : 'linear-gradient(135deg, #5b45f5, #7b68f7)',
                  color: '#ffffff',
                  cursor: loading || !prompt.trim() ? 'not-allowed' : 'pointer',
                  fontWeight: 700,
                  fontSize: '13px',
                  transition: 'all 0.2s ease',
                  flexShrink: 0,
                }}
              >
                Send
              </button>
            </form>
          </div>

        </div>
      )}
    </div>
  )
}
