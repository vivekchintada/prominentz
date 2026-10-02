import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

interface StatusBadgeProps {
  text: string
  color: string
}

export function StatusBadge({ text, color }: StatusBadgeProps) {
  return (
    <View style={[styles.container, { backgroundColor: `${color}25` }]}>
      <Text style={[styles.text, { color }]}>{text}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
})
