import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '../../theme/colors'
import { MenuItem, UserProfile } from '../../types/models'
import { useMenuItems, useToggleAvailability } from '../../api/hooks'
import { triggerHaptic } from '../../components/Haptics'
import Toast from 'react-native-toast-message'

interface Menu86ScreenProps {
  user: UserProfile
  onOpenHub?: () => void
}

export function Menu86Screen({ user, onOpenHub }: Menu86ScreenProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('ALL')
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const { data: items = [], isLoading, isFetching, refetch } = useMenuItems()
  const toggleMutation = useToggleAvailability()

  const categories = ['ALL', ...Array.from(new Set(items.map((i) => i.category || 'Mains')))]

  const filteredItems = items.filter((item) => {
    const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesCategory && matchesSearch
  })

  const handleToggle = async (item: MenuItem, newValue: boolean) => {
    triggerHaptic.selection()
    setTogglingId(item.id)
    try {
      await toggleMutation.mutateAsync({ id: item.id, isAvailable: newValue })
      triggerHaptic.medium()
      Toast.show({
        type: 'success',
        text1: newValue ? 'Item Back In Stock' : 'Item 86’d (Out of Stock)',
        text2: `${item.name} status synchronized across POS and KDS`,
      })
    } catch {
      triggerHaptic.error()
      Toast.show({
        type: 'error',
        text1: 'Update Failed',
        text2: 'Could not toggle item availability on server.',
      })
    } finally {
      setTogglingId(null)
    }
  }

  const outOfStockCount = items.filter((i) => !i.isAvailable).length

  const renderDishItem = ({ item }: { item: MenuItem }) => {
    const isUpdating = togglingId === item.id
    const is86 = !item.isAvailable

    return (
      <View style={[styles.card, is86 && styles.card86]}>
        <View style={styles.cardMain}>
          <View style={styles.dishInfo}>
            <View style={styles.titleRow}>
              <Text style={[styles.dishName, is86 && styles.dishName86]}>{item.name}</Text>
              {item.isVeg && (
                <View style={styles.vegBadge}>
                  <Text style={styles.vegText}>VEG</Text>
                </View>
              )}
            </View>

            {item.description ? (
              <Text style={styles.dishDescription} numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}

            <View style={styles.metaRow}>
              <Text style={styles.dishPrice}>${item.price.toFixed(2)}</Text>
              <Text style={styles.categoryBadge}>{item.category}</Text>
            </View>
          </View>

          {/* 86 Toggle Control */}
          <View style={styles.toggleSection}>
            <View
              style={[
                styles.statusTag,
                is86 ? styles.statusTagOut : styles.statusTagIn,
              ]}
            >
              <Text
                style={[
                  styles.statusTagText,
                  is86 ? styles.statusTagTextOut : styles.statusTagTextIn,
                ]}
              >
                {is86 ? '86’D' : 'ACTIVE'}
              </Text>
            </View>

            {isUpdating ? (
              <ActivityIndicator size="small" color={Colors.systemBlue} />
            ) : (
              <Switch
                value={item.isAvailable}
                onValueChange={(val) => handleToggle(item, val)}
                trackColor={{
                  false: 'rgba(255, 69, 58, 0.4)',
                  true: Colors.systemGreen,
                }}
                thumbColor="#FFFFFF"
                ios_backgroundColor="rgba(255, 69, 58, 0.4)"
              />
            )}
          </View>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Menu 86 Manager</Text>
          <Text style={styles.headerSubtitle}>
            {outOfStockCount > 0
              ? `${outOfStockCount} items currently out of stock`
              : 'All menu items available'}
          </Text>
        </View>
        {onOpenHub && (
          <TouchableOpacity style={styles.hubBtn} onPress={onOpenHub} activeOpacity={0.7}>
            <Ionicons name="grid-outline" size={18} color={Colors.label} />
            <Text style={styles.hubBtnText}>Modules</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={16} color={Colors.secondaryLabel} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search dish or ingredient..."
          placeholderTextColor={Colors.tertiaryLabel}
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={16} color={Colors.secondaryLabel} />
          </TouchableOpacity>
        )}
      </View>

      {/* High-Contrast Category Ribbon */}
      <View style={styles.ribbonContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={categories}
          keyExtractor={(item) => item}
          renderItem={({ item }) => {
            const isSelected = selectedCategory === item
            return (
              <TouchableOpacity
                style={[styles.categoryChip, isSelected && styles.categoryChipActive]}
                onPress={() => {
                  triggerHaptic.selection()
                  setSelectedCategory(item)
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    isSelected && styles.categoryChipTextActive,
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            )
          }}
          contentContainerStyle={styles.ribbonContent}
        />
      </View>

      {/* Menu List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.systemBlue} />
          <Text style={styles.loadingText}>Syncing menu catalog...</Text>
        </View>
      ) : filteredItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="restaurant-outline" size={54} color={Colors.tertiaryLabel} />
          <Text style={styles.emptyTitle}>No Dishes Found</Text>
          <Text style={styles.emptySubtitle}>Try adjusting your search or category filter.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          renderItem={renderDishItem}
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondarySystemBackground,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.label,
    padding: 0,
  },
  ribbonContainer: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  ribbonContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
  },
  categoryChipActive: {
    backgroundColor: Colors.systemBlue,
    borderColor: Colors.systemBlue,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.secondaryLabel,
  },
  categoryChipTextActive: {
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
  },
  card86: {
    borderColor: 'rgba(255, 69, 58, 0.4)',
    backgroundColor: 'rgba(255, 69, 58, 0.05)',
  },
  cardMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dishInfo: {
    flex: 1,
    marginRight: 14,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dishName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.label,
  },
  dishName86: {
    textDecorationLine: 'line-through',
    color: Colors.secondaryLabel,
  },
  vegBadge: {
    backgroundColor: 'rgba(52, 199, 89, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  vegText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.systemGreen,
  },
  dishDescription: {
    fontSize: 12,
    color: Colors.secondaryLabel,
    lineHeight: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  dishPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.systemBlue,
  },
  categoryBadge: {
    fontSize: 11,
    color: Colors.tertiaryLabel,
    backgroundColor: Colors.tertiarySystemBackground,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  toggleSection: {
    alignItems: 'center',
    gap: 6,
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusTagIn: {
    backgroundColor: 'rgba(52, 199, 89, 0.15)',
  },
  statusTagOut: {
    backgroundColor: 'rgba(255, 69, 58, 0.15)',
  },
  statusTagText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statusTagTextIn: {
    color: Colors.systemGreen,
  },
  statusTagTextOut: {
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
