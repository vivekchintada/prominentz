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
  TextInput,
  Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '../../theme/colors'
import { triggerHaptic } from '../../components/Haptics'
import { StatusBadge } from '../../components/StatusBadge'
import { ConnectionIndicator } from '../../components/ConnectionIndicator'
import { useInventory } from '../../api/hooks'
import { UserProfile } from '../../types/models'
import { Api } from '../../api/client'
import Toast from 'react-native-toast-message'

interface InventoryScreenProps {
  user: UserProfile
}

export function InventoryScreen({ user }: InventoryScreenProps) {
  const [activeCategory, setActiveCategory] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  const { data: items = [], isLoading, isFetching, refetch } = useInventory()

  // Derive categories from live data
  const categories = ['ALL', ...Array.from(new Set(items.map((i) => i.category.toUpperCase())))]

  const filteredItems = items.filter((item) => {
    const matchesCategory = activeCategory === 'ALL' || item.category.toUpperCase() === activeCategory
    const matchesSearch = !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const lowStockItems = items.filter((i) => i.currentStock <= i.minStock)

  const getStockPercent = (item: typeof items[0]) => {
    if (item.minStock === 0) return 100
    return Math.min(100, Math.round((item.currentStock / Math.max(item.minStock * 2, item.currentStock)) * 100))
  }

  const handleAdjust = async (itemId: string, itemName: string, type: 'STOCK_IN' | 'WASTE') => {
    Alert.prompt(
      type === 'STOCK_IN' ? 'Stock In' : 'Log Waste',
      `Quantity to ${type === 'STOCK_IN' ? 'add' : 'waste'} for ${itemName}:`,
      async (value) => {
        const qty = parseFloat(value || '0')
        if (!qty || isNaN(qty) || qty <= 0) return
        triggerHaptic.medium()
        const ok = await Api.adjustInventoryStock(itemId, qty, type)
        if (ok) {
          Toast.show({ type: 'success', text1: type === 'STOCK_IN' ? 'Stock Updated' : 'Waste Logged' })
          refetch()
        } else {
          Toast.show({ type: 'error', text1: 'Failed to update stock' })
        }
      },
      'plain-text'
    )
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.systemBlue} />
          <Text style={styles.loadingText}>Loading inventory...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.navBar}>
        <View>
          <Text style={styles.navTitle}>Stock & Inventory</Text>
          <Text style={styles.navSub}>{items.length} items · {lowStockItems.length} low stock</Text>
        </View>
        <ConnectionIndicator />
      </View>

      {/* Critical Low Stock Warning */}
      {lowStockItems.length > 0 && (
        <View style={styles.warningBanner}>
          <Ionicons name="warning" size={20} color={Colors.systemRed} />
          <Text style={styles.warningText}>
            {lowStockItems.length} {lowStockItems.length === 1 ? 'ingredient' : 'ingredients'} below minimum par stock!
          </Text>
        </View>
      )}

      {/* Search */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={16} color={Colors.secondaryLabel} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search ingredients..."
          placeholderTextColor={Colors.secondaryLabel}
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
      </View>

      {/* Category Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryRibbon}
      >
        {categories.map((c) => (
          <TouchableOpacity
            key={c}
            style={[styles.catChip, activeCategory === c && styles.activeCatChip]}
            onPress={() => { triggerHaptic.selection(); setActiveCategory(c) }}
            activeOpacity={0.7}
          >
            <Text style={[styles.catText, activeCategory === c && styles.activeCatText]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Inventory Items */}
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
        {filteredItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={48} color={Colors.secondaryLabel} />
            <Text style={styles.emptyTitle}>No Items Found</Text>
            <Text style={styles.emptySub}>No inventory items match your filter.</Text>
          </View>
        ) : (
          filteredItems.map((item) => {
            const isLow = item.currentStock <= item.minStock
            const stockPct = getStockPercent(item)
            const barColor = isLow ? Colors.systemRed : stockPct > 60 ? Colors.systemGreen : Colors.systemOrange

            return (
              <View key={item.id} style={[styles.card, isLow && styles.lowStockCard]}>
                <View style={styles.cardHeader}>
                  <View style={styles.itemTitleCol}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemCategory}>{item.category.toUpperCase()}</Text>
                  </View>
                  {isLow ? (
                    <StatusBadge text="LOW STOCK" color={Colors.systemRed} />
                  ) : (
                    <StatusBadge text="HEALTHY" color={Colors.systemGreen} />
                  )}
                </View>

                {/* Stock Bar */}
                <View style={styles.stockBarTrack}>
                  <View style={[styles.stockBarFill, { width: `${stockPct}%`, backgroundColor: barColor }]} />
                </View>

                <View style={styles.stockDetailsRow}>
                  <View style={styles.stockCol}>
                    <Text style={styles.stockLabel}>On Hand</Text>
                    <Text style={[styles.stockVal, isLow && { color: Colors.systemRed }]}>
                      {item.currentStock} {item.unit}
                    </Text>
                  </View>
                  <View style={styles.stockCol}>
                    <Text style={styles.stockLabel}>Min Par</Text>
                    <Text style={styles.stockVal}>{item.minStock} {item.unit}</Text>
                  </View>
                  <View style={[styles.stockCol, { alignItems: 'flex-end' }]}>
                    <Text style={styles.stockLabel}>Unit Cost</Text>
                    <Text style={styles.unitCostVal}>${item.unitCost.toFixed(2)}</Text>
                  </View>
                </View>

                {/* Quick Action Buttons */}
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.stockInBtn}
                    onPress={() => handleAdjust(item.id, item.name, 'STOCK_IN')}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="add" size={14} color={Colors.systemGreen} />
                    <Text style={[styles.actionBtnText, { color: Colors.systemGreen }]}>Stock In</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.wasteBtn}
                    onPress={() => handleAdjust(item.id, item.name, 'WASTE')}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="trash-outline" size={14} color={Colors.systemOrange} />
                    <Text style={[styles.actionBtnText, { color: Colors.systemOrange }]}>Log Waste</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )
          })
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
  warningBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.12)',
    paddingHorizontal: 16, paddingVertical: 10, gap: 8,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255, 59, 48, 0.25)',
  },
  warningText: { fontSize: 13, fontWeight: '700', color: Colors.systemRed },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.secondarySystemGroupedBackground,
    marginHorizontal: 16, marginTop: 12, marginBottom: 4,
    paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 12, borderWidth: 1, borderColor: Colors.cardBorder,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.label },
  categoryRibbon: {
    paddingHorizontal: 12, paddingVertical: 10, gap: 8, flexDirection: 'row',
    backgroundColor: Colors.systemBackground,
    borderBottomWidth: 1, borderBottomColor: Colors.cardBorder,
  },
  catChip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10,
    backgroundColor: 'transparent', borderWidth: 1.5, borderColor: Colors.cardBorder,
  },
  activeCatChip: { backgroundColor: Colors.systemBlue, borderColor: Colors.systemBlue },
  catText: { fontSize: 12, fontWeight: '800', color: Colors.secondaryLabel, letterSpacing: 0.4 },
  activeCatText: { color: '#FFFFFF' },
  listContent: { padding: 16, gap: 12 },
  card: {
    backgroundColor: Colors.secondarySystemGroupedBackground, borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: Colors.cardBorder, gap: 10,
  },
  lowStockCard: { borderColor: 'rgba(255, 59, 48, 0.35)' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  itemTitleCol: { gap: 2, flex: 1 },
  itemName: { fontSize: 16, fontWeight: '700', color: Colors.label },
  itemCategory: { fontSize: 11, fontWeight: '700', color: Colors.secondaryLabel, letterSpacing: 0.4 },
  stockBarTrack: {
    height: 4, backgroundColor: Colors.separator,
    borderRadius: 2, overflow: 'hidden',
  },
  stockBarFill: { height: '100%', borderRadius: 2 },
  stockDetailsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  stockCol: { gap: 2 },
  stockLabel: { fontSize: 11, color: Colors.secondaryLabel },
  stockVal: { fontSize: 15, fontWeight: '700', color: Colors.label },
  unitCostVal: { fontSize: 15, fontWeight: '700', color: Colors.systemBlue },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  stockInBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 8, borderRadius: 8,
    backgroundColor: 'rgba(52, 199, 89, 0.1)', gap: 4,
  },
  wasteBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 8, borderRadius: 8,
    backgroundColor: 'rgba(255, 149, 0, 0.1)', gap: 4,
  },
  actionBtnText: { fontSize: 12, fontWeight: '700' },
  emptyContainer: { alignItems: 'center', paddingVertical: 80, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.label },
  emptySub: { fontSize: 13, color: Colors.secondaryLabel },
})
