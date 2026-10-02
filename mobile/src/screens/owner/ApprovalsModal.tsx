import React from 'react'
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '../../theme/colors'
import { triggerHaptic } from '../../components/Haptics'
import { StatusBadge } from '../../components/StatusBadge'
import { PendingShiftApproval } from '../../types/models'

interface ApprovalsModalProps {
  visible: boolean
  onClose: () => void
  approvals: PendingShiftApproval[]
  onResolve: (id: string, approve: boolean) => void
}

export function ApprovalsModal({
  visible,
  onClose,
  approvals,
  onResolve,
}: ApprovalsModalProps) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Manager Approvals</Text>
          <TouchableOpacity
            onPress={() => {
              triggerHaptic.light()
              onClose()
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.doneText}>Done</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {approvals.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="checkmark-circle" size={54} color={Colors.systemGreen} />
              <Text style={styles.emptyTitle}>All Caught Up</Text>
              <Text style={styles.emptySubtitle}>
                No pending employee shift trades or overrides require your review.
              </Text>
            </View>
          ) : (
            approvals.map((approval) => (
              <View key={approval.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.badgeRow}>
                    <Text style={styles.requesterText}>
                      {approval.requesterName} ➔ {approval.targetName}
                    </Text>
                    <StatusBadge text="Pending" color={Colors.systemOrange} />
                  </View>
                  <Text style={styles.timeText}>
                    {approval.shiftDate} • {approval.shiftTime}
                  </Text>
                </View>

                {approval.reason && (
                  <Text style={styles.reasonText}>"{approval.reason}"</Text>
                )}

                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.denyBtn]}
                    onPress={() => {
                      triggerHaptic.medium()
                      onResolve(approval.id, false)
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close" size={16} color={Colors.systemRed} />
                    <Text style={[styles.actionBtnText, { color: Colors.systemRed }]}>Deny</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, styles.approveBtn]}
                    onPress={() => {
                      triggerHaptic.success()
                      onResolve(approval.id, true)
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="checkmark" size={16} color={Colors.systemGreen} />
                    <Text style={[styles.actionBtnText, { color: Colors.systemGreen }]}>Approve</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.systemGroupedBackground,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.label,
  },
  doneText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.systemBlue,
  },
  content: {
    padding: 16,
    gap: 14,
  },
  card: {
    backgroundColor: Colors.secondarySystemGroupedBackground,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    gap: 12,
  },
  cardHeader: {
    gap: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  requesterText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.label,
  },
  timeText: {
    fontSize: 13,
    color: Colors.secondaryLabel,
  },
  reasonText: {
    fontSize: 13,
    fontStyle: 'italic',
    color: Colors.secondaryLabel,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  denyBtn: {
    backgroundColor: 'rgba(255, 59, 48, 0.12)',
  },
  approveBtn: {
    backgroundColor: 'rgba(52, 199, 89, 0.14)',
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.label,
    marginTop: 14,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.secondaryLabel,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
})
