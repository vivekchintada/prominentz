import React, { useState, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Colors } from '../theme/colors'
import { Api } from '../api/client'

type Status = 'checking' | 'online' | 'offline' | 'slow'

export function ConnectionIndicator() {
  const [status, setStatus] = useState<Status>('checking')
  const [latencyMs, setLatencyMs] = useState<number | null>(null)

  const check = useCallback(async () => {
    const { ok, latencyMs: ms } = await Api.healthCheck()
    setLatencyMs(ms)
    if (!ok) setStatus('offline')
    else if (ms > 800) setStatus('slow')
    else setStatus('online')
  }, [])

  useEffect(() => {
    check()
    const interval = setInterval(check, 30_000)
    return () => clearInterval(interval)
  }, [])

  const dotColor =
    status === 'online' ? Colors.systemGreen
    : status === 'slow' ? Colors.systemOrange
    : status === 'offline' ? Colors.systemRed
    : Colors.secondaryLabel

  const label =
    status === 'online' ? (latencyMs ? `${latencyMs}ms` : 'Live')
    : status === 'slow' ? 'Slow'
    : status === 'offline' ? 'Offline'
    : '...'

  return (
    <TouchableOpacity style={styles.container} onPress={check} activeOpacity={0.7}>
      <View style={[styles.dot, { backgroundColor: dotColor }, status === 'online' && styles.dotPulse]} />
      <Text style={[styles.text, { color: dotColor }]}>{label}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.secondarySystemBackground,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.cardBorder,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  dotPulse: {},
  text: { fontSize: 11, fontWeight: '700' },
})
