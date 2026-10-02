import React, { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '../../theme/colors'
import { triggerHaptic } from '../../components/Haptics'
import { StatusBadge } from '../../components/StatusBadge'
import { ConnectionIndicator } from '../../components/ConnectionIndicator'
import { useReservations, useUpdateReservationStatus } from '../../api/hooks'
import { UserProfile } from '../../types/models'
import Toast from 'react-native-toast-message'

interface ReservationsScreenProps {
  user: UserProfile
}

export function ReservationsScreen({ user }: ReservationsScreenProps) {
  const [activeFilter, setActiveFilter] = useState('ALL')
  const filterTabs = ['ALL', 'CONFIRMED', 'SEATED', 'PENDING', 'CANCELLED']

  const { data: reservations = [], isLoading, isFetching, refetch } = useReservations()
  const updateStatus = useUpdateReservationStatus()

  const filteredReservations = reservations.filter((r) => {
    if (activeFilter === 'ALL') return true
    return r.status.toUpperCase() === activeFilter
  })

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'CONFIRMED': return Colors.systemGreen
      case 'SEATED': return Colors.systemBlue
      case 'CANCELLED': return Colors.systemRed
      case 'PENDING': return Colors.systemOrange
      default: return Colors.secondaryLabel
    }
  }

  const formatBookingTime = (isoString: string) => {
    try {
      const date = new Date(isoString)
      return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    } catch { return 'Scheduled' }
  }

  const handleSeat = async (id: string) => {
    triggerHaptic.medium()
    const ok = await updateStatus.mutateAsync({ id, status: 'SEATED' })
    if (ok) {
      Toast.show({ type: 'success', text1: 'Guest Seated', text2: 'Reservation marked as seated.' })
    } else {
      Toast.show({ type: 'error', text1: 'Failed', text2: 'Could not update reservation.' })
    }
  }

  const handleCancel = async (id: string) => {
    triggerHaptic.light()
    await updateStatus.mutateAsync({ id, status: 'CANCELLED' })
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.systemBlue} />
          <Text style={styles.loadingText}>Loading reservations...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.navBar}>
        <View>
          <Text style={styles.navTitle}>Reservations</Text>
          <Text style={styles.navSub}>Today's Guest Bookings & Covers</Text>
        </View>
        <ConnectionIndicator />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {filterTabs.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, activeFilter === f && styles.activeFilterChip]}
            onPress={() => { triggerHaptic.selection(); setActiveFilter(f) }}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterText, activeFilter === f && styles.activeFilterText]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Bookings List */}
      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={() => { triggerHaptic.light(); refetch() }}
            tintColor={Colors.systemBlue}
          />
        }
      >
        {filteredReservations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={48} color={Colors.secondaryLabel} />
            <Text style={styles.emptyTitle}>No Reservations</Text>
            <Text style={styles.emptySub}>
              {activeFilter === 'ALL' ? 'No bookings found for today.' : `No ${activeFilter.toLowerCase()} reservations.`}
            </Text>
          </View>
        ) : (
          filteredReservations.map((res) => (
            <View key={res.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.guestName}>{res.guestName}</Text>
                  <Text style={styles.guestPhone}>{res.guestPhone}</Text>
                </View>
                <StatusBadge text={res.status} color={getStatusColor(res.status)} />
              </View>

              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Ionicons name="people-outline" size={14} color={Colors.secondaryLabel} />
                  <Text style={styles.metaVal}>{res.partySize} guests</Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={14} color={Colors.secondaryLabel} />
                  <Text style={styles.metaVal}>{formatBookingTime(res.scheduledAt)}</Text>
                </View>
                {res.tableName && (
                  <View style={styles.metaItem}>
                    <Ionicons name="grid-outline" size={14} color={Colors.secondaryLabel} />
                    <Text style={styles.metaVal}>{res.tableName}</Text>
                  </View>
                )}
              </View>

              {res.notes && (
                <View style={styles.notesBox}>
                  <Ionicons name="document-text-outline" size={13} color={Colors.secondaryLabel} />
                  <Text style={styles.notesText}>{res.notes}</Text>
                </View>
              )}

              {/* Action Buttons */}
              {(res.status === 'CONFIRMED' || res.status === 'PENDING') && (
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={styles.seatBtn}
                    onPress={() => handleSeat(res.id)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="checkmark-circle" size={16} color="#fff" />
                    <Text style={styles.seatBtnText}>Seat Now</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => handleCancel(res.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.systemGroupedBackground },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: Colors.secondaryLabel },
  navBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.cardBorder,
  },
  navTitle: { fontSize: 22, fontWeight: '800', color: Colors.label },
  navSub: { fontSize: 12, color: Colors.secondaryLabel, marginTop: 2 },
  filterRow: {
    flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, gap: 6,
    backgroundColor: Colors.systemBackground,
    borderBottomWidth: 1, borderBottomColor: Colors.cardBorder,
  },
  filterChip: {
    flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 10,
    backgroundColor: 'transparent', borderWidth: 1.5, borderColor: Colors.cardBorder,
  },
  activeFilterChip: { backgroundColor: Colors.systemBlue, borderColor: Colors.systemBlue },
  filterText: { fontSize: 10, fontWeight: '800', color: Colors.secondaryLabel, letterSpacing: 0.4 },
  activeFilterText: { color: '#FFFFFF' },
  listContent: { padding: 16, gap: 12 },
  card: {
    backgroundColor: Colors.secondarySystemGroupedBackground, borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: Colors.cardBorder, gap: 12,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  guestName: { fontSize: 17, fontWeight: '700', color: Colors.label },
  guestPhone: { fontSize: 13, color: Colors.secondaryLabel, marginTop: 2 },
  metaRow: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaVal: { fontSize: 13, fontWeight: '600', color: Colors.label },
  notesBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.tertiarySystemBackground, padding: 8, borderRadius: 8, gap: 6,
  },
  notesText: { fontSize: 12, color: Colors.secondaryLabel, flex: 1 },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  seatBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.systemGreen, paddingVertical: 10, borderRadius: 10, gap: 6,
  },
  seatBtnText: { fontSize: 13, fontWeight: '800', color: '#fff' },
  cancelBtn: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1.5, borderColor: Colors.systemRed,
  },
  cancelBtnText: { fontSize: 13, fontWeight: '700', color: Colors.systemRed },
  emptyContainer: { alignItems: 'center', paddingVertical: 80, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.label },
  emptySub: { fontSize: 13, color: Colors.secondaryLabel },
})
