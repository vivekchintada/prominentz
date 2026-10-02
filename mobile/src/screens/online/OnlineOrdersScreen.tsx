import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '../../theme/colors'
import { OnlineOrder, OnlineOrderStatus, UserProfile } from '../../types/models'
import { useOnlineOrders, useUpdateOnlineOrderStatus } from '../../api/hooks'
import { StatusBadge } from '../../components/StatusBadge'
import { triggerHaptic } from '../../components/Haptics'
import Toast from 'react-native-toast-message'

interface OnlineOrdersScreenProps {
  user: UserProfile
  onOpenHub?: () => void
}

const STATUS_FILTERS: { key: string; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'ACCEPTED', label: 'Accepted' },
  { key: 'PREPARING', label: 'Kitchen' },
  { key: 'READY', label: 'Ready' },
  { key: 'OUT_FOR_DELIVERY', label: 'Dispatched' },
]

export function OnlineOrdersScreen({ user, onOpenHub }: OnlineOrdersScreenProps) {
  const [activeFilter, setActiveFilter] = useState('ALL')
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const { data: orders = [], isLoading, isFetching, refetch } = useOnlineOrders(activeFilter)
  const updateStatusMutation = useUpdateOnlineOrderStatus()

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    triggerHaptic.selection()
    setUpdatingId(orderId)
    try {
      const ok = await updateStatusMutation.mutateAsync({ id: orderId, status: newStatus })
      if (ok) {
        triggerHaptic.medium()
        Toast.show({
          type: 'success',
          text1: 'Online Order Updated',
          text2: `Status changed to ${newStatus}`,
        })
      } else {
        triggerHaptic.error()
        Alert.alert('Error', 'Failed to update order status.')
      }
    } catch (err: any) {
      triggerHaptic.error()
      Alert.alert('Error', err.message || 'Network error updating order.')
    } finally {
      setUpdatingId(null)
    }
  }

  const getChannelBadge = (channel: string) => {
    switch (channel) {
      case 'DOORDASH':
        return { label: 'DoorDash', color: '#ff3008' }
      case 'UBEREATS':
        return { label: 'Uber Eats', color: '#06c167' }
      default:
        return { label: 'Direct Web', color: Colors.systemBlue }
    }
  }

  const renderOrderItem = ({ item }: { item: OnlineOrder }) => {
    const channel = getChannelBadge(item.channel)
    const isUpdating = updatingId === item.id

    return (
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.orderIdent}>
            <Text style={styles.orderNumber}>{item.orderNumber}</Text>
            <View style={[styles.channelBadge, { backgroundColor: `${channel.color}20` }]}>
              <Text style={[styles.channelText, { color: channel.color }]}>{channel.label}</Text>
            </View>
          </View>
          <StatusBadge text={item.onlineStatus} color={Colors.systemBlue} />
        </View>

        {/* Customer & Address */}
        <View style={styles.customerRow}>
          <View style={styles.customerInfo}>
            <Text style={styles.customerName}>{item.customerName}</Text>
            {item.customerPhone ? (
              <Text style={styles.customerPhone}>{item.customerPhone}</Text>
            ) : null}
            {item.deliveryAddress ? (
              <Text style={styles.addressText} numberOfLines={2}>
                <Ionicons name="location-outline" size={12} color={Colors.secondaryLabel} />{' '}
                {item.deliveryAddress}
              </Text>
            ) : null}
          </View>
          <View style={styles.priceBlock}>
            <Text style={styles.totalText}>${item.total.toFixed(2)}</Text>
            <Text style={styles.typeText}>{item.orderType}</Text>
          </View>
        </View>

        {/* Item List */}
        <View style={styles.itemsContainer}>
          {item.items.map((dish, idx) => (
            <View key={dish.id || idx} style={styles.dishRow}>
              <Text style={styles.dishQty}>{dish.quantity}x</Text>
              <Text style={styles.dishName}>{dish.name}</Text>
              <Text style={styles.dishPrice}>${(dish.price * dish.quantity).toFixed(2)}</Text>
            </View>
          ))}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          {isUpdating ? (
            <ActivityIndicator size="small" color={Colors.systemBlue} style={{ padding: 8 }} />
          ) : (
            <>
              {item.onlineStatus === 'PENDING' && (
                <>
                  <TouchableOpacity
                    style={[styles.btn, styles.rejectBtn]}
                    onPress={() => handleUpdateStatus(item.id, 'REJECTED')}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close" size={16} color={Colors.systemRed} />
                    <Text style={[styles.btnText, styles.rejectText]}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.btn, styles.primaryBtn]}
                    onPress={() => handleUpdateStatus(item.id, 'ACCEPTED')}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    <Text style={[styles.btnText, styles.primaryText]}>Accept Order</Text>
                  </TouchableOpacity>
                </>
              )}

              {item.onlineStatus === 'ACCEPTED' && (
                <TouchableOpacity
                  style={[styles.btn, styles.primaryBtn, { flex: 1 }]}
                  onPress={() => handleUpdateStatus(item.id, 'PREPARING')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="flame-outline" size={16} color="#FFFFFF" />
                  <Text style={[styles.btnText, styles.primaryText]}>Send to Kitchen</Text>
                </TouchableOpacity>
              )}

              {item.onlineStatus === 'PREPARING' && (
                <TouchableOpacity
                  style={[styles.btn, styles.readyBtn, { flex: 1 }]}
                  onPress={() => handleUpdateStatus(item.id, 'READY')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="checkmark-done" size={16} color="#FFFFFF" />
                  <Text style={[styles.btnText, styles.primaryText]}>Mark Ready for Hand-off</Text>
                </TouchableOpacity>
              )}

              {item.onlineStatus === 'READY' && item.orderType === 'DELIVERY' && (
                <TouchableOpacity
                  style={[styles.btn, styles.dispatchBtn, { flex: 1 }]}
                  onPress={() => handleUpdateStatus(item.id, 'OUT_FOR_DELIVERY')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="bicycle-outline" size={16} color="#FFFFFF" />
                  <Text style={[styles.btnText, styles.primaryText]}>Dispatch Courier</Text>
                </TouchableOpacity>
              )}

              {item.onlineStatus === 'READY' && item.orderType === 'TAKEOUT' && (
                <TouchableOpacity
                  style={[styles.btn, styles.primaryBtn, { flex: 1 }]}
                  onPress={() => handleUpdateStatus(item.id, 'COMPLETED')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  <Text style={[styles.btnText, styles.primaryText]}>Customer Picked Up</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Online Delivery Orders</Text>
          <Text style={styles.headerSubtitle}>DoorDash, UberEats & Direct Pickup</Text>
        </View>
        {onOpenHub && (
          <TouchableOpacity style={styles.hubBtn} onPress={onOpenHub} activeOpacity={0.7}>
            <Ionicons name="grid-outline" size={18} color={Colors.label} />
            <Text style={styles.hubBtnText}>Modules</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs with High Contrast */}
      <View style={styles.filterRibbon}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
          {STATUS_FILTERS.map((f) => {
            const isActive = activeFilter === f.key
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => {
                  triggerHaptic.selection()
                  setActiveFilter(f.key)
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </View>

      {/* List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.systemBlue} />
          <Text style={styles.loadingText}>Syncing online orders...</Text>
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="bicycle-outline" size={54} color={Colors.tertiaryLabel} />
          <Text style={styles.emptyTitle}>No Orders Found</Text>
          <Text style={styles.emptySubtitle}>
            There are currently no orders in {activeFilter} status.
          </Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={renderOrderItem}
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
  filterRibbon: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  filterContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
  },
  filterChipActive: {
    backgroundColor: Colors.systemBlue,
    borderColor: Colors.systemBlue,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.secondaryLabel,
  },
  filterChipTextActive: {
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
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderIdent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.label,
  },
  channelBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  channelText: {
    fontSize: 10,
    fontWeight: '800',
  },
  customerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  customerInfo: {
    flex: 1,
    gap: 2,
  },
  customerName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.label,
  },
  customerPhone: {
    fontSize: 12,
    color: Colors.secondaryLabel,
  },
  addressText: {
    fontSize: 12,
    color: Colors.secondaryLabel,
    marginTop: 2,
  },
  priceBlock: {
    alignItems: 'flex-end',
  },
  totalText: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.systemBlue,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.tertiaryLabel,
  },
  itemsContainer: {
    backgroundColor: Colors.tertiarySystemBackground,
    borderRadius: 8,
    padding: 10,
    gap: 6,
  },
  dishRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dishQty: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.systemBlue,
    width: 24,
  },
  dishName: {
    flex: 1,
    fontSize: 13,
    color: Colors.label,
  },
  dishPrice: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.label,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  primaryBtn: {
    backgroundColor: Colors.systemBlue,
    flex: 1,
  },
  rejectBtn: {
    backgroundColor: 'rgba(255, 69, 58, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 69, 58, 0.3)',
    width: 90,
  },
  readyBtn: {
    backgroundColor: Colors.systemGreen,
  },
  dispatchBtn: {
    backgroundColor: '#8b5cf6',
  },
  btnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  primaryText: {
    color: '#FFFFFF',
  },
  rejectText: {
    color: Colors.systemRed,
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
  },
})
