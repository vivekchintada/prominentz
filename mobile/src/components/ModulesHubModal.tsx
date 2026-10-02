import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '../theme/colors'
import { triggerHaptic } from './Haptics'

export type AllModulesKey =
  | 'OVERVIEW'
  | 'ORDERS'
  | 'ONLINE_ORDERS'
  | 'TABLES'
  | 'KDS'
  | 'WAITLIST'
  | 'BOOKINGS'
  | 'MENU_86'
  | 'STOCK'
  | 'STAFF'


interface ModulesHubModalProps {
  visible: boolean
  activeTab: AllModulesKey
  onSelectModule: (key: AllModulesKey) => void
  onClose: () => void
  restaurantName?: string
}

interface ModuleItem {
  key: AllModulesKey
  title: string
  subtitle: string
  icon: keyof typeof Ionicons.glyphMap
  badge?: string
  badgeColor?: string
  iconColor: string
}

const MODULE_SECTIONS: { title: string; items: ModuleItem[] }[] = [
  {
    title: 'Operations & Floor',
    items: [
      {
        key: 'OVERVIEW',
        title: 'Executive Pulse',
        subtitle: 'Sales, net rev, table occupancy & KPIs',
        icon: 'stats-chart',
        badge: 'Live',
        badgeColor: Colors.systemGreen,
        iconColor: Colors.systemBlue,
      },
      {
        key: 'TABLES',
        title: 'Tables & Floor',
        subtitle: 'Visual floor map, check fire & orders',
        icon: 'grid',
        badge: 'Floor',
        badgeColor: Colors.systemOrange,
        iconColor: Colors.systemOrange,
      },
      {
        key: 'ORDERS',
        title: 'POS Dine-In Orders',
        subtitle: 'Check history, payments & receipts',
        icon: 'receipt',
        iconColor: '#38bdf8',
      },
      {
        key: 'ONLINE_ORDERS',
        title: 'Online Orders & Delivery',
        subtitle: 'DoorDash, UberEats & Direct Web pickup',
        icon: 'bicycle',
        badge: 'Sync',
        badgeColor: Colors.systemGreen,
        iconColor: '#e02828',
      },
      {
        key: 'KDS',
        title: 'Kitchen Display (KDS)',
        subtitle: 'Ticket rail, item strikes & timers',
        icon: 'flame',
        badge: 'Kitchen',
        badgeColor: Colors.systemRed,
        iconColor: Colors.systemRed,
      },
    ],
  },
  {
    title: 'Guest Experience & Front of House',
    items: [
      {
        key: 'WAITLIST',
        title: 'Walk-in Waitlist',
        subtitle: 'Queue times, party sizes & SMS alert',
        icon: 'hourglass',
        badge: 'Live Queue',
        badgeColor: Colors.systemBlue,
        iconColor: '#ec4899',
      },
      {
        key: 'BOOKINGS',
        title: 'Table Bookings',
        subtitle: 'Upcoming reservations & VIP notes',
        icon: 'calendar',
        iconColor: '#8b5cf6',
      },
    ],
  },
  {
    title: 'Kitchen & Inventory',
    items: [
      {
        key: 'MENU_86',
        title: 'Menu & 86 Item Studio',
        subtitle: 'Instant stock toggle & dish catalog',
        icon: 'restaurant',
        badge: '86 Switch',
        badgeColor: Colors.systemRed,
        iconColor: '#10b981',
      },
      {
        key: 'STOCK',
        title: 'Stock & Inventory',
        subtitle: 'Ingredients, low stock alerts & costs',
        icon: 'cube',
        badge: 'Critical',
        badgeColor: Colors.systemRed,
        iconColor: '#f97316',
      },
    ],
  },
  {
    title: 'Workforce & Shifts',
    items: [
      {
        key: 'STAFF',
        title: 'Attendance & Workforce',
        subtitle: 'Active staff timeclock & shift trade approvals',
        icon: 'time',
        iconColor: '#06b6d4',
      },
    ],
  },
]

export function ModulesHubModal({
  visible,
  activeTab,
  onSelectModule,
  onClose,
  restaurantName,
}: ModulesHubModalProps) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Prominentz Modules</Text>
              <Text style={styles.headerSubtitle}>
                {restaurantName || 'All SaaS Features Synchronized'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => {
                triggerHaptic.selection()
                onClose()
              }}
            >
              <Ionicons name="close-circle" size={28} color={Colors.secondaryLabel} />
            </TouchableOpacity>
          </View>

          {/* Module Sections */}
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {MODULE_SECTIONS.map((sec, secIdx) => (
              <View key={secIdx} style={styles.sectionBlock}>
                <Text style={styles.sectionTitle}>{sec.title}</Text>
                <View style={styles.gridContainer}>
                  {sec.items.map((item) => {
                    const isActive = activeTab === item.key

                    return (
                      <TouchableOpacity
                        key={item.key}
                        style={[styles.moduleCard, isActive && styles.moduleCardActive]}
                        onPress={() => {
                          triggerHaptic.selection()
                          onSelectModule(item.key)
                          onClose()
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={styles.cardTop}>
                          <View style={[styles.iconContainer, { backgroundColor: `${item.iconColor}20` }]}>
                            <Ionicons name={item.icon} size={22} color={item.iconColor} />
                          </View>
                          {item.badge ? (
                            <View
                              style={[
                                styles.badgePill,
                                { backgroundColor: `${item.badgeColor || Colors.systemBlue}20` },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.badgeText,
                                  { color: item.badgeColor || Colors.systemBlue },
                                ]}
                              >
                                {item.badge}
                              </Text>
                            </View>
                          ) : isActive ? (
                            <View
                              style={[
                                styles.badgePill,
                                { backgroundColor: 'rgba(10, 132, 255, 0.2)' },
                              ]}
                            >
                              <Text style={[styles.badgeText, { color: Colors.systemBlue }]}>
                                Active
                              </Text>
                            </View>
                          ) : null}
                        </View>

                        <Text style={[styles.moduleTitle, isActive && { color: Colors.systemBlue }]}>
                          {item.title}
                        </Text>
                        <Text style={styles.moduleSubtitle} numberOfLines={2}>
                          {item.subtitle}
                        </Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.secondarySystemGroupedBackground,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.systemBackground,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    backgroundColor: Colors.secondarySystemGroupedBackground,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.label,
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.secondaryLabel,
    marginTop: 2,
  },
  closeBtn: {
    padding: 2,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 20,
  },
  sectionBlock: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.secondaryLabel,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: 4,
  },
  gridContainer: {
    gap: 10,
  },
  moduleCard: {
    backgroundColor: Colors.secondarySystemGroupedBackground,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  moduleCardActive: {
    borderColor: Colors.systemBlue,
    borderWidth: 2,
    backgroundColor: 'rgba(10, 132, 255, 0.12)',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  moduleTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.label,
    marginBottom: 3,
  },
  moduleSubtitle: {
    fontSize: 12,
    color: Colors.secondaryLabel,
    lineHeight: 16,
  },
})
