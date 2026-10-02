import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '../theme/colors'
import { triggerHaptic } from './Haptics'

export type TabKey =
  | 'OVERVIEW'
  | 'TABLES'
  | 'ORDERS'
  | 'ONLINE_ORDERS'
  | 'KDS'
  | 'WAITLIST'
  | 'MENU_86'
  | 'BOOKINGS'
  | 'STOCK'
  | 'STAFF'

interface BottomTabBarProps {
  activeTab: TabKey
  onSelectTab: (tab: TabKey) => void
  onOpenHub: () => void
}

interface PrimaryTabDef {
  key: TabKey
  label: string
  icon: keyof typeof Ionicons.glyphMap
}

export function BottomTabBar({ activeTab, onSelectTab, onOpenHub }: BottomTabBarProps) {
  const primaryTabs: PrimaryTabDef[] = [
    { key: 'OVERVIEW', label: 'Pulse', icon: 'stats-chart' },
    { key: 'TABLES', label: 'Tables', icon: 'grid' },
    { key: 'ORDERS', label: 'Orders', icon: 'receipt' },
    { key: 'KDS', label: 'KDS', icon: 'flame' },
    { key: 'WAITLIST', label: 'Waitlist', icon: 'hourglass' },
    { key: 'MENU_86', label: 'Menu 86', icon: 'restaurant' },
  ]

  const isMoreTabActive = [
    'ONLINE_ORDERS',
    'BOOKINGS',
    'STOCK',
    'STAFF',
  ].includes(activeTab)

  const getMoreTabLabel = () => {
    switch (activeTab) {
      case 'ONLINE_ORDERS':
        return 'Online'
      case 'BOOKINGS':
        return 'Bookings'
      case 'STOCK':
        return 'Stock'
      case 'STAFF':
        return 'Staff'
      default:
        return 'More'
    }
  }

  const getMoreTabIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (activeTab) {
      case 'ONLINE_ORDERS':
        return 'bicycle'
      case 'BOOKINGS':
        return 'calendar'
      case 'STOCK':
        return 'cube'
      case 'STAFF':
        return 'people'
      default:
        return 'apps'
    }
  }

  return (
    <View style={styles.container}>
      {primaryTabs.map((tab) => {
        const isActive = activeTab === tab.key
        return (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabItem, isActive && styles.tabItemActive]}
            onPress={() => {
              triggerHaptic.selection()
              onSelectTab(tab.key)
            }}
            activeOpacity={0.7}
          >
            {isActive && <View style={styles.activePill} />}
            <Ionicons
              name={tab.icon}
              size={20}
              color={isActive ? Colors.systemBlue : Colors.secondaryLabel}
            />
            <Text
              style={[
                styles.tabLabel,
                { color: isActive ? Colors.systemBlue : Colors.secondaryLabel },
                isActive && styles.activeTabLabel,
              ]}
              numberOfLines={1}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        )
      })}

      {/* 7th Tab: More / All Modules Drawer */}
      <TouchableOpacity
        style={[styles.tabItem, isMoreTabActive && styles.tabItemActive]}
        onPress={() => {
          triggerHaptic.selection()
          onOpenHub()
        }}
        activeOpacity={0.7}
      >
        {isMoreTabActive && <View style={styles.activePill} />}
        <Ionicons
          name={getMoreTabIcon()}
          size={20}
          color={isMoreTabActive ? Colors.systemBlue : Colors.secondaryLabel}
        />
        <Text
          style={[
            styles.tabLabel,
            { color: isMoreTabActive ? Colors.systemBlue : Colors.secondaryLabel },
            isMoreTabActive && styles.activeTabLabel,
          ]}
          numberOfLines={1}
        >
          {getMoreTabLabel()}
        </Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.secondarySystemGroupedBackground,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
    paddingTop: 6,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    paddingHorizontal: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 5,
    borderRadius: 8,
  },
  tabItemActive: {
    backgroundColor: 'rgba(10, 132, 255, 0.12)',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  activeTabLabel: {
    fontWeight: '800',
  },
  activePill: {
    position: 'absolute',
    top: 1,
    width: 18,
    height: 2.5,
    backgroundColor: Colors.systemBlue,
    borderRadius: 2,
  },
})
