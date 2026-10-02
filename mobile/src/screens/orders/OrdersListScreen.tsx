import React, { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '../../theme/colors'
import { triggerHaptic } from '../../components/Haptics'
import { StatusBadge } from '../../components/StatusBadge'
import { ConnectionIndicator } from '../../components/ConnectionIndicator'
import { PaymentModal } from '../../components/PaymentModal'
import { SplitBillModal } from '../../components/SplitBillModal'
import { useOrders, useVoidOrder } from '../../api/hooks'
import { useRealtimeEvents } from '../../api/useRealtimeEvents'
import { LiveOrder, UserProfile } from '../../types/models'
import Toast from 'react-native-toast-message'

interface OrdersListScreenProps {
  user: UserProfile
  onOpenHub?: () => void
}

const FILTER_TABS = ['ALL', 'OPEN', 'READY', 'PAID', 'VOIDED']

export function OrdersListScreen({ user, onOpenHub }: OrdersListScreenProps) {
  const [activeFilter, setActiveFilter] = useState('ALL')
  const [selectedOrder, setSelectedOrder] = useState<LiveOrder | null>(null)
  const [paymentOrder, setPaymentOrder] = useState<LiveOrder | null>(null)
  const [splitBillOrder, setSplitBillOrder] = useState<LiveOrder | null>(null)
  const [voidModalVisible, setVoidModalVisible] = useState(false)
  const [voidReason, setVoidReason] = useState('')

  // Live SSE listener: auto-invalidates orders query when order events fire
  useRealtimeEvents()

  // TanStack Query hook
  const { data: orders = [], isFetching, refetch } = useOrders()
  const voidOrderMutation = useVoidOrder()

  const filteredOrders = orders.filter((o) => {
    if (activeFilter === 'ALL') return true
    return o.status.toUpperCase() === activeFilter
  })

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'OPEN': return Colors.systemBlue
      case 'SENT_TO_KITCHEN': return Colors.systemOrange
      case 'READY': return Colors.systemGreen
      case 'PAID': return Colors.systemPurple
      case 'VOIDED': return Colors.systemRed
      default: return Colors.secondaryLabel
    }
  }

  const handleOpenVoidModal = () => {
    setVoidReason('')
    setVoidModalVisible(true)
  }

  const handleConfirmVoid = async () => {
    if (!selectedOrder) return
    if (!voidReason.trim()) {
      Alert.alert('Reason Required', 'Please enter a brief reason for voiding this order.')
      return
    }

    triggerHaptic.warning()
    try {
      const res = await voidOrderMutation.mutateAsync({
        orderId: selectedOrder.id,
        reason: voidReason.trim(),
      })

      if (res.success) {
        triggerHaptic.success()
        Toast.show({
          type: 'success',
          text1: 'Order Voided',
          text2: `${selectedOrder.orderNumber} voided and removed from KDS`,
        })
        setVoidModalVisible(false)
        setSelectedOrder(null)
      } else {
        triggerHaptic.error()
        Alert.alert('Void Failed', res.error || 'Could not void order.')
      }
    } catch (err: any) {
      triggerHaptic.error()
      Alert.alert('Error', err.message || 'Network error while voiding order.')
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.navBar}>
        <View>
          <Text style={styles.navTitle}>Live Orders</Text>
          <Text style={styles.navSub}>All Dining Room & Direct Checks</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <ConnectionIndicator />
          {onOpenHub && (
            <TouchableOpacity style={styles.hubBtn} onPress={onOpenHub} activeOpacity={0.7}>
              <Ionicons name="grid-outline" size={16} color={Colors.label} />
              <Text style={styles.hubBtnText}>Modules</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {FILTER_TABS.map((f) => {
            const isActive = activeFilter === f
            return (
              <TouchableOpacity
                key={f}
                style={[styles.filterChip, isActive && styles.activeFilterChip]}
                onPress={() => {
                  triggerHaptic.selection()
                  setActiveFilter(f)
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterText, isActive && styles.activeFilterText]}>
                  {f}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </View>

      {/* Orders List */}
      <ScrollView
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
      >
        {filteredOrders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={48} color={Colors.secondaryLabel} />
            <Text style={styles.emptyTitle}>No Orders Found</Text>
            <Text style={styles.emptySub}>No orders match the selected {activeFilter} filter.</Text>
          </View>
        ) : (
          filteredOrders.map((order) => (
            <TouchableOpacity
              key={order.id}
              style={styles.orderCard}
              onPress={() => {
                triggerHaptic.selection()
                setSelectedOrder(order)
              }}
              activeOpacity={0.7}
            >
              <View style={styles.orderCardHeader}>
                <View style={styles.orderTitleRow}>
                  <Text style={styles.orderNum}>{order.orderNumber}</Text>
                  <Text style={styles.orderTable}>{order.tableName}</Text>
                </View>
                <StatusBadge text={order.status} color={getStatusColor(order.status)} />
              </View>

              <View style={styles.orderMeta}>
                <Text style={styles.metaText}>
                  {order.items.length} {order.items.length === 1 ? 'item' : 'items'} • {order.guestCount} {order.guestCount === 1 ? 'cover' : 'covers'}
                </Text>
                <Text style={styles.metaServer}>Server: {order.serverName}</Text>
              </View>

              <View style={styles.orderFooter}>
                <Text style={styles.timeText}>
                  {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
                <Text style={styles.orderTotal}>${order.total.toFixed(2)}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <Modal
          visible={true}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setSelectedOrder(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>{selectedOrder.orderNumber}</Text>
                  <Text style={styles.modalSub}>
                    {selectedOrder.tableName} • {selectedOrder.serverName}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setSelectedOrder(null)}
                  style={styles.closeBtn}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={24} color={Colors.label} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                <View style={styles.modalStatusRow}>
                  <Text style={styles.modalStatusLabel}>Order Status</Text>
                  <StatusBadge
                    text={selectedOrder.status}
                    color={getStatusColor(selectedOrder.status)}
                  />
                </View>

                <Text style={styles.sectionHeader}>Items Ordered</Text>
                {selectedOrder.items.map((item, idx) => (
                  <View key={item.id || idx} style={styles.itemRow}>
                    <View style={styles.itemQtyBadge}>
                      <Text style={styles.itemQty}>{item.quantity}x</Text>
                    </View>
                    <View style={styles.itemDetail}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      {item.specialNote ? (
                        <Text style={styles.itemNotes}>Note: {item.specialNote}</Text>
                      ) : null}
                    </View>
                    <Text style={styles.itemPrice}>
                      ${((item.totalPrice ?? item.price ?? 0)).toFixed(2)}
                    </Text>
                  </View>
                ))}

                <View style={styles.divider} />

                <View style={styles.totalRow}>
                  <Text style={styles.subtotalLabel}>Subtotal</Text>
                  <Text style={styles.subtotalValue}>${(selectedOrder.subtotal || 0).toFixed(2)}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.subtotalLabel}>Tax</Text>
                  <Text style={styles.subtotalValue}>${(selectedOrder.tax || 0).toFixed(2)}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.grandTotalLabel}>Total Amount</Text>
                  <Text style={styles.grandTotalValue}>${(selectedOrder.total || 0).toFixed(2)}</Text>
                </View>
              </ScrollView>

              <View style={styles.modalActions}>
                {selectedOrder.status !== 'PAID' && selectedOrder.status !== 'VOIDED' && (
                  <>
                    <TouchableOpacity
                      style={styles.payBtn}
                      onPress={() => {
                        triggerHaptic.selection()
                        setPaymentOrder(selectedOrder)
                        setSelectedOrder(null)
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="card-outline" size={18} color="#FFFFFF" />
                      <Text style={styles.payBtnText}>Pay</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.splitBtn}
                      onPress={() => {
                        triggerHaptic.selection()
                        setSplitBillOrder(selectedOrder)
                        setSelectedOrder(null)
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="git-branch-outline" size={18} color="#FFFFFF" />
                      <Text style={styles.splitBtnText}>Split</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.voidBtn}
                      onPress={handleOpenVoidModal}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="trash-outline" size={18} color={Colors.systemRed} />
                      <Text style={styles.voidBtnText}>Void</Text>
                    </TouchableOpacity>
                  </>
                )}
                <TouchableOpacity
                  style={styles.doneBtn}
                  onPress={() => setSelectedOrder(null)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.doneBtnText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Payment Collection Modal */}
      {paymentOrder && (
        <PaymentModal
          visible={true}
          orderId={paymentOrder.id}
          orderNumber={paymentOrder.orderNumber}
          tableName={paymentOrder.tableName}
          subtotal={paymentOrder.subtotal || paymentOrder.total * 0.9}
          tax={paymentOrder.tax || paymentOrder.total * 0.1}
          total={paymentOrder.total}
          onClose={() => setPaymentOrder(null)}
          onSuccess={() => {
            setPaymentOrder(null)
          }}
        />
      )}

      {/* Split Bill Modal */}
      {splitBillOrder && (
        <SplitBillModal
          visible={true}
          orderId={splitBillOrder.id}
          orderNumber={splitBillOrder.orderNumber}
          tableName={splitBillOrder.tableName}
          subtotal={splitBillOrder.subtotal || splitBillOrder.total * 0.9}
          tax={splitBillOrder.tax || splitBillOrder.total * 0.1}
          total={splitBillOrder.total}
          items={splitBillOrder.items || []}
          onClose={() => setSplitBillOrder(null)}
          onSuccess={() => {
            setSplitBillOrder(null)
          }}
        />
      )}


      {/* Void Reason Modal */}
      <Modal
        visible={voidModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setVoidModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: 320 }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: Colors.systemRed }]}>Void Order</Text>
                <Text style={styles.modalSub}>
                  This will cancel the check and instantly remove tickets from KDS
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setVoidModalVisible(false)}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={24} color={Colors.label} />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 16 }}>
              <Text style={styles.inputLabel}>Reason for Void *</Text>
              <TextInput
                style={styles.reasonInput}
                placeholder="e.g., Customer walked out / Wrong table"
                placeholderTextColor={Colors.tertiaryLabel}
                value={voidReason}
                onChangeText={setVoidReason}
                autoFocus
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setVoidModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Keep Order</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmVoidBtn}
                onPress={handleConfirmVoid}
                disabled={voidOrderMutation.isPending}
              >
                <Text style={styles.confirmVoidBtnText}>
                  {voidOrderMutation.isPending ? 'Voiding...' : 'Confirm Void'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  navTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.label,
  },
  navSub: {
    fontSize: 12,
    color: Colors.secondaryLabel,
    marginTop: 2,
  },
  hubBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.secondarySystemGroupedBackground,
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
  filterRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
  },
  activeFilterChip: {
    backgroundColor: Colors.systemBlue,
    borderColor: Colors.systemBlue,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.secondaryLabel,
  },
  activeFilterText: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 80,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.label,
    marginTop: 8,
  },
  emptySub: {
    fontSize: 13,
    color: Colors.secondaryLabel,
    textAlign: 'center',
    paddingHorizontal: 30,
  },
  orderCard: {
    backgroundColor: Colors.secondarySystemGroupedBackground,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    gap: 10,
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderNum: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.label,
  },
  orderTable: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.secondaryLabel,
  },
  orderMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaText: {
    fontSize: 13,
    color: Colors.secondaryLabel,
  },
  metaServer: {
    fontSize: 13,
    color: Colors.secondaryLabel,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
    paddingTop: 8,
  },
  timeText: {
    fontSize: 12,
    color: Colors.tertiaryLabel,
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.systemBlue,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.secondarySystemGroupedBackground,
    borderRadius: 16,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
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
  closeBtn: {
    padding: 4,
  },
  modalBody: {
    padding: 16,
  },
  modalStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalStatusLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.label,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.secondaryLabel,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  itemQtyBadge: {
    backgroundColor: 'rgba(10, 132, 255, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  itemQty: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.systemBlue,
  },
  itemDetail: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.label,
  },
  itemNotes: {
    fontSize: 12,
    color: Colors.systemOrange,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.label,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.cardBorder,
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  subtotalLabel: {
    fontSize: 13,
    color: Colors.secondaryLabel,
  },
  subtotalValue: {
    fontSize: 13,
    color: Colors.label,
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.label,
    marginTop: 4,
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.systemBlue,
    marginTop: 4,
  },
  modalActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
  },
  payBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Colors.systemGreen,
  },
  payBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  splitBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#7C3AED',
  },
  splitBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },

  voidBtn: {
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 59, 48, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.3)',
  },
  voidBtnText: {
    color: Colors.systemRed,
    fontWeight: '700',
    fontSize: 14,
  },
  doneBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Colors.systemBlue,
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.secondaryLabel,
    marginBottom: 6,
  },
  reasonInput: {
    backgroundColor: Colors.systemBackground,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.label,
    fontSize: 14,
  },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Colors.cardBorder,
  },
  cancelBtnText: {
    color: Colors.label,
    fontWeight: '700',
    fontSize: 14,
  },
  confirmVoidBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Colors.systemRed,
  },
  confirmVoidBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
})
