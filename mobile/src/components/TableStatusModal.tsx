import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '../theme/colors'
import { triggerHaptic } from './Haptics'
import { useUpdateTableStatus } from '../api/hooks'
import { RestaurantTable, TableStatus } from '../types/models'
import Toast from 'react-native-toast-message'

interface TableStatusModalProps {
  visible: boolean
  table: RestaurantTable | null
  onClose: () => void
  onSuccess?: () => void
}

interface StatusOption {
  status: TableStatus
  label: string
  sublabel: string
  color: string
  icon: keyof typeof Ionicons.glyphMap
}

const STATUS_OPTIONS: StatusOption[] = [
  {
    status: 'EMPTY',
    label: 'Available (Ready)',
    sublabel: 'Table is bused, sanitized & open for new guests',
    color: Colors.systemGreen,
    icon: 'checkmark-circle-outline',
  },
  {
    status: 'ACTIVE',
    label: 'Occupied (Seated)',
    sublabel: 'Guests are seated, dining, or ordering',
    color: Colors.systemBlue,
    icon: 'people-outline',
  },
  {
    status: 'PAYING',
    label: 'Paying (Check Dropped)',
    sublabel: 'Bill is presented, awaiting payment settlement',
    color: Colors.systemOrange,
    icon: 'card-outline',
  },
  {
    status: 'RESERVED',
    label: 'Reserved (Booked)',
    sublabel: 'Held for upcoming reservation or VIP party',
    color: Colors.systemPurple,
    icon: 'bookmark-outline',
  },
]

export function TableStatusModal({
  visible,
  table,
  onClose,
  onSuccess,
}: TableStatusModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<TableStatus>('EMPTY')
  const updateStatusMutation = useUpdateTableStatus()

  useEffect(() => {
    if (table) {
      setSelectedStatus(table.status)
    }
  }, [table])

  if (!table) return null

  const hasActiveOrder = (table.orderTotal || 0) > 0 || table.status === 'ACTIVE'

  const handleApplyStatus = async () => {
    if (selectedStatus === table.status) {
      onClose()
      return
    }

    triggerHaptic.medium()
    try {
      const res = await updateStatusMutation.mutateAsync({
        tableId: table.id,
        status: selectedStatus,
        force: true,
      })

      if (res.success) {
        triggerHaptic.success()
        Toast.show({
          type: 'success',
          text1: `${table.name} Status Updated`,
          text2: `Switched to ${selectedStatus}`,
        })
        if (onSuccess) onSuccess()
        onClose()
      } else {
        triggerHaptic.warning()
        Toast.show({
          type: 'error',
          text1: 'Update Failed',
          text2: res.error || 'Could not change table status',
        })
      }
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: err.message || 'Server error',
      })
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheetCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <View style={styles.titleRow}>
                <Text style={styles.title}>{table.name}</Text>
                <View style={[styles.badge, { backgroundColor: `${STATUS_OPTIONS.find((s) => s.status === table.status)?.color || Colors.secondaryLabel}22` }]}>
                  <Text style={[styles.badgeText, { color: STATUS_OPTIONS.find((s) => s.status === table.status)?.color || Colors.secondaryLabel }]}>
                    Current: {table.status}
                  </Text>
                </View>
              </View>
              <Text style={styles.subtitle}>
                {table.floor || 'Main Dining'} • {table.capacity} Seats
                {table.orderTotal ? ` • Active Check: $${table.orderTotal.toFixed(2)}` : ''}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={22} color={Colors.secondaryLabel} />
            </TouchableOpacity>
          </View>

          {/* Warning Banner if Releasing Table with Active Check */}
          {hasActiveOrder && selectedStatus === 'EMPTY' && (
            <View style={styles.warningBanner}>
              <Ionicons name="alert-circle" size={18} color={Colors.systemOrange} />
              <Text style={styles.warningText}>
                Changing to Available will release this table on the SaaS live floor plan.
              </Text>
            </View>
          )}

          {/* Status Options */}
          <ScrollView style={styles.optionsList} contentContainerStyle={{ gap: 10 }}>
            {STATUS_OPTIONS.map((opt) => {
              const isSelected = selectedStatus === opt.status
              const isCurrent = table.status === opt.status

              return (
                <TouchableOpacity
                  key={opt.status}
                  style={[
                    styles.optionCard,
                    isSelected && { borderColor: opt.color, backgroundColor: `${opt.color}15` },
                  ]}
                  onPress={() => {
                    triggerHaptic.selection()
                    setSelectedStatus(opt.status)
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.iconWrap, { backgroundColor: `${opt.color}25` }]}>
                    <Ionicons name={opt.icon} size={22} color={opt.color} />
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[styles.optionLabel, isSelected && { color: Colors.label }]}>
                        {opt.label}
                      </Text>
                      {isCurrent && (
                        <View style={styles.currentBadge}>
                          <Text style={styles.currentBadgeText}>ACTIVE NOW</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.optionSub}>{opt.sublabel}</Text>
                  </View>

                  <View style={[styles.radioCircle, isSelected && { borderColor: opt.color }]}>
                    {isSelected && (
                      <View style={[styles.radioInner, { backgroundColor: opt.color }]} />
                    )}
                  </View>
                </TouchableOpacity>
              )
            })}
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              disabled={updateStatusMutation.isPending}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.applyBtn,
                { backgroundColor: STATUS_OPTIONS.find((s) => s.status === selectedStatus)?.color || Colors.systemBlue },
                updateStatusMutation.isPending && { opacity: 0.6 },
              ]}
              onPress={handleApplyStatus}
              disabled={updateStatusMutation.isPending}
              activeOpacity={0.8}
            >
              {updateStatusMutation.isPending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-sharp" size={18} color="#FFFFFF" />
                  <Text style={styles.applyText}>
                    Set as {STATUS_OPTIONS.find((s) => s.status === selectedStatus)?.label.split(' ')[0]}
                  </Text>
                </>
              )}
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  sheetCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#161922',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#262A36',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.label,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 13,
    color: Colors.secondaryLabel,
    marginTop: 4,
  },
  closeBtn: {
    padding: 4,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 149, 0, 0.12)',
    borderColor: 'rgba(255, 149, 0, 0.3)',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: Colors.systemOrange,
    lineHeight: 16,
  },
  optionsList: {
    maxHeight: 320,
    marginBottom: 16,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E2230',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#2A3042',
    padding: 14,
    gap: 12,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#D1D5DB',
  },
  currentBadge: {
    backgroundColor: '#374151',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  currentBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#9CA3AF',
  },
  optionSub: {
    fontSize: 12,
    color: Colors.secondaryLabel,
    marginTop: 2,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#4B5563',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 8,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#262A38',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.secondaryLabel,
  },
  applyBtn: {
    flex: 2,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  applyText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
})
