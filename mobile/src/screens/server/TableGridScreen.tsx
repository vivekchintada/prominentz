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
  Modal,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '../../theme/colors'
import { triggerHaptic } from '../../components/Haptics'
import { StatusBadge } from '../../components/StatusBadge'
import { ConnectionIndicator } from '../../components/ConnectionIndicator'
import { ServerHostModal } from '../../components/ServerHostModal'
import { ActiveCheckModal } from './ActiveCheckModal'
import { PaymentModal } from '../../components/PaymentModal'
import { TableStatusModal } from '../../components/TableStatusModal'
import { SplitBillModal } from '../../components/SplitBillModal'
import { NotificationsModal } from '../../components/NotificationsModal'
import { useTables, useMenuItems, useCreateOrder, useOrders, useNotifications } from '../../api/hooks'
import { useRealtimeEvents } from '../../api/useRealtimeEvents'
import { MenuItem, OrderItem, RestaurantTable, UserProfile } from '../../types/models'
import Toast from 'react-native-toast-message'

interface TableGridScreenProps {
  user: UserProfile
  onLogout: () => void
  onSwitchRole: (role: 'OWNER' | 'KITCHEN') => void
  onOrderFired?: (table: RestaurantTable, items: OrderItem[]) => void
}

export function TableGridScreen({
  user,
  onLogout,
  onSwitchRole,
  onOrderFired,
}: TableGridScreenProps) {
  // Real-time events connection
  useRealtimeEvents()

  // TanStack Query Hooks
  const { data: tables = [], isLoading: tablesLoading, isFetching: tablesFetching, refetch: refetchTables } = useTables()
  const { data: menuItems = [] } = useMenuItems()
  const { data: liveOrders = [] } = useOrders()
  const { data: notifData } = useNotifications()
  const createOrderMutation = useCreateOrder()

  const [selectedFloor, setSelectedFloor] = useState('All Floors')
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null)
  const [tableActionTarget, setTableActionTarget] = useState<RestaurantTable | null>(null)
  const [paymentTableTarget, setPaymentTableTarget] = useState<RestaurantTable | null>(null)
  const [statusSwitcherTable, setStatusSwitcherTable] = useState<RestaurantTable | null>(null)
  const [splitBillTarget, setSplitBillTarget] = useState<RestaurantTable | null>(null)
  const [showNotifications, setShowNotifications] = useState(false)

  const [selectedCategory, setSelectedCategory] = useState('All')
  const [activeCheckItems, setActiveCheckItems] = useState<OrderItem[]>([])
  const [guestCount, setGuestCount] = useState(2)
  const [showCheckModal, setShowCheckModal] = useState(false)
  const [showHostModal, setShowHostModal] = useState(false)

  // Dynamic floor sections from live tables
  const floors = ['All Floors', ...Array.from(new Set(tables.map((t) => t.floor || 'Main Dining')))]

  // Dynamic menu categories
  const categories = ['All', ...Array.from(new Set(menuItems.map((d) => d.category || 'Mains')))]

  // Filter tables by floor/section
  const displayedTables = tables.filter((t) => {
    if (selectedFloor === 'All Floors') return true
    return (t.floor || 'Main Dining') === selectedFloor
  })

  // Filter dishes by category
  const filteredDishes = menuItems.filter(
    (item) => selectedCategory === 'All' || item.category === selectedCategory
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'EMPTY': return Colors.systemGreen
      case 'ACTIVE': return Colors.systemBlue
      case 'PAYING': return Colors.systemOrange
      case 'RESERVED': return Colors.systemPurple
      default: return Colors.secondaryLabel
    }
  }

  const handleAddItem = (dish: MenuItem) => {
    triggerHaptic.medium()
    const existingIndex = activeCheckItems.findIndex((i) => i.menuItemId === dish.id)
    if (existingIndex > -1) {
      const updated = [...activeCheckItems]
      updated[existingIndex].quantity += 1
      updated[existingIndex].totalPrice = updated[existingIndex].quantity * updated[existingIndex].unitPrice
      setActiveCheckItems(updated)
    } else {
      const newItem: OrderItem = {
        id: `oi_${Date.now()}`,
        menuItemId: dish.id,
        name: dish.name,
        quantity: 1,
        unitPrice: dish.price,
        totalPrice: dish.price,
        course: dish.category.toLowerCase().includes('starter')
          ? 'STARTER'
          : dish.category.toLowerCase().includes('dessert')
          ? 'DESSERT'
          : dish.category.toLowerCase().includes('cocktail') || dish.category.toLowerCase().includes('beverage')
          ? 'BEVERAGE'
          : 'MAIN',
      }
      setActiveCheckItems([...activeCheckItems, newItem])
    }
  }

  const handleUpdateQuantity = (index: number, delta: number) => {
    triggerHaptic.light()
    const updated = [...activeCheckItems]
    updated[index].quantity += delta
    if (updated[index].quantity <= 0) {
      updated.splice(index, 1)
    } else {
      updated[index].totalPrice = updated[index].quantity * updated[index].unitPrice
    }
    setActiveCheckItems(updated)
  }

  const handleFireOrder = async () => {
    if (!selectedTable) return

    triggerHaptic.success()
    try {
      const res = await createOrderMutation.mutateAsync({
        tableId: selectedTable.id,
        guestCount,
        items: activeCheckItems,
        notes: `Fired from Mobile Handheld by ${user.name}`,
      })

      if (res.success) {
        Toast.show({
          type: 'success',
          text1: 'Order Fired to Kitchen',
          text2: `${selectedTable.name} • ${activeCheckItems.length} items sent to KDS`,
        })

        if (onOrderFired) {
          onOrderFired(selectedTable, activeCheckItems)
        }
      } else {
        Toast.show({
          type: 'error',
          text1: 'Order Fire Failed',
          text2: res.error || 'Server error',
        })
      }
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: err.message || 'Could not fire order',
      })
    } finally {
      setActiveCheckItems([])
      setShowCheckModal(false)
      setSelectedTable(null)
    }
  }

  const activeCheckTotal = activeCheckItems.reduce((acc, i) => acc + i.totalPrice, 0)
  const activeCheckQty = activeCheckItems.reduce((acc, i) => acc + i.quantity, 0)

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Navigation Bar */}
      <View style={styles.navBar}>
        <View>
          <Text style={styles.navTitle}>
            {selectedTable ? `${selectedTable.name} • Ordering` : 'Dining Tables'}
          </Text>
          <Text style={styles.navSub}>{user.name} • Server Handheld</Text>
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
            style={styles.iconBtn}
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
            style={styles.iconBtn}
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

      {/* Role Switcher */}
      <View style={styles.roleBar}>
        <Text style={styles.roleLabel}>SWITCH VIEW:</Text>
        <TouchableOpacity
          style={styles.roleChip}
          onPress={() => {
            triggerHaptic.selection()
            onSwitchRole('OWNER')
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.roleChipText}>👑 Owner / GM</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.roleChip}
          onPress={() => {
            triggerHaptic.selection()
            onSwitchRole('KITCHEN')
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.roleChipText}>👨‍🍳 Kitchen KDS</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      {tablesLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.systemBlue} />
          <Text style={styles.loadingText}>Syncing tables from SaaS...</Text>
        </View>
      ) : !selectedTable ? (
        <View style={{ flex: 1 }}>
          {/* Floor / Section Tabs with High-Contrast Active State */}
          <View style={styles.sectionRibbonContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.sectionRibbon}
            >
              {floors.map((floor) => {
                const isActive = selectedFloor === floor
                return (
                  <TouchableOpacity
                    key={floor}
                    style={[styles.floorChip, isActive && styles.floorChipActive]}
                    onPress={() => {
                      triggerHaptic.selection()
                      setSelectedFloor(floor)
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.floorChipText, isActive && styles.floorChipTextActive]}>
                      {floor}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
          </View>

          {/* Tables Grid */}
          <ScrollView
            contentContainerStyle={styles.tablesGrid}
            refreshControl={
              <RefreshControl
                refreshing={tablesFetching}
                onRefresh={() => {
                  triggerHaptic.light()
                  refetchTables()
                }}
                tintColor={Colors.systemBlue}
              />
            }
          >
            {displayedTables.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="grid-outline" size={44} color={Colors.secondaryLabel} />
                <Text style={styles.emptyTitle}>No Tables in {selectedFloor}</Text>
                <Text style={styles.emptySub}>Add tables for this floor in SaaS dashboard.</Text>
              </View>
            ) : (
              displayedTables.map((table) => (
                <TouchableOpacity
                  key={table.id}
                  style={[
                    styles.tableCard,
                    table.isOccupied && { borderColor: getStatusColor(table.status), borderWidth: 2 },
                  ]}
                  onPress={() => {
                    triggerHaptic.selection()
                    if (table.isOccupied && table.orderTotal && table.orderTotal > 0) {
                      setTableActionTarget(table)
                    } else {
                      setSelectedTable(table)
                    }
                  }}
                  onLongPress={() => {
                    triggerHaptic.medium()
                    setStatusSwitcherTable(table)
                  }}
                  delayLongPress={300}
                  activeOpacity={0.7}
                >
                  <View style={styles.tableHeader}>
                    <Text style={styles.tableName}>{table.name}</Text>
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation()
                        triggerHaptic.selection()
                        setStatusSwitcherTable(table)
                      }}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <StatusBadge
                        text={table.status}
                        color={getStatusColor(table.status)}
                      />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.tableMeta}>
                    <View style={styles.metaRow}>
                      <Ionicons name="people-outline" size={14} color={Colors.secondaryLabel} />
                      <Text style={styles.metaText}>{table.capacity} Seats</Text>
                    </View>

                    {table.floor ? (
                      <View style={styles.metaRow}>
                        <Ionicons name="location-outline" size={14} color={Colors.secondaryLabel} />
                        <Text style={styles.metaText}>{table.floor}</Text>
                      </View>
                    ) : null}

                    {table.isOccupied && table.elapsedMinutes ? (
                      <View style={styles.metaRow}>
                        <Ionicons name="time-outline" size={14} color={Colors.secondaryLabel} />
                        <Text style={styles.metaText}>{table.elapsedMinutes}m</Text>
                      </View>
                    ) : null}
                  </View>

                  {table.orderTotal && table.orderTotal > 0 ? (
                    <View style={styles.tableTotalRow}>
                      <Text style={styles.checkLabel}>Active Check</Text>
                      <Text style={styles.checkAmount}>${table.orderTotal.toFixed(2)}</Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      ) : (
        <View style={styles.orderingContainer}>
          {/* Back to Tables Button */}
          <TouchableOpacity
            style={styles.backToTablesRow}
            onPress={() => {
              triggerHaptic.light()
              setSelectedTable(null)
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={18} color={Colors.systemBlue} />
            <Text style={styles.backToTablesText}>Back to Table Map</Text>
          </TouchableOpacity>

          {/* Categories Ribbon */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryRibbon}
          >
            {categories.map((cat) => {
              const isActive = selectedCategory === cat
              return (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryPill,
                    isActive && styles.activePill,
                  ]}
                  onPress={() => {
                    triggerHaptic.selection()
                    setSelectedCategory(cat)
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      isActive && styles.activeCategoryText,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>

          {/* Dishes List */}
          <ScrollView contentContainerStyle={styles.dishesList}>
            {filteredDishes.map((dish) => (
              <View key={dish.id} style={styles.dishCard}>
                <View style={styles.dishInfo}>
                  <View style={styles.dishTitleRow}>
                    <Text style={styles.dishName}>{dish.name}</Text>
                    {dish.isVeg && (
                      <Ionicons name="leaf" size={14} color={Colors.systemGreen} />
                    )}
                  </View>
                  {dish.description && (
                    <Text style={styles.dishDesc} numberOfLines={2}>
                      {dish.description}
                    </Text>
                  )}
                  <Text style={styles.dishPrice}>${dish.price.toFixed(2)}</Text>
                </View>

                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={() => handleAddItem(dish)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add" size={22} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>

          {/* Floating Active Check Bottom Bar */}
          {activeCheckItems.length > 0 && (
            <View style={styles.floatingBar}>
              <View>
                <Text style={styles.floatingQty}>
                  {activeCheckQty} {activeCheckQty === 1 ? 'Dish' : 'Dishes'} Added
                </Text>
                <Text style={styles.floatingTotal}>${activeCheckTotal.toFixed(2)}</Text>
              </View>

              <TouchableOpacity
                style={styles.reviewBtn}
                onPress={() => {
                  triggerHaptic.medium()
                  setShowCheckModal(true)
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.reviewBtnText}>Review Check</Text>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Active Check Modal */}
      {selectedTable && (
        <ActiveCheckModal
          visible={showCheckModal}
          table={selectedTable}
          items={activeCheckItems}
          guestCount={guestCount}
          onUpdateGuestCount={(d) => setGuestCount((prev) => Math.max(1, prev + d))}
          onUpdateQuantity={handleUpdateQuantity}
          onFireOrder={handleFireOrder}
          onClose={() => setShowCheckModal(false)}
        />
      )}

      <ServerHostModal
        visible={showHostModal}
        onClose={() => setShowHostModal(false)}
        onSaved={() => refetchTables()}
      />

      {/* Occupied Table Action Sheet */}
      {tableActionTarget && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setTableActionTarget(null)}
        >
          <View style={styles.sheetOverlay}>
            <View style={styles.sheetContent}>
              <View style={styles.sheetHeader}>
                <View>
                  <Text style={styles.sheetTitle}>{tableActionTarget.name}</Text>
                  <Text style={styles.sheetSub}>
                    Active Check: ${(tableActionTarget.orderTotal || 0).toFixed(2)}
                    {tableActionTarget.elapsedMinutes ? ` • ${tableActionTarget.elapsedMinutes}m seated` : ''}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setTableActionTarget(null)} style={{ padding: 4 }}>
                  <Ionicons name="close" size={24} color={Colors.secondaryLabel} />
                </TouchableOpacity>
              </View>

              <View style={styles.sheetActions}>
                <TouchableOpacity
                  style={styles.sheetSettleBtn}
                  onPress={() => {
                    triggerHaptic.medium()
                    const target = tableActionTarget
                    setTableActionTarget(null)
                    setPaymentTableTarget(target)
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="card-outline" size={24} color="#FFFFFF" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sheetSettleText}>Settle & Collect Payment</Text>
                    <Text style={styles.sheetSettleSub}>Cash tender with change calculation or Card</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.sheetSplitBtn}
                  onPress={() => {
                    triggerHaptic.medium()
                    const target = tableActionTarget
                    setTableActionTarget(null)
                    setSplitBillTarget(target)
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="git-branch-outline" size={24} color="#A78BFA" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sheetSplitText}>Split Bill</Text>
                    <Text style={styles.sheetSplitSub}>Even N-way split or split by seat / item</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#A78BFA" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.sheetOrderBtn}
                  onPress={() => {
                    triggerHaptic.selection()
                    const target = tableActionTarget
                    setTableActionTarget(null)
                    setSelectedTable(target)
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="restaurant-outline" size={24} color={Colors.systemBlue} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sheetOrderText}>Add More Items / Course</Text>
                    <Text style={styles.sheetOrderSub}>Fire additional dishes to kitchen</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={Colors.secondaryLabel} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.sheetStatusBtn}
                  onPress={() => {
                    triggerHaptic.selection()
                    const target = tableActionTarget
                    setTableActionTarget(null)
                    setStatusSwitcherTable(target)
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="swap-horizontal-outline" size={24} color={Colors.systemOrange} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sheetStatusText}>Change Table Status</Text>
                    <Text style={styles.sheetStatusSub}>Set to Available, Occupied, Paying, or Reserved</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={Colors.secondaryLabel} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Payment Collection Modal */}
      {paymentTableTarget && (
        <PaymentModal
          visible={true}
          orderId={paymentTableTarget.activeOrderId || paymentTableTarget.id}
          orderNumber={`#${(paymentTableTarget.activeOrderId || paymentTableTarget.id).slice(-4).toUpperCase()}`}
          tableName={paymentTableTarget.name}
          subtotal={Number(((paymentTableTarget.orderTotal || 0) * 0.9).toFixed(2))}
          tax={Number(((paymentTableTarget.orderTotal || 0) * 0.1).toFixed(2))}
          total={paymentTableTarget.orderTotal || 0}
          onClose={() => setPaymentTableTarget(null)}
          onSuccess={() => {
            setPaymentTableTarget(null)
            refetchTables()
          }}
        />
      )}

      {/* Table Quick-Status Switcher Modal */}
      <TableStatusModal
        visible={!!statusSwitcherTable}
        table={statusSwitcherTable}
        onClose={() => setStatusSwitcherTable(null)}
        onSuccess={() => refetchTables()}
      />

      {/* Bill Splitter Modal */}
      {splitBillTarget && (() => {
        const activeOrderForSplit = liveOrders.find(
          (o) => o.id === splitBillTarget.activeOrderId || o.tableId === splitBillTarget.id
        )
        const sub = activeOrderForSplit?.subtotal ?? Number(((splitBillTarget.orderTotal || 0) * 0.9).toFixed(2))
        const tx = activeOrderForSplit?.tax ?? Number(((splitBillTarget.orderTotal || 0) * 0.1).toFixed(2))
        const tot = activeOrderForSplit?.total ?? splitBillTarget.orderTotal ?? 0

        return (
          <SplitBillModal
            visible={true}
            orderId={activeOrderForSplit?.id || splitBillTarget.activeOrderId || splitBillTarget.id}
            orderNumber={activeOrderForSplit?.orderNumber || `#${(splitBillTarget.activeOrderId || splitBillTarget.id).slice(-4).toUpperCase()}`}
            tableName={splitBillTarget.name}
            subtotal={sub}
            tax={tx}
            total={tot}
            items={activeOrderForSplit?.items || []}
            onClose={() => setSplitBillTarget(null)}
            onSuccess={() => {
              setSplitBillTarget(null)
              refetchTables()
            }}
          />
        )
      })()}

      {/* Notifications Modal */}
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
  iconBtn: {
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
  roleLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.tertiaryLabel,
    letterSpacing: 0.5,
  },
  roleChip: {
    backgroundColor: Colors.systemGroupedBackground,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  roleChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.label,
  },
  sectionRibbonContainer: {
    backgroundColor: Colors.systemGroupedBackground,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
    paddingVertical: 8,
  },
  sectionRibbon: {
    paddingHorizontal: 16,
    gap: 8,
  },
  floorChip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
  },
  floorChipActive: {
    backgroundColor: Colors.systemBlue,
    borderColor: Colors.systemBlue,
  },
  floorChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.secondaryLabel,
  },
  floorChipTextActive: {
    color: '#FFFFFF',
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.label,
  },
  emptySub: {
    fontSize: 13,
    color: Colors.secondaryLabel,
  },
  tablesGrid: {
    padding: 16,
    gap: 12,
    paddingBottom: 80,
  },
  tableCard: {
    backgroundColor: Colors.secondarySystemGroupedBackground,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    gap: 12,
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tableName: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.label,
  },
  tableMeta: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: Colors.secondaryLabel,
  },
  tableTotalRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  checkLabel: {
    fontSize: 12,
    color: Colors.secondaryLabel,
  },
  checkAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.systemBlue,
  },
  orderingContainer: {
    flex: 1,
  },
  backToTablesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 4,
  },
  backToTablesText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.systemBlue,
  },
  categoryRibbon: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
  },
  activePill: {
    backgroundColor: Colors.systemBlue,
    borderColor: Colors.systemBlue,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.secondaryLabel,
  },
  activeCategoryText: {
    color: '#FFFFFF',
  },
  dishesList: {
    padding: 16,
    gap: 12,
    paddingBottom: 100,
  },
  dishCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondarySystemGroupedBackground,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    gap: 14,
  },
  dishInfo: {
    flex: 1,
    gap: 4,
  },
  dishTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dishName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.label,
  },
  dishDesc: {
    fontSize: 12,
    color: Colors.secondaryLabel,
    lineHeight: 16,
  },
  dishPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.systemBlue,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.systemBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingBar: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: Colors.secondarySystemGroupedBackground,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  floatingQty: {
    fontSize: 12,
    color: Colors.secondaryLabel,
  },
  floatingTotal: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.label,
  },
  reviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.systemBlue,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  reviewBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  sheetContent: {
    backgroundColor: Colors.secondarySystemGroupedBackground,
    borderRadius: 20,
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.label,
  },
  sheetSub: {
    fontSize: 13,
    color: Colors.secondaryLabel,
    marginTop: 2,
  },
  sheetActions: {
    gap: 12,
  },
  sheetSettleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.systemGreen,
    borderRadius: 14,
    padding: 16,
    gap: 14,
  },
  sheetSettleText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  sheetSettleSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  sheetOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 132, 255, 0.1)',
    borderRadius: 14,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(10, 132, 255, 0.3)',
  },
  sheetOrderText: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.systemBlue,
  },
  sheetOrderSub: {
    fontSize: 12,
    color: Colors.secondaryLabel,
    marginTop: 2,
  },
  sheetSplitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(167, 139, 250, 0.12)',
    borderRadius: 14,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.3)',
  },
  sheetSplitText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#A78BFA',
  },
  sheetSplitSub: {
    fontSize: 12,
    color: Colors.secondaryLabel,
    marginTop: 2,
  },
  sheetStatusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
    borderRadius: 14,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 149, 0, 0.25)',
  },
  sheetStatusText: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.systemOrange,
  },
  sheetStatusSub: {
    fontSize: 12,
    color: Colors.secondaryLabel,
    marginTop: 2,
  },
})

