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
import { OrderItem, RestaurantTable } from '../../types/models'

interface ActiveCheckModalProps {
  visible: boolean
  table: RestaurantTable
  items: OrderItem[]
  guestCount: number
  onUpdateGuestCount: (delta: number) => void
  onUpdateQuantity: (index: number, delta: number) => void
  onFireOrder: () => void
  onClose: () => void
}

export function ActiveCheckModal({
  visible,
  table,
  items,
  guestCount,
  onUpdateGuestCount,
  onUpdateQuantity,
  onFireOrder,
  onClose,
}: ActiveCheckModalProps) {
  const subtotal = items.reduce((acc, item) => acc + item.totalPrice, 0)
  const tax = subtotal * 0.08875
  const total = subtotal + tax

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{table.name} — Active Check</Text>
          <TouchableOpacity
            onPress={() => {
              triggerHaptic.light()
              onClose()
            }}
          >
            <Text style={styles.doneText}>Back</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* Guest Count Stepper */}
          <View style={styles.card}>
            <View style={styles.stepperRow}>
              <View>
                <Text style={styles.cardLabel}>COVERS / GUESTS</Text>
                <Text style={styles.cardVal}>{guestCount} Guests Seated</Text>
              </View>
              <View style={styles.stepperControls}>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => {
                    triggerHaptic.light()
                    onUpdateGuestCount(-1)
                  }}
                >
                  <Ionicons name="remove" size={18} color={Colors.label} />
                </TouchableOpacity>
                <Text style={styles.stepCount}>{guestCount}</Text>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => {
                    triggerHaptic.light()
                    onUpdateGuestCount(1)
                  }}
                >
                  <Ionicons name="add" size={18} color={Colors.label} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Itemized Order List */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>ORDER ITEMS ({items.length})</Text>
            {items.map((item, index) => (
              <View key={`${item.id}-${index}`} style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <View style={styles.itemMeta}>
                    <Text style={styles.itemCourse}>{item.course}</Text>
                    <Text style={styles.itemUnit}>${item.unitPrice.toFixed(2)} ea</Text>
                  </View>
                </View>

                <View style={styles.itemControls}>
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => {
                      triggerHaptic.light()
                      onUpdateQuantity(index, -1)
                    }}
                  >
                    <Ionicons name="remove-circle-outline" size={24} color={Colors.secondaryLabel} />
                  </TouchableOpacity>
                  <Text style={styles.qtyText}>{item.quantity}</Text>
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => {
                      triggerHaptic.light()
                      onUpdateQuantity(index, 1)
                    }}
                  >
                    <Ionicons name="add-circle" size={24} color={Colors.systemBlue} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.itemTotal}>${item.totalPrice.toFixed(2)}</Text>
              </View>
            ))}
          </View>

          {/* Payment Summary */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>SUMMARY</Text>
            <View style={styles.sumRow}>
              <Text style={styles.sumLabel}>Subtotal</Text>
              <Text style={styles.sumVal}>${subtotal.toFixed(2)}</Text>
            </View>
            <View style={styles.sumRow}>
              <Text style={styles.sumLabel}>Tax (8.875%)</Text>
              <Text style={styles.sumVal}>${tax.toFixed(2)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.sumRow}>
              <Text style={styles.totalLabel}>Total Due</Text>
              <Text style={styles.totalVal}>${total.toFixed(2)}</Text>
            </View>
          </View>
        </ScrollView>

        {/* Send to Kitchen Action Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.fireButton, items.length === 0 && styles.disabledButton]}
            disabled={items.length === 0}
            onPress={() => {
              triggerHaptic.heavy()
              onFireOrder()
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="flame" size={20} color="#fff" />
            <Text style={styles.fireButtonText}>Send to Kitchen (Fire)</Text>
          </TouchableOpacity>
        </View>
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
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.secondaryLabel,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  cardVal: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.label,
  },
  stepperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.tertiarySystemBackground,
    borderRadius: 12,
    padding: 4,
    gap: 12,
  },
  stepBtn: {
    padding: 6,
  },
  stepCount: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.label,
    minWidth: 20,
    textAlign: 'center',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.separator,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.label,
  },
  itemMeta: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  itemCourse: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.systemBlue,
    backgroundColor: 'rgba(0, 122, 255, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  itemUnit: {
    fontSize: 12,
    color: Colors.secondaryLabel,
  },
  itemControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 14,
  },
  qtyBtn: {
    padding: 2,
  },
  qtyText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.label,
    minWidth: 16,
    textAlign: 'center',
  },
  itemTotal: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.label,
    minWidth: 60,
    textAlign: 'right',
  },
  sumRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  sumLabel: {
    fontSize: 14,
    color: Colors.secondaryLabel,
  },
  sumVal: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.label,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.separator,
    marginVertical: 10,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.label,
  },
  totalVal: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.systemBlue,
  },
  footer: {
    padding: 16,
    backgroundColor: Colors.secondarySystemGroupedBackground,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
  },
  fireButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.systemGreen,
    paddingVertical: 15,
    borderRadius: 14,
    gap: 8,
  },
  disabledButton: {
    opacity: 0.4,
  },
  fireButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
})
