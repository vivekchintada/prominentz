import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '../theme/colors'
import { triggerHaptic } from './Haptics'
import { useNotifications } from '../api/hooks'

interface NotificationsModalProps {
  visible: boolean
  onClose: () => void
}

export function NotificationsModal({ visible, onClose }: NotificationsModalProps) {
  const { data, isLoading, isFetching, refetch } = useNotifications()
  const [readIds, setReadIds] = useState<Set<string>>(new Set())

  const notifications = data?.notifications || []

  const handleMarkAllRead = () => {
    triggerHaptic.selection()
    const allIds = new Set(notifications.map((n: any) => n.id))
    setReadIds(allIds)
  }

  const handleItemPress = (id: string) => {
    triggerHaptic.light()
    setReadIds((prev) => new Set([...prev, id]))
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

  const getIconName = (type: string): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'ORDER':
        return 'receipt-outline'
      case 'PAYMENT':
        return 'card-outline'
      case 'STOCK':
        return 'warning-outline'
      case 'WAITLIST':
        return 'people-outline'
      default:
        return 'notifications-outline'
    }
  }

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'urgent':
        return Colors.systemRed
      case 'warning':
        return Colors.systemOrange
      case 'success':
        return Colors.systemGreen
      default:
        return Colors.systemBlue
    }
  }

  const unreadCount = notifications.filter(
    (n: any) => !n.read && !readIds.has(n.id)
  ).length

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="notifications" size={20} color={Colors.systemBlue} />
              <Text style={styles.title}>Live Operations Alerts</Text>
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount} new</Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={22} color={Colors.secondaryLabel} />
            </TouchableOpacity>
          </View>

          {/* Subheader Toolbar */}
          <View style={styles.toolbar}>
            <Text style={styles.toolbarText}>
              Real-time events from SaaS, POS, KDS & Waitlist
            </Text>
            {unreadCount > 0 && (
              <TouchableOpacity onPress={handleMarkAllRead}>
                <Text style={styles.markReadText}>Mark all read</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Notifications List */}
          <ScrollView
            style={styles.list}
            contentContainerStyle={{ padding: 16, gap: 10 }}
            refreshControl={
              <RefreshControl
                refreshing={isFetching}
                onRefresh={() => {
                  triggerHaptic.light()
                  refetch()
                }}
                tintColor={Colors.systemBlue}
              />
            }
          >
            {isLoading && notifications.length === 0 ? (
              <View style={styles.centerBox}>
                <ActivityIndicator size="small" color={Colors.systemBlue} />
                <Text style={styles.emptyText}>Loading notifications...</Text>
              </View>
            ) : notifications.length === 0 ? (
              <View style={styles.centerBox}>
                <Ionicons name="checkmark-done-circle-outline" size={44} color={Colors.systemGreen} />
                <Text style={styles.emptyTitle}>All Caught Up</Text>
                <Text style={styles.emptyText}>No pending alerts or unread operational notices.</Text>
              </View>
            ) : (
              notifications.map((item: any) => {
                const isRead = item.read || readIds.has(item.id)
                const color = getSeverityColor(item.severity)

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.card,
                      !isRead && { borderColor: `${color}40`, backgroundColor: `${color}0D` },
                    ]}
                    onPress={() => handleItemPress(item.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.iconWrap, { backgroundColor: `${color}20` }]}>
                      <Ionicons name={getIconName(item.type)} size={18} color={color} />
                    </View>

                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={[styles.cardTitle, !isRead && { fontWeight: '800' }]} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <Text style={styles.timeText}>{getRelativeTime(item.timestamp)}</Text>
                      </View>
                      <Text style={styles.cardMessage}>{item.message}</Text>
                    </View>

                    {!isRead && <View style={[styles.unreadDot, { backgroundColor: color }]} />}
                  </TouchableOpacity>
                )
              })
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.doneBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.doneBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#12141C',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    borderTopWidth: 1,
    borderColor: '#262A38',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.label,
  },
  badge: {
    backgroundColor: Colors.systemBlue,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  closeBtn: {
    padding: 4,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: '#1E2230',
  },
  toolbarText: {
    fontSize: 12,
    color: Colors.secondaryLabel,
  },
  markReadText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.systemBlue,
  },
  list: {
    maxHeight: 460,
  },
  centerBox: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.label,
    marginTop: 4,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.secondaryLabel,
    textAlign: 'center',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#181B26',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#262A38',
    padding: 12,
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.label,
    flex: 1,
    marginRight: 6,
  },
  timeText: {
    fontSize: 11,
    color: Colors.secondaryLabel,
  },
  cardMessage: {
    fontSize: 12,
    color: Colors.secondaryLabel,
    marginTop: 3,
    lineHeight: 16,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderColor: '#1E2230',
  },
  doneBtn: {
    backgroundColor: '#262A38',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.label,
  },
})
