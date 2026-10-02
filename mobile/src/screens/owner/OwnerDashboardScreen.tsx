import React, { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '../../theme/colors'
import { triggerHaptic } from '../../components/Haptics'
import { StatusBadge } from '../../components/StatusBadge'
import { ConnectionIndicator } from '../../components/ConnectionIndicator'
import { ServerHostModal } from '../../components/ServerHostModal'
import { ApprovalsModal } from './ApprovalsModal'
import { NotificationsModal } from '../../components/NotificationsModal'
import { useOwnerStats, useResolveShiftApproval, useNotifications } from '../../api/hooks'
import { useRealtimeEvents } from '../../api/useRealtimeEvents'
import { UserProfile } from '../../types/models'
import Toast from 'react-native-toast-message'

interface OwnerDashboardScreenProps {
  user: UserProfile
  onLogout: () => void
  onSwitchRole: (role: 'SERVER' | 'KITCHEN') => void
}

export function OwnerDashboardScreen({
  user,
  onLogout,
  onSwitchRole,
}: OwnerDashboardScreenProps) {
  // Real-time events
  useRealtimeEvents()

  const [showApprovals, setShowApprovals] = useState(false)
  const [showHostModal, setShowHostModal] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const { data: notifData } = useNotifications()


  const { data: stats = {
    todaySales: 0,
    salesGrowthPercent: 0,
    openOrdersCount: 0,
    openOrdersValue: 0,
    occupiedTablesCount: 0,
    totalTablesCount: 1,
    laborCostPercent: 0,
    activeStaffCount: 0,
    pendingApprovals: [],
  }, isLoading, isFetching, refetch } = useOwnerStats()

  const resolveApprovalMutation = useResolveShiftApproval()

  const handleResolveApproval = async (id: string, approve: boolean) => {
    triggerHaptic.selection()
    try {
      await resolveApprovalMutation.mutateAsync({ id, approve })
      triggerHaptic.success()
      Toast.show({
        type: 'success',
        text1: approve ? 'Shift Approved' : 'Shift Rejected',
        text2: 'Workforce schedule synchronized with SaaS',
      })
    } catch {
      triggerHaptic.error()
      Toast.show({
        type: 'error',
        text1: 'Action Failed',
        text2: 'Could not resolve shift approval.',
      })
    }
  }

  const occupancyPercent = Math.round(
    (stats.occupiedTablesCount / (stats.totalTablesCount || 1)) * 100
  )

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Navigation Bar */}
      <View style={styles.navBar}>
        <View>
          <Text style={styles.restaurantName}>{user.restaurantName}</Text>
          <Text style={styles.userName}>{user.name} • Executive Pulse</Text>
        </View>

        <View style={styles.navRight}>
          <TouchableOpacity
            style={styles.hostChip}
            onPress={() => {
              triggerHaptic.light()
              setShowHostModal(true)
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="server-outline" size={13} color={Colors.systemBlue} />
            <Text style={styles.hostChipText}>SaaS</Text>
          </TouchableOpacity>

          <ConnectionIndicator />

          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => {
              triggerHaptic.selection()
              setShowNotifications(true)
            }}
            activeOpacity={0.7}
          >
            <View style={{ position: 'relative' }}>
              <Ionicons name="notifications-outline" size={21} color={Colors.label} />
              {(notifData?.unreadCount ?? 0) > 0 && (
                <View style={styles.notifDot} />
              )}
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => {
              triggerHaptic.light()
              onLogout()
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={22} color={Colors.label} />
          </TouchableOpacity>

        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.systemBlue} />
          <Text style={styles.loadingText}>Syncing executive analytics...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
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
          {/* Quick Role Switcher Pill Bar */}
          <View style={styles.roleSwitcherBar}>
            <Text style={styles.roleSwitcherLabel}>SWITCH VIEW:</Text>
            <TouchableOpacity
              style={styles.roleSwitchChip}
              onPress={() => {
                triggerHaptic.selection()
                onSwitchRole('SERVER')
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.roleSwitchText}>🤵 Server Handheld</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.roleSwitchChip}
              onPress={() => {
                triggerHaptic.selection()
                onSwitchRole('KITCHEN')
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.roleSwitchText}>👨‍🍳 Kitchen KDS</Text>
            </TouchableOpacity>
          </View>

          {/* Hero Revenue Card */}
          <View style={styles.heroCard}>
            <View style={styles.heroHeader}>
              <View>
                <Text style={styles.heroSub}>TODAY'S NET REVENUE</Text>
                <Text style={styles.heroValue}>${stats.todaySales.toFixed(2)}</Text>
              </View>
              <StatusBadge
                text={`+${stats.salesGrowthPercent}%`}
                color={Colors.systemGreen}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.heroMetricsRow}>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Open Orders</Text>
                <Text style={styles.metricVal}>{stats.openOrdersCount}</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Open Value</Text>
                <Text style={styles.metricVal}>${stats.openOrdersValue.toFixed(2)}</Text>
              </View>
              <View style={[styles.metricItem, { alignItems: 'flex-end' }]}>
                <Text style={styles.metricLabel}>Labor Ratio</Text>
                <Text style={[styles.metricVal, { color: stats.laborCostPercent <= 30 ? Colors.systemGreen : Colors.systemRed }]}>
                  {stats.laborCostPercent}%
                </Text>
              </View>
            </View>
          </View>

          {/* Manager Approvals Alert Card */}
          {stats.pendingApprovals && stats.pendingApprovals.length > 0 && (
            <TouchableOpacity
              style={styles.approvalsCard}
              onPress={() => {
                triggerHaptic.selection()
                setShowApprovals(true)
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="alert-circle" size={26} color={Colors.systemOrange} />
              <View style={styles.approvalsTextCol}>
                <Text style={styles.approvalsTitle}>
                  {stats.pendingApprovals.length} Pending Shift Approvals
                </Text>
                <Text style={styles.approvalsSub}>Live requests from SaaS workforce module</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.secondaryLabel} />
            </TouchableOpacity>
          )}

          {/* 2-Column Operational Grid */}
          <View style={styles.gridRow}>
            {/* Floor Occupancy */}
            <View style={styles.gridCard}>
              <View style={styles.gridCardHeader}>
                <Ionicons name="grid" size={20} color={Colors.systemBlue} />
                <Text style={styles.gridCardRate}>{occupancyPercent}%</Text>
              </View>
              <Text style={styles.gridCardMainVal}>
                {stats.occupiedTablesCount} of {stats.totalTablesCount}
              </Text>
              <Text style={styles.gridCardSub}>Tables Seated</Text>
            </View>

            {/* Active Staff */}
            <View style={styles.gridCard}>
              <View style={styles.gridCardHeader}>
                <Ionicons name="people" size={20} color={Colors.systemPurple} />
                <Text style={[styles.gridCardRate, { color: Colors.systemPurple }]}>Active</Text>
              </View>
              <Text style={styles.gridCardMainVal}>{stats.activeStaffCount} On Clock</Text>
              <Text style={styles.gridCardSub}>Floor & Kitchen</Text>
            </View>
          </View>
        </ScrollView>
      )}

      {/* Slide-Up Approvals Modal */}
      <ApprovalsModal
        visible={showApprovals}
        onClose={() => setShowApprovals(false)}
        approvals={stats.pendingApprovals || []}
        onResolve={handleResolveApproval}
      />

      <ServerHostModal
        visible={showHostModal}
        onClose={() => setShowHostModal(false)}
        onSaved={() => refetch()}
      />

      <NotificationsModal
        visible={showNotifications}
        onClose={() => setShowNotifications(false)}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({

  safeArea: {
    flex: 1,
    backgroundColor: Colors.systemGroupedBackground,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  restaurantName: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.label,
  },
  userName: {
    fontSize: 12,
    color: Colors.secondaryLabel,
    marginTop: 2,
  },
  navRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
  hostChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.label,
  },
  iconButton: {
    padding: 2,
  },
  notifDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.systemRed,
    borderWidth: 1.5,
    borderColor: Colors.systemGroupedBackground,
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.secondaryLabel,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 80,
  },
  roleSwitcherBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondarySystemGroupedBackground,
    padding: 8,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  roleSwitcherLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.tertiaryLabel,
    letterSpacing: 0.5,
    marginLeft: 4,
  },
  roleSwitchChip: {
    backgroundColor: Colors.systemGroupedBackground,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  roleSwitchText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.label,
  },
  heroCard: {
    backgroundColor: Colors.secondarySystemGroupedBackground,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    gap: 16,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroSub: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.secondaryLabel,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  heroValue: {
    fontSize: 34,
    fontWeight: '800',
    color: Colors.label,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.cardBorder,
  },
  heroMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricItem: {
    gap: 4,
  },
  metricLabel: {
    fontSize: 11,
    color: Colors.secondaryLabel,
    fontWeight: '600',
  },
  metricVal: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.label,
  },
  approvalsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 159, 10, 0.1)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 159, 10, 0.3)',
    gap: 12,
  },
  approvalsTextCol: {
    flex: 1,
    gap: 2,
  },
  approvalsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.label,
  },
  approvalsSub: {
    fontSize: 12,
    color: Colors.secondaryLabel,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 14,
  },
  gridCard: {
    flex: 1,
    backgroundColor: Colors.secondarySystemGroupedBackground,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    gap: 8,
  },
  gridCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gridCardRate: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.systemBlue,
  },
  gridCardMainVal: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.label,
  },
  gridCardSub: {
    fontSize: 12,
    color: Colors.secondaryLabel,
  },
})
