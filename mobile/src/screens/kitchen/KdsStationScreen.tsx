import React, { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
  ActivityIndicator,
  Modal,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '../../theme/colors'
import { triggerHaptic } from '../../components/Haptics'
import { ConnectionIndicator } from '../../components/ConnectionIndicator'
import { ServerHostModal } from '../../components/ServerHostModal'
import { useKdsTickets, useBumpTicket, useRecallTicket } from '../../api/hooks'
import { useRealtimeEvents } from '../../api/useRealtimeEvents'
import { playKitchenChime } from '../../utils/audio'
import { KdsTicket, UserProfile } from '../../types/models'
import Toast from 'react-native-toast-message'

interface KdsStationScreenProps {
  user: UserProfile
  onLogout: () => void
  onSwitchRole: (role: 'OWNER' | 'SERVER') => void
}

const KDS_STATIONS = ['ALL', 'HOT', 'COLD', 'BAR', 'EXPO']

export function KdsStationScreen({ user, onLogout, onSwitchRole }: KdsStationScreenProps) {
  const [activeStation, setActiveStation] = useState('ALL')
  const [showHostModal, setShowHostModal] = useState(false)
  const [showRecallModal, setShowRecallModal] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [expandedTickets, setExpandedTickets] = useState<Set<string>>(new Set())

  // Per-item cooked/struck state (key: itemId, value: boolean)
  const [cookedItems, setCookedItems] = useState<Record<string, boolean>>({})

  // Recall rail of recently bumped tickets
  const [recentlyBumped, setRecentlyBumped] = useState<KdsTicket[]>([])

  const { data: tickets = [], isLoading, isFetching, refetch } = useKdsTickets(activeStation, 10_000)
  const bumpMutation = useBumpTicket()
  const recallMutation = useRecallTicket()

  // Real-time SSE — auto-invalidates query cache on events
  useRealtimeEvents({
    onConnect: () => console.log('[KDS] Real-time connected'),
    onDisconnect: () => console.log('[KDS] Real-time disconnected'),
  })

  // Audio chime & vibration when new tickets land on KDS
  const prevCountRef = useRef(tickets.length)
  useEffect(() => {
    if (tickets.length > prevCountRef.current && prevCountRef.current > 0) {
      if (soundEnabled) {
        playKitchenChime()
      }
      triggerHaptic.heavy()
      Toast.show({
        type: 'info',
        text1: '🔔 New Order Landed',
        text2: `${tickets.length - prevCountRef.current} new ticket(s) arrived on line`,
        visibilityTime: 2500,
      })
    }
    prevCountRef.current = tickets.length
  }, [tickets.length, soundEnabled])

  const [localElapsed, setLocalElapsed] = useState<Record<string, number>>({})

  // Local 1-second ticker for elapsed time display
  useEffect(() => {
    const timer = setInterval(() => {
      setLocalElapsed((prev) => {
        const next = { ...prev }
        tickets.forEach((t) => {
          next[t.id] = (prev[t.id] ?? t.elapsedSeconds) + 1
        })
        return next
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [tickets])

  const getElapsed = (ticket: KdsTicket) => localElapsed[ticket.id] ?? ticket.elapsedSeconds

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const getUrgencyColor = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    if (minutes >= 18) return Colors.systemRed
    if (minutes >= 10) return Colors.systemYellow
    return Colors.systemGreen
  }

  const toggleExpanded = (ticketId: string) => {
    setExpandedTickets((prev) => {
      const next = new Set(prev)
      next.has(ticketId) ? next.delete(ticketId) : next.add(ticketId)
      return next
    })
  }

  // Toggle individual item cooked status
  const handleToggleItemDone = (itemId: string) => {
    triggerHaptic.selection()
    setCookedItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }))
  }

  const isItemDone = (item: any) => cookedItems[item.id] ?? item.isCooked ?? false

  const isTicketAllDone = (ticket: KdsTicket) =>
    ticket.items.length > 0 && ticket.items.every((i) => isItemDone(i))

  const handleBumpTicket = async (ticket: KdsTicket) => {
    triggerHaptic.heavy()
    try {
      await bumpMutation.mutateAsync(ticket.id)

      // Add to recently bumped rail for easy undo/recall
      setRecentlyBumped((prev) => [ticket, ...prev.filter((t) => t.id !== ticket.id)].slice(0, 15))

      Toast.show({
        type: 'success',
        text1: `Ticket ${ticket.ticketNumber} Served`,
        text2: `${ticket.tableName} — bumped from kitchen rail`,
        visibilityTime: 2500,
      })
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to bump ticket', text2: 'Tap to retry' })
    }
  }

  const handleRecallTicket = async (ticket: KdsTicket) => {
    triggerHaptic.medium()
    try {
      await recallMutation.mutateAsync(ticket.id)
      setRecentlyBumped((prev) => prev.filter((t) => t.id !== ticket.id))
      Toast.show({
        type: 'success',
        text1: `Ticket ${ticket.ticketNumber} Restored`,
        text2: `${ticket.tableName} returned to active line`,
      })
    } catch {
      Toast.show({ type: 'error', text1: 'Recall Failed', text2: 'Could not restore ticket' })
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Navigation Bar */}
      <View style={styles.navBar}>
        <View>
          <Text style={styles.navTitle}>Kitchen Display (KDS)</Text>
          <Text style={styles.navSub}>
            {user.name} · {tickets.length} active tickets
          </Text>
        </View>

        <View style={styles.navRight}>
          {/* Sound Mute Toggle */}
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => {
              triggerHaptic.light()
              setSoundEnabled((v) => !v)
            }}
            activeOpacity={0.7}
          >
            <Ionicons
              name={soundEnabled ? 'volume-high-outline' : 'volume-mute-outline'}
              size={20}
              color={soundEnabled ? Colors.systemGreen : Colors.secondaryLabel}
            />
          </TouchableOpacity>

          {/* Ticket Recall Button */}
          {recentlyBumped.length > 0 && (
            <TouchableOpacity
              style={styles.recallHeaderBtn}
              onPress={() => {
                triggerHaptic.selection()
                setShowRecallModal(true)
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-undo-outline" size={15} color={Colors.systemOrange} />
              <Text style={styles.recallHeaderText}>Recall ({recentlyBumped.length})</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.hostChip}
            onPress={() => {
              triggerHaptic.light()
              setShowHostModal(true)
            }}
          >
            <Ionicons name="server-outline" size={13} color={Colors.systemBlue} />
            <Text style={styles.hostChipText}>SaaS</Text>
          </TouchableOpacity>

          <ConnectionIndicator />

          <TouchableOpacity style={styles.iconBtn} onPress={onLogout}>
            <Ionicons name="log-out-outline" size={22} color={Colors.label} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Role Switcher */}
      <View style={styles.roleBar}>
        <Text style={styles.roleLabel}>SWITCH VIEW:</Text>
        <TouchableOpacity
          style={styles.roleChip}
          onPress={() => {
            triggerHaptic.selection()
            onSwitchRole('OWNER')
          }}
        >
          <Text style={styles.roleChipText}>👑 Owner / GM</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.roleChip}
          onPress={() => {
            triggerHaptic.selection()
            onSwitchRole('SERVER')
          }}
        >
          <Text style={styles.roleChipText}>🤵 Server Handheld</Text>
        </TouchableOpacity>
      </View>

      {/* Station Selector Ribbon with High Contrast */}
      <View style={styles.stationsRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stationScroll}>
          {KDS_STATIONS.map((st) => {
            const isActive = activeStation === st
            return (
              <TouchableOpacity
                key={st}
                style={[styles.stationChip, isActive && styles.activeStationChip]}
                onPress={() => {
                  triggerHaptic.selection()
                  setActiveStation(st)
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.stationText, isActive && styles.activeStationText]}>
                  {st === 'ALL' ? 'ALL STATIONS' : `${st} STATION`}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </View>

      {/* Main Tickets Grid */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.systemBlue} />
          <Text style={styles.loadingText}>Syncing kitchen orders...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.ticketGrid}
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
          {tickets.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="restaurant-outline" size={54} color={Colors.secondaryLabel} />
              <Text style={styles.emptyTitle}>Kitchen Line is Clear!</Text>
              <Text style={styles.emptySub}>
                All tickets served for {activeStation === 'ALL' ? 'all stations' : `${activeStation} station`}.
              </Text>
            </View>
          ) : (
            tickets.map((ticket) => {
              const elapsed = getElapsed(ticket)
              const urgencyColor = getUrgencyColor(elapsed)
              const isExpanded = !expandedTickets.has(ticket.id)
              const allCooked = isTicketAllDone(ticket)

              return (
                <View
                  key={ticket.id}
                  style={[
                    styles.ticketCard,
                    { borderTopColor: urgencyColor },
                    allCooked && styles.ticketCardAllDone,
                  ]}
                >
                  {/* Ticket Header */}
                  <TouchableOpacity
                    style={styles.ticketHeader}
                    onPress={() => toggleExpanded(ticket.id)}
                    activeOpacity={0.8}
                  >
                    <View style={{ flex: 1 }}>
                      <View style={styles.ticketTitleRow}>
                        <Text style={styles.ticketNum}>{ticket.ticketNumber}</Text>
                        <Text style={styles.ticketTable}>{ticket.tableName}</Text>
                        <View style={[styles.stationBadge, { backgroundColor: `${urgencyColor}20` }]}>
                          <Text style={[styles.stationBadgeText, { color: urgencyColor }]}>
                            {ticket.station}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.ticketServer}>
                        {ticket.serverName} · {ticket.guestCount} guests
                        {ticket.notes ? ` · ⚠️ ${ticket.notes}` : ''}
                      </Text>
                    </View>
                    <View style={[styles.timerBadge, { backgroundColor: `${urgencyColor}22` }]}>
                      <Ionicons name="time" size={12} color={urgencyColor} />
                      <Text style={[styles.timerText, { color: urgencyColor }]}>
                        {formatTimer(elapsed)}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Interactive Items List */}
                  {isExpanded && (
                    <View style={styles.ticketItemsList}>
                      <Text style={styles.strikeHintText}>Tap item to mark done:</Text>
                      {ticket.items.map((item) => {
                        const done = isItemDone(item)

                        return (
                          <TouchableOpacity
                            key={item.id}
                            style={[styles.itemRow, done && styles.itemRowDone]}
                            onPress={() => handleToggleItemDone(item.id)}
                            activeOpacity={0.65}
                          >
                            <Text style={[styles.itemQty, done && styles.cookedText]}>
                              {item.quantity}×
                            </Text>
                            <View style={styles.itemDetails}>
                              <Text style={[styles.itemName, done && styles.cookedText]}>
                                {item.name}
                              </Text>
                              {item.modifiers?.map((m, i) => (
                                <Text key={i} style={styles.itemMod}>
                                  • {m}
                                </Text>
                              ))}
                              {item.specialNote && (
                                <Text style={styles.itemNote}>⚠️ {item.specialNote}</Text>
                              )}
                            </View>
                            <Ionicons
                              name={done ? 'checkmark-circle' : 'ellipse-outline'}
                              size={22}
                              color={done ? Colors.systemGreen : Colors.secondaryLabel}
                            />
                          </TouchableOpacity>
                        )
                      })}
                    </View>
                  )}

                  {/* Bump Button */}
                  <TouchableOpacity
                    style={[styles.bumpBtn, allCooked && styles.bumpBtnReady]}
                    onPress={() => handleBumpTicket(ticket)}
                    activeOpacity={0.8}
                    disabled={bumpMutation.isPending}
                  >
                    <Ionicons
                      name="checkmark-done"
                      size={18}
                      color={allCooked ? '#fff' : Colors.systemGreen}
                    />
                    <Text style={[styles.bumpBtnText, allCooked && { color: '#fff' }]}>
                      {allCooked ? 'Bump — All Items Plated ✓' : 'Bump Ticket'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )
            })
          )}
        </ScrollView>
      )}

      {/* Ticket Recall Drawer Modal */}
      <Modal
        visible={showRecallModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowRecallModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.recallModalContainer}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Recently Served Tickets</Text>
                <Text style={styles.modalSub}>
                  Restore accidentally bumped orders back to the active kitchen line
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowRecallModal(false)} style={{ padding: 4 }}>
                <Ionicons name="close" size={24} color={Colors.label} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.recallList}>
              {recentlyBumped.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptySub}>No recently served tickets to recall.</Text>
                </View>
              ) : (
                recentlyBumped.map((t) => (
                  <View key={t.id} style={styles.recallCard}>
                    <View style={{ flex: 1, gap: 4 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={styles.recallNum}>{t.ticketNumber}</Text>
                        <Text style={styles.recallTable}>{t.tableName}</Text>
                        <View style={styles.recalledBadge}>
                          <Text style={styles.recalledBadgeText}>SERVED</Text>
                        </View>
                      </View>
                      <Text style={styles.recallItems}>
                        {t.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.restoreBtn}
                      onPress={() => handleRecallTicket(t)}
                      disabled={recallMutation.isPending}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="arrow-undo" size={16} color="#FFFFFF" />
                      <Text style={styles.restoreBtnText}>Restore</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <ServerHostModal
        visible={showHostModal}
        onClose={() => setShowHostModal(false)}
        onSaved={() => refetch()}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.systemGroupedBackground },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  navTitle: { fontSize: 20, fontWeight: '800', color: Colors.label },
  navSub: { fontSize: 12, color: Colors.secondaryLabel, marginTop: 2 },
  navRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: { padding: 4 },
  recallHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 159, 10, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 159, 10, 0.4)',
  },
  recallHeaderText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.systemOrange,
  },
  hostChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondarySystemGroupedBackground,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  hostChipText: { fontSize: 11, fontWeight: '700', color: Colors.label },
  roleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: Colors.secondarySystemGroupedBackground,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
    gap: 8,
  },
  roleLabel: { fontSize: 10, fontWeight: '800', color: Colors.tertiaryLabel, letterSpacing: 0.5 },
  roleChip: {
    backgroundColor: Colors.systemGroupedBackground,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  roleChipText: { fontSize: 11, fontWeight: '700', color: Colors.label },
  stationsRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  stationScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  stationChip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
  },
  activeStationChip: {
    backgroundColor: Colors.systemBlue,
    borderColor: Colors.systemBlue,
  },
  stationText: { fontSize: 12, fontWeight: '800', color: Colors.secondaryLabel, letterSpacing: 0.5 },
  activeStationText: { color: '#fff' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: Colors.secondaryLabel },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: Colors.label },
  emptySub: { fontSize: 13, color: Colors.secondaryLabel, textAlign: 'center' },
  ticketGrid: { padding: 16, gap: 16, paddingBottom: 80 },
  ticketCard: {
    backgroundColor: Colors.secondarySystemGroupedBackground,
    borderRadius: 16,
    borderTopWidth: 4,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    overflow: 'hidden',
  },
  ticketCardAllDone: {
    borderColor: Colors.systemGreen,
    borderWidth: 2,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  ticketTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  ticketNum: { fontSize: 18, fontWeight: '900', color: Colors.label },
  ticketTable: { fontSize: 15, fontWeight: '700', color: Colors.secondaryLabel },
  stationBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  stationBadgeText: { fontSize: 10, fontWeight: '800' },
  ticketServer: { fontSize: 12, color: Colors.secondaryLabel },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  timerText: { fontSize: 13, fontWeight: '800' },
  ticketItemsList: { padding: 14, gap: 8 },
  strikeHintText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.tertiaryLabel,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: 'transparent',
  },
  itemRowDone: {
    backgroundColor: 'rgba(52, 199, 89, 0.08)',
  },
  itemQty: { fontSize: 15, fontWeight: '800', color: Colors.systemBlue, width: 26 },
  itemDetails: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: '700', color: Colors.label },
  itemMod: { fontSize: 12, color: Colors.secondaryLabel, marginTop: 1 },
  itemNote: { fontSize: 12, color: Colors.systemOrange, fontWeight: '600', marginTop: 2 },
  cookedText: { textDecorationLine: 'line-through', color: Colors.secondaryLabel },
  bumpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    margin: 12,
    marginTop: 0,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.systemGreen,
    backgroundColor: 'rgba(52, 199, 89, 0.08)',
  },
  bumpBtnReady: {
    backgroundColor: Colors.systemGreen,
    borderColor: Colors.systemGreen,
  },
  bumpBtnText: { fontSize: 14, fontWeight: '800', color: Colors.systemGreen },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  recallModalContainer: {
    backgroundColor: Colors.secondarySystemGroupedBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '75%',
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.label,
  },
  modalSub: {
    fontSize: 12,
    color: Colors.secondaryLabel,
    marginTop: 2,
  },
  recallList: {
    padding: 16,
    gap: 12,
  },
  recallCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.systemGroupedBackground,
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  recallNum: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.label,
  },
  recallTable: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.secondaryLabel,
  },
  recalledBadge: {
    backgroundColor: 'rgba(52, 199, 89, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  recalledBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.systemGreen,
  },
  recallItems: {
    fontSize: 12,
    color: Colors.secondaryLabel,
  },
  restoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.systemOrange,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  restoreBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
})
