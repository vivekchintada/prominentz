import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '../../theme/colors'
import { CustomerProfile, UserProfile } from '../../types/models'
import { useCustomers } from '../../api/hooks'
import { triggerHaptic } from '../../components/Haptics'

interface CrmScreenProps {
  user: UserProfile
  onOpenHub?: () => void
}

export function CrmScreen({ user, onOpenHub }: CrmScreenProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const { data: customers = [], isLoading, isFetching, refetch } = useCustomers(searchQuery)

  const getTierColor = (tier: string) => {
    const lower = tier.toLowerCase()
    if (lower.includes('plat')) return '#a78bfa'
    if (lower.includes('gold') || lower.includes('vip')) return '#f59e0b'
    if (lower.includes('silver')) return '#94a3b8'
    return '#3b82f6'
  }

  const renderCustomerCard = ({ item }: { item: CustomerProfile }) => {
    const tierColor = getTierColor(item.tierName)

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </Text>
          </View>

          <View style={styles.headerInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.customerName}>{item.name}</Text>
              <View style={[styles.tierBadge, { backgroundColor: `${tierColor}20`, borderColor: tierColor }]}>
                <Ionicons name="star" size={10} color={tierColor} />
                <Text style={[styles.tierText, { color: tierColor }]}>{item.tierName}</Text>
              </View>
            </View>

            {item.phone && (
              <View style={styles.contactRow}>
                <Ionicons name="call-outline" size={12} color={Colors.secondaryLabel} />
                <Text style={styles.contactText}>{item.phone}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Guest Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Lifetime Spend</Text>
            <Text style={styles.statValue}>${item.totalSpent.toFixed(0)}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Visits</Text>
            <Text style={styles.statValue}>{item.totalVisits}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Loyalty Pts</Text>
            <Text style={[styles.statValue, { color: Colors.systemBlue }]}>
              {item.loyaltyPoints}
            </Text>
          </View>
        </View>

        {item.notes ? (
          <View style={styles.notesBox}>
            <Ionicons name="information-circle-outline" size={13} color={Colors.secondaryLabel} />
            <Text style={styles.notesText}>{item.notes}</Text>
          </View>
        ) : null}
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Guest CRM & Loyalty</Text>
          <Text style={styles.headerSubtitle}>
            {customers.length} registered VIP diners & loyalty profiles
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
          placeholder="Search guest by name, phone, or email..."
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

      {/* List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.systemBlue} />
          <Text style={styles.loadingText}>Syncing CRM profiles...</Text>
        </View>
      ) : customers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={54} color={Colors.tertiaryLabel} />
          <Text style={styles.emptyTitle}>No Guests Found</Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery
              ? `No guest profiles match "${searchQuery}".`
              : 'Guest profiles created from dine-in checks and online orders appear here automatically.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={customers}
          keyExtractor={(item) => item.id}
          renderItem={renderCustomerCard}
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
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(10, 132, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.systemBlue,
  },
  headerInfo: {
    flex: 1,
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.label,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  tierText: {
    fontSize: 10,
    fontWeight: '800',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  contactText: {
    fontSize: 12,
    color: Colors.secondaryLabel,
  },
  statsGrid: {
    flexDirection: 'row',
    backgroundColor: Colors.tertiarySystemBackground,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.tertiaryLabel,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.label,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.cardBorder,
  },
  notesBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: 8,
    borderRadius: 6,
  },
  notesText: {
    fontSize: 12,
    color: Colors.secondaryLabel,
    flex: 1,
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
})
