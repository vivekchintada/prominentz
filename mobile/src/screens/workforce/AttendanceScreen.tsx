import React from 'react'
import {
  View,
  Text,
  ScrollView,
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
import { useAttendance } from '../../api/hooks'
import { UserProfile } from '../../types/models'

interface AttendanceScreenProps {
  user: UserProfile
}

export function AttendanceScreen({ user }: AttendanceScreenProps) {
  const { data: entries = [], isLoading, isFetching, refetch } = useAttendance()

  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60)
    const m = mins % 60
    if (h === 0) return `${m}m`
    return `${h}h ${m}m`
  }

  const totalHours = entries.reduce((sum, e) => sum + e.durationMinutes, 0)

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.systemBlue} />
          <Text style={styles.loadingText}>Loading staff timeclock...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.navBar}>
        <View>
          <Text style={styles.navTitle}>Staff & Timeclock</Text>
          <Text style={styles.navSub}>Active Staff Members On The Clock</Text>
        </View>
        <ConnectionIndicator />
      </View>

      {/* Active Staff Summary Bar */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryCol}>
          <Text style={styles.summaryLabel}>CLOCKED IN NOW</Text>
          <Text style={styles.summaryVal}>{entries.length} Staff</Text>
        </View>
        <View style={styles.summaryCol}>
          <Text style={styles.summaryLabel}>TOTAL HOURS TODAY</Text>
          <Text style={styles.summaryVal}>{formatDuration(totalHours)}</Text>
        </View>
        <StatusBadge text="LIVE FEED" color={Colors.systemGreen} />
      </View>

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
        {entries.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={48} color={Colors.secondaryLabel} />
            <Text style={styles.emptyTitle}>No Staff Clocked In</Text>
            <Text style={styles.emptySub}>Staff timeclock entries will appear here.</Text>
          </View>
        ) : (
          entries.map((entry) => (
            <View key={entry.id} style={styles.card}>
              <View style={styles.avatarRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarInitial}>
                    {entry.employeeName.charAt(0).toUpperCase()}
                  </Text>
                </View>

                <View style={styles.infoCol}>
                  <Text style={styles.empName}>{entry.employeeName}</Text>
                  <Text style={styles.jobTitle}>{entry.jobTitle || 'Team Member'}</Text>
                </View>

                <View style={styles.badgeCol}>
                  <StatusBadge text="ON DUTY" color={Colors.systemGreen} />
                </View>
              </View>

              <View style={styles.timeDetailsRow}>
                <View style={styles.timeItem}>
                  <Ionicons name="log-in-outline" size={14} color={Colors.secondaryLabel} />
                  <Text style={styles.timeLabel}>Clocked In: </Text>
                  <Text style={styles.timeVal}>{entry.clockedInAt}</Text>
                </View>

                <View style={styles.timeItem}>
                  <Ionicons name="timer-outline" size={14} color={Colors.secondaryLabel} />
                  <Text style={styles.timeLabel}>Duration: </Text>
                  <Text style={[styles.timeVal, { color: Colors.systemBlue }]}>
                    {formatDuration(entry.durationMinutes)}
                  </Text>
                </View>
              </View>
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
  summaryBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.secondarySystemGroupedBackground,
    paddingHorizontal: 20, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.cardBorder,
  },
  summaryCol: { gap: 2 },
  summaryLabel: { fontSize: 10, fontWeight: '800', color: Colors.secondaryLabel, letterSpacing: 0.5 },
  summaryVal: { fontSize: 16, fontWeight: '800', color: Colors.label },
  listContent: { padding: 16, gap: 12 },
  card: {
    backgroundColor: Colors.secondarySystemGroupedBackground, borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: Colors.cardBorder, gap: 12,
  },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(0, 122, 255, 0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { fontSize: 18, fontWeight: '800', color: Colors.systemBlue },
  infoCol: { flex: 1, gap: 2 },
  empName: { fontSize: 16, fontWeight: '700', color: Colors.label },
  jobTitle: { fontSize: 13, color: Colors.secondaryLabel },
  badgeCol: { alignItems: 'flex-end' },
  timeDetailsRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    borderTopWidth: 1, borderTopColor: Colors.separator, paddingTop: 10,
  },
  timeItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeLabel: { fontSize: 12, color: Colors.secondaryLabel },
  timeVal: { fontSize: 12, fontWeight: '700', color: Colors.label },
  emptyContainer: { alignItems: 'center', paddingVertical: 80, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.label },
  emptySub: { fontSize: 13, color: Colors.secondaryLabel, textAlign: 'center' },
})
