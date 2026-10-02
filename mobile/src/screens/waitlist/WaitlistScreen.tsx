import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '../../theme/colors'
import { UserProfile, WaitlistEntry } from '../../types/models'
import { useWaitlist, useAddWaitlistEntry, useUpdateWaitlistStatus } from '../../api/hooks'
import { triggerHaptic } from '../../components/Haptics'
import Toast from 'react-native-toast-message'

interface WaitlistScreenProps {
  user: UserProfile
  onOpenHub?: () => void
}

export function WaitlistScreen({ user, onOpenHub }: WaitlistScreenProps) {
  const [modalVisible, setModalVisible] = useState(false)

  // Form states
  const [guestName, setGuestName] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [partySize, setPartySize] = useState('2')
  const [quotedMins, setQuotedMins] = useState('20')

  const { data: entries = [], isLoading, isFetching, refetch } = useWaitlist()
  const addMutation = useAddWaitlistEntry()
  const updateStatusMutation = useUpdateWaitlistStatus()

  const handleAddParty = async () => {
    if (!guestName.trim()) {
      Alert.alert('Required', 'Please enter guest name.')
      return
    }
    if (!guestPhone.trim()) {
      Alert.alert('Required', 'Please enter mobile number for SMS alert.')
      return
    }

    triggerHaptic.selection()

    try {
      const res = await addMutation.mutateAsync({
        guestName: guestName.trim(),
        guestPhone: guestPhone.trim(),
        partySize: parseInt(partySize, 10) || 2,
        quotedWaitMins: parseInt(quotedMins, 10) || 20,
      })

      if (res.success) {
        triggerHaptic.success()
        Toast.show({
          type: 'success',
          text1: 'Added to Waitlist',
          text2: `${guestName} (Party of ${partySize}) • Quoted ${quotedMins}m`,
        })
        setModalVisible(false)
        setGuestName('')
        setGuestPhone('')
        setPartySize('2')
        setQuotedMins('20')
      } else {
        triggerHaptic.error()
        Alert.alert('Error', res.error || 'Failed to add guest to waitlist.')
      }
    } catch (err: any) {
      triggerHaptic.error()
      Alert.alert('Error', err.message || 'Network error.')
    }
  }

  const handleNotifyGuest = async (entry: WaitlistEntry) => {
    triggerHaptic.medium()
    try {
      const ok = await updateStatusMutation.mutateAsync({
        id: entry.id,
        status: 'WAITING',
        notify: true,
      })
      if (ok) {
        triggerHaptic.success()
        Toast.show({
          type: 'success',
          text1: 'Alert Sent',
          text2: `SMS alert dispatched to ${entry.guestName}`,
        })
      } else {
        triggerHaptic.error()
        Alert.alert('Alert', 'Could not dispatch SMS notification.')
      }
    } catch {
      triggerHaptic.error()
    }
  }

  const handleSeatParty = async (entry: WaitlistEntry) => {
    triggerHaptic.medium()
    try {
      const ok = await updateStatusMutation.mutateAsync({
        id: entry.id,
        status: 'SEATED',
      })
      if (ok) {
        triggerHaptic.success()
        Toast.show({
          type: 'success',
          text1: 'Party Seated',
          text2: `${entry.guestName} seated`,
        })
      } else {
        triggerHaptic.error()
        Alert.alert('Error', 'Could not seat party.')
      }
    } catch {
      triggerHaptic.error()
    }
  }

  const renderWaitlistCard = ({ item, index }: { item: WaitlistEntry; index: number }) => {
    const elapsedMinutes = Math.max(
      1,
      Math.round((Date.now() - new Date(item.arrivedAt).getTime()) / 60000)
    )
    const isOverdue = elapsedMinutes > item.quotedWaitMins

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.positionPill}>
            <Text style={styles.positionText}>#{index + 1}</Text>
          </View>
          <View style={styles.guestInfo}>
            <Text style={styles.guestName}>{item.guestName}</Text>
            <Text style={styles.guestPhone}>{item.guestPhone}</Text>
          </View>
          <View style={styles.partyBadge}>
            <Ionicons name="people" size={14} color={Colors.systemBlue} />
            <Text style={styles.partyText}>{item.partySize}</Text>
          </View>
        </View>

        <View style={styles.timeSection}>
          <View style={styles.timeBlock}>
            <Text style={styles.timeLabel}>WAITING</Text>
            <Text style={[styles.timeValue, isOverdue && styles.overdueText]}>
              {elapsedMinutes}m
            </Text>
          </View>
          <View style={styles.timeBlock}>
            <Text style={styles.timeLabel}>ESTIMATED</Text>
            <Text style={styles.timeValue}>{item.quotedWaitMins}m</Text>
          </View>
          <View style={styles.timeBlock}>
            <Text style={styles.timeLabel}>STATUS</Text>
            <Text
              style={[
                styles.timeValue,
                { color: isOverdue ? Colors.systemRed : Colors.systemGreen },
              ]}
            >
              {isOverdue ? 'Delayed' : 'On Track'}
            </Text>
          </View>
        </View>

        {item.notes ? (
          <View style={styles.notesBlock}>
            <Text style={styles.notesText}>Note: {item.notes}</Text>
          </View>
        ) : null}

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.btn, styles.notifyBtn]}
            onPress={() => handleNotifyGuest(item)}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={16} color={Colors.systemBlue} />
            <Text style={[styles.btnText, { color: Colors.systemBlue }]}>Notify Ready</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, styles.seatBtn]}
            onPress={() => handleSeatParty(item)}
            activeOpacity={0.7}
          >
            <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
            <Text style={[styles.btnText, { color: '#FFFFFF' }]}>Seat Party</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Live Waitlist</Text>
          <Text style={styles.headerSubtitle}>
            {entries.length} parties currently waiting for tables
          </Text>
        </View>
        <View style={styles.headerRight}>
          {onOpenHub && (
            <TouchableOpacity style={styles.hubBtn} onPress={onOpenHub} activeOpacity={0.7}>
              <Ionicons name="grid-outline" size={18} color={Colors.label} />
              <Text style={styles.hubBtnText}>Modules</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.addPartyBtn}
            onPress={() => {
              triggerHaptic.selection()
              setModalVisible(true)
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="person-add" size={16} color="#FFFFFF" />
            <Text style={styles.addPartyBtnText}>Add Party</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.systemBlue} />
          <Text style={styles.loadingText}>Syncing live waitlist...</Text>
        </View>
      ) : entries.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="hourglass-outline" size={54} color={Colors.tertiaryLabel} />
          <Text style={styles.emptyTitle}>Waitlist Is Clear</Text>
          <Text style={styles.emptySubtitle}>
            No walk-in guests currently waiting. Tap &ldquo;Add Party&rdquo; to register new walk-ins.
          </Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          renderItem={renderWaitlistCard}
          contentContainerStyle={styles.listContent}
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
        />
      )}

      {/* Add Party Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Walk-in Party</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={24} color={Colors.secondaryLabel} />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Guest Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. John Doe"
                placeholderTextColor={Colors.tertiaryLabel}
                value={guestName}
                onChangeText={setGuestName}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Phone Number (For SMS alert) *</Text>
              <TextInput
                style={styles.input}
                placeholder="+1 555-0192"
                placeholderTextColor={Colors.tertiaryLabel}
                value={guestPhone}
                onChangeText={setGuestPhone}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.label}>Party Size</Text>
                <TextInput
                  style={styles.input}
                  value={partySize}
                  onChangeText={setPartySize}
                  keyboardType="number-pad"
                />
              </View>

              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.label}>Quoted Wait (Mins)</Text>
                <TextInput
                  style={styles.input}
                  value={quotedMins}
                  onChangeText={setQuotedMins}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleAddParty}
              disabled={addMutation.isPending}
              activeOpacity={0.8}
            >
              {addMutation.isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitBtnText}>Add to Waitlist & Send SMS</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.systemBackground,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.label,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.secondaryLabel,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hubBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.secondarySystemBackground,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  hubBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.label,
  },
  addPartyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.systemBlue,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addPartyBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 80,
  },
  card: {
    backgroundColor: Colors.secondarySystemBackground,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  positionPill: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(10, 132, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  positionText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.systemBlue,
  },
  guestInfo: {
    flex: 1,
  },
  guestName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.label,
  },
  guestPhone: {
    fontSize: 12,
    color: Colors.secondaryLabel,
  },
  partyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(10, 132, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  partyText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.systemBlue,
  },
  timeSection: {
    flexDirection: 'row',
    backgroundColor: Colors.tertiarySystemBackground,
    borderRadius: 8,
    padding: 10,
  },
  timeBlock: {
    flex: 1,
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.tertiaryLabel,
    marginBottom: 2,
  },
  timeValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.label,
  },
  overdueText: {
    color: Colors.systemRed,
  },
  notesBlock: {
    backgroundColor: 'rgba(255, 159, 10, 0.1)',
    padding: 8,
    borderRadius: 6,
  },
  notesText: {
    fontSize: 12,
    color: Colors.systemOrange,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  notifyBtn: {
    backgroundColor: 'rgba(10, 132, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(10, 132, 255, 0.3)',
  },
  seatBtn: {
    backgroundColor: Colors.systemGreen,
  },
  btnText: {
    fontSize: 13,
    fontWeight: '700',
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
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.label,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.secondaryLabel,
    textAlign: 'center',
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.secondarySystemBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    gap: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.label,
  },
  closeBtn: {
    padding: 4,
  },
  formGroup: {
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.secondaryLabel,
  },
  input: {
    backgroundColor: Colors.tertiarySystemBackground,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.label,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  submitBtn: {
    backgroundColor: Colors.systemBlue,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
})
