import React, { useState, useMemo, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '../theme/colors'
import { triggerHaptic } from './Haptics'
import { useCollectPayment } from '../api/hooks'
import { OrderItem } from '../types/models'
import Toast from 'react-native-toast-message'

export interface SplitBillItem {
  id: string
  name: string
  quantity: number
  unitPrice?: number
  price?: number
  totalPrice?: number
  [key: string]: any
}

interface SplitBillModalProps {
  visible: boolean
  orderId: string
  orderNumber: string
  tableName: string
  subtotal: number
  tax: number
  total: number
  items?: SplitBillItem[]
  onClose: () => void
  onSuccess?: () => void
}


type SplitMode = 'EVEN' | 'ITEM'
type TipOption = 0 | 0.15 | 0.18 | 0.2 | 'CUSTOM'

interface EvenSplitShare {
  guestNumber: number
  subtotal: number
  tax: number
  tip: number
  total: number
  isPaid: boolean
  paidMethod?: 'CASH' | 'CARD'
  paidAt?: string
}

interface SeatGuest {
  id: number
  name: string
  isPaid: boolean
  paidMethod?: 'CASH' | 'CARD'
  tipRate: TipOption
  customTip: string
}

export function SplitBillModal({
  visible,
  orderId,
  orderNumber,
  tableName,
  subtotal,
  tax,
  total: initialTotal,
  items = [],
  onClose,
  onSuccess,
}: SplitBillModalProps) {
  const [mode, setMode] = useState<SplitMode>('EVEN')

  // ── Even Split State ──
  const [guestCount, setGuestCount] = useState<number>(2)
  const [evenTipRate, setEvenTipRate] = useState<TipOption>(0.18)
  const [evenCustomTip, setEvenCustomTip] = useState<string>('')
  const [evenShares, setEvenShares] = useState<EvenSplitShare[]>([])
  const [activeTenderShare, setActiveTenderShare] = useState<number | null>(null) // guestNumber

  // ── Item / Seat Split State ──
  const [seatCount, setSeatCount] = useState<number>(2)
  const [seats, setSeats] = useState<SeatGuest[]>([
    { id: 1, name: 'Guest 1', isPaid: false, tipRate: 0.18, customTip: '' },
    { id: 2, name: 'Guest 2', isPaid: false, tipRate: 0.18, customTip: '' },
  ])
  // itemAllocations: itemId -> seatId (0 means "Shared / Split Evenly")
  const [itemAllocations, setItemAllocations] = useState<Record<string, number>>({})
  const [activeTenderSeat, setActiveTenderSeat] = useState<number | null>(null)

  const collectPaymentMutation = useCollectPayment()

  // ── Even Split Computations ──
  const totalTip = useMemo(() => {
    if (evenTipRate === 'CUSTOM') {
      return parseFloat(evenCustomTip) || 0
    }
    return Number((subtotal * evenTipRate).toFixed(2))
  }, [subtotal, evenTipRate, evenCustomTip])

  const billGrandTotal = Number((initialTotal + totalTip).toFixed(2))

  // Recompute even shares whenever count or tip changes
  useEffect(() => {
    const baseTotal = billGrandTotal
    const rawShare = baseTotal / guestCount
    const centsPerPerson = Math.floor(rawShare * 100) / 100
    const remainder = Number((baseTotal - centsPerPerson * guestCount).toFixed(2))

    const newShares: EvenSplitShare[] = []
    for (let i = 1; i <= guestCount; i++) {
      // allocate leftover cents to first guest so total reconciles 100%
      const shareTotal = i === 1 ? Number((centsPerPerson + remainder).toFixed(2)) : centsPerPerson
      const shareSubtotal = Number((subtotal / guestCount).toFixed(2))
      const shareTax = Number((tax / guestCount).toFixed(2))
      const shareTip = Number((totalTip / guestCount).toFixed(2))

      // preserve paid status if already paid
      const existing = evenShares.find((s) => s.guestNumber === i)
      newShares.push({
        guestNumber: i,
        subtotal: shareSubtotal,
        tax: shareTax,
        tip: shareTip,
        total: shareTotal,
        isPaid: existing?.isPaid || false,
        paidMethod: existing?.paidMethod,
        paidAt: existing?.paidAt,
      })
    }
    setEvenShares(newShares)
  }, [guestCount, billGrandTotal, subtotal, tax, totalTip])

  // Even split stats
  const evenPaidShares = evenShares.filter((s) => s.isPaid)
  const evenTotalCollected = evenPaidShares.reduce((sum, s) => sum + s.total, 0)
  const isEvenAllPaid = evenShares.length > 0 && evenShares.every((s) => s.isPaid)

  // ── Item Split Computations ──
  const seatCalculations = useMemo(() => {
    return seats.map((seat) => {
      // find items directly assigned to this seat
      const directlyAssigned = items.filter(
        (it) => (itemAllocations[it.id] ?? 1) === seat.id
      )
      // find items marked shared (0)
      const sharedItems = items.filter(
        (it) => (itemAllocations[it.id] ?? 1) === 0
      )

      const directSubtotal = directlyAssigned.reduce(
        (sum, it) => sum + (it.totalPrice ?? ((it.unitPrice ?? it.price ?? 0) * it.quantity)),
        0
      )
      const sharedSubtotal = sharedItems.reduce(
        (sum, it) => sum + (it.totalPrice ?? ((it.unitPrice ?? it.price ?? 0) * it.quantity)),
        0
      ) / Math.max(seats.length, 1)



      const seatSubtotal = Number((directSubtotal + sharedSubtotal).toFixed(2))
      const subtotalRatio = subtotal > 0 ? seatSubtotal / subtotal : 1 / seats.length
      const seatTax = Number((tax * subtotalRatio).toFixed(2))

      let seatTip = 0
      if (seat.tipRate === 'CUSTOM') {
        seatTip = parseFloat(seat.customTip) || 0
      } else {
        seatTip = Number((seatSubtotal * seat.tipRate).toFixed(2))
      }

      const seatTotal = Number((seatSubtotal + seatTax + seatTip).toFixed(2))

      return {
        ...seat,
        itemsCount: directlyAssigned.length,
        subtotal: seatSubtotal,
        tax: seatTax,
        tip: seatTip,
        total: seatTotal,
      }
    })
  }, [seats, items, itemAllocations, subtotal, tax])

  const itemPaidSeats = seatCalculations.filter((s) => s.isPaid)
  const itemTotalCollected = itemPaidSeats.reduce((sum, s) => sum + s.total, 0)
  const isItemAllPaid = seatCalculations.length > 0 && seatCalculations.every((s) => s.isPaid)

  // ── Handlers for Even Split ──
  const handleMarkEvenSharePaid = (guestNumber: number, tenderMethod: 'CASH' | 'CARD') => {
    triggerHaptic.success()
    setEvenShares((prev) =>
      prev.map((s) =>
        s.guestNumber === guestNumber
          ? {
              ...s,
              isPaid: true,
              paidMethod: tenderMethod,
              paidAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            }
          : s
      )
    )
    setActiveTenderShare(null)
    Toast.show({
      type: 'success',
      text1: `Guest ${guestNumber} Share Paid`,
      text2: `$${(evenShares.find((s) => s.guestNumber === guestNumber)?.total || 0).toFixed(2)} via ${tenderMethod}`,
    })
  }

  const handleResetEvenShare = (guestNumber: number) => {
    triggerHaptic.selection()
    setEvenShares((prev) =>
      prev.map((s) =>
        s.guestNumber === guestNumber
          ? { ...s, isPaid: false, paidMethod: undefined, paidAt: undefined }
          : s
      )
    )
  }

  // ── Handlers for Seat Split ──
  const handleAddSeat = () => {
    if (seats.length >= 10) return
    triggerHaptic.light()
    const nextId = seats.length + 1
    setSeats((prev) => [
      ...prev,
      { id: nextId, name: `Guest ${nextId}`, isPaid: false, tipRate: 0.18, customTip: '' },
    ])
  }

  const handleRemoveSeat = () => {
    if (seats.length <= 2) return
    triggerHaptic.light()
    const removedId = seats[seats.length - 1].id
    setSeats((prev) => prev.slice(0, prev.length - 1))
    // reassign any items that were assigned to the removed seat to seat 1
    setItemAllocations((prev) => {
      const updated = { ...prev }
      Object.keys(updated).forEach((k) => {
        if (updated[k] === removedId) updated[k] = 1
      })
      return updated
    })
  }

  const handleMarkSeatPaid = (seatId: number, tenderMethod: 'CASH' | 'CARD') => {
    triggerHaptic.success()
    setSeats((prev) =>
      prev.map((s) => (s.id === seatId ? { ...s, isPaid: true, paidMethod: tenderMethod } : s))
    )
    setActiveTenderSeat(null)
    const target = seatCalculations.find((s) => s.id === seatId)
    Toast.show({
      type: 'success',
      text1: `${target?.name || `Guest ${seatId}`} Settled`,
      text2: `$${(target?.total || 0).toFixed(2)} via ${tenderMethod}`,
    })
  }

  const handleResetSeatPaid = (seatId: number) => {
    triggerHaptic.selection()
    setSeats((prev) =>
      prev.map((s) => (s.id === seatId ? { ...s, isPaid: false, paidMethod: undefined } : s))
    )
  }

  // ── Final Order Settlement in Backend ──
  const handleFinalizeSplitOrder = async () => {
    triggerHaptic.medium()
    try {
      const finalTip =
        mode === 'EVEN'
          ? totalTip
          : seatCalculations.reduce((sum, s) => sum + s.tip, 0)
      const finalTotal =
        mode === 'EVEN'
          ? billGrandTotal
          : seatCalculations.reduce((sum, s) => sum + s.total, 0)

      const res = await collectPaymentMutation.mutateAsync({
        orderId,
        method: 'CARD', // split settled representation
        subtotal,
        tax,
        tip: finalTip,
        total: finalTotal,
      })

      if (res.success) {
        triggerHaptic.success()
        Toast.show({
          type: 'success',
          text1: 'All Split Payments Settled!',
          text2: `${tableName} check fully closed & table cleared`,
        })
        if (onSuccess) onSuccess()
        onClose()
      } else {
        Toast.show({
          type: 'error',
          text1: 'Settlement Error',
          text2: res.error || 'Failed to complete order in SaaS',
        })
      }
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: err.message || 'Payment transaction failed',
      })
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <View style={styles.titleRow}>
                <Ionicons name="git-branch-outline" size={20} color={Colors.systemBlue} />
                <Text style={styles.title}>Split Bill • {tableName}</Text>
              </View>
              <Text style={styles.subtitle}>
                Order {orderNumber} • Base Total: ${initialTotal.toFixed(2)}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={24} color={Colors.secondaryLabel} />
            </TouchableOpacity>
          </View>

          {/* Mode Switcher Tabs */}
          <View style={styles.modeTabs}>
            <TouchableOpacity
              style={[styles.modeTab, mode === 'EVEN' && styles.modeTabActive]}
              onPress={() => {
                triggerHaptic.selection()
                setMode('EVEN')
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name="pie-chart-outline"
                size={16}
                color={mode === 'EVEN' ? '#FFFFFF' : Colors.secondaryLabel}
              />
              <Text style={[styles.modeTabText, mode === 'EVEN' && styles.modeTabTextActive]}>
                Even Split (N-Way)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modeTab, mode === 'ITEM' && styles.modeTabActive]}
              onPress={() => {
                triggerHaptic.selection()
                setMode('ITEM')
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name="restaurant-outline"
                size={16}
                color={mode === 'ITEM' ? '#FFFFFF' : Colors.secondaryLabel}
              />
              <Text style={[styles.modeTabText, mode === 'ITEM' && styles.modeTabTextActive]}>
                By Seat / Item
              </Text>
            </TouchableOpacity>
          </View>

          {/* Main Scroll Content */}
          <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 24 }}>
            {mode === 'EVEN' ? (
              /* ══════════════════ EVEN SPLIT SECTION ══════════════════ */
              <View style={{ gap: 16 }}>
                {/* Guest Count Selector */}
                <View style={styles.card}>
                  <Text style={styles.cardLabel}>NUMBER OF SPLIT SHARES</Text>
                  <View style={styles.stepperRow}>
                    <TouchableOpacity
                      style={[styles.stepBtn, guestCount <= 2 && { opacity: 0.4 }]}
                      onPress={() => {
                        if (guestCount > 2) {
                          triggerHaptic.light()
                          setGuestCount((c) => c - 1)
                        }
                      }}
                      disabled={guestCount <= 2}
                    >
                      <Ionicons name="remove" size={20} color={Colors.label} />
                    </TouchableOpacity>

                    <View style={styles.guestCountDisplay}>
                      <Text style={styles.guestCountNum}>{guestCount}</Text>
                      <Text style={styles.guestCountText}>Guests</Text>
                    </View>

                    <TouchableOpacity
                      style={[styles.stepBtn, guestCount >= 12 && { opacity: 0.4 }]}
                      onPress={() => {
                        if (guestCount < 12) {
                          triggerHaptic.light()
                          setGuestCount((c) => c + 1)
                        }
                      }}
                      disabled={guestCount >= 12}
                    >
                      <Ionicons name="add" size={20} color={Colors.label} />
                    </TouchableOpacity>
                  </View>

                  {/* Preset Pills */}
                  <View style={styles.presetRow}>
                    {[2, 3, 4, 5, 6].map((num) => (
                      <TouchableOpacity
                        key={num}
                        style={[styles.presetPill, guestCount === num && styles.presetPillActive]}
                        onPress={() => {
                          triggerHaptic.selection()
                          setGuestCount(num)
                        }}
                      >
                        <Text
                          style={[
                            styles.presetText,
                            guestCount === num && styles.presetTextActive,
                          ]}
                        >
                          {num} Ways
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Tip Selector */}
                <View style={styles.card}>
                  <Text style={styles.cardLabel}>TABLE TIP SELECTOR</Text>
                  <View style={styles.tipRow}>
                    {([0, 0.15, 0.18, 0.2] as TipOption[]).map((rate) => {
                      const isActive = evenTipRate === rate
                      const label = rate === 0 ? 'No Tip' : `${(rate as number) * 100}%`
                      return (
                        <TouchableOpacity
                          key={String(rate)}
                          style={[styles.tipBtn, isActive && styles.tipBtnActive]}
                          onPress={() => {
                            triggerHaptic.selection()
                            setEvenTipRate(rate)
                          }}
                        >
                          <Text style={[styles.tipText, isActive && styles.tipTextActive]}>
                            {label}
                          </Text>
                        </TouchableOpacity>
                      )
                    })}
                    <TouchableOpacity
                      style={[styles.tipBtn, evenTipRate === 'CUSTOM' && styles.tipBtnActive]}
                      onPress={() => {
                        triggerHaptic.selection()
                        setEvenTipRate('CUSTOM')
                      }}
                    >
                      <Text style={[styles.tipText, evenTipRate === 'CUSTOM' && styles.tipTextActive]}>
                        Custom
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {evenTipRate === 'CUSTOM' && (
                    <View style={styles.customTipRow}>
                      <Text style={styles.customTipPrefix}>$</Text>
                      <TextInput
                        style={styles.customTipInput}
                        placeholder="0.00"
                        placeholderTextColor={Colors.secondaryLabel}
                        keyboardType="decimal-pad"
                        value={evenCustomTip}
                        onChangeText={setEvenCustomTip}
                      />
                    </View>
                  )}
                </View>

                {/* Grand Bill & Per Person Summary */}
                <View style={styles.summaryBox}>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summarySub}>Total with Tip</Text>
                    <Text style={styles.summaryVal}>${billGrandTotal.toFixed(2)}</Text>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryItem}>
                    <Text style={styles.summarySub}>Each Person Pays</Text>
                    <Text style={[styles.summaryVal, { color: Colors.systemGreen }]}>
                      ${(billGrandTotal / guestCount).toFixed(2)}
                    </Text>
                  </View>
                </View>

                {/* Progress Bar */}
                <View style={styles.progressContainer}>
                  <View style={styles.progressHeader}>
                    <Text style={styles.progressLabel}>COLLECTION PROGRESS</Text>
                    <Text style={styles.progressValue}>
                      ${evenTotalCollected.toFixed(2)} / ${billGrandTotal.toFixed(2)} (
                      {evenPaidShares.length}/{evenShares.length} Paid)
                    </Text>
                  </View>
                  <View style={styles.progressBarBg}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${Math.min(
                            100,
                            billGrandTotal > 0 ? (evenTotalCollected / billGrandTotal) * 100 : 0
                          )}%`,
                          backgroundColor: isEvenAllPaid ? Colors.systemGreen : Colors.systemBlue,
                        },
                      ]}
                    />
                  </View>
                </View>

                {/* Individual Shares List */}
                <View style={{ gap: 8 }}>
                  <Text style={styles.sharesHeader}>SPLIT SHARES ({evenShares.length})</Text>
                  {evenShares.map((share) => (
                    <View
                      key={share.guestNumber}
                      style={[
                        styles.shareCard,
                        share.isPaid && { borderColor: Colors.systemGreen, backgroundColor: 'rgba(52, 199, 89, 0.08)' },
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={styles.shareGuestTitle}>Guest {share.guestNumber}</Text>
                          {share.isPaid ? (
                            <View style={styles.paidBadge}>
                              <Ionicons name="checkmark-circle" size={14} color={Colors.systemGreen} />
                              <Text style={styles.paidBadgeText}>
                                PAID ({share.paidMethod} • {share.paidAt})
                              </Text>
                            </View>
                          ) : (
                            <View style={styles.unpaidBadge}>
                              <Text style={styles.unpaidBadgeText}>PENDING</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.shareBreakdown}>
                          Subtotal ${share.subtotal.toFixed(2)} + Tax ${share.tax.toFixed(2)} + Tip ${share.tip.toFixed(2)}
                        </Text>
                      </View>

                      <View style={{ alignItems: 'flex-end', gap: 6 }}>
                        <Text style={[styles.shareAmount, share.isPaid && { color: Colors.systemGreen }]}>
                          ${share.total.toFixed(2)}
                        </Text>

                        {share.isPaid ? (
                          <TouchableOpacity
                            style={styles.undoBtn}
                            onPress={() => handleResetEvenShare(share.guestNumber)}
                          >
                            <Text style={styles.undoText}>Undo</Text>
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            style={styles.collectShareBtn}
                            onPress={() => {
                              triggerHaptic.selection()
                              setActiveTenderShare(share.guestNumber)
                            }}
                          >
                            <Ionicons name="card-outline" size={14} color="#FFFFFF" />
                            <Text style={styles.collectShareText}>Collect</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              /* ══════════════════ ITEM / SEAT SPLIT SECTION ══════════════════ */
              <View style={{ gap: 16 }}>
                {/* Seats Toolbar */}
                <View style={styles.card}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.cardLabel}>SEATS / GUESTS ({seats.length})</Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity
                        style={[styles.smallToolBtn, seats.length <= 2 && { opacity: 0.4 }]}
                        onPress={handleRemoveSeat}
                        disabled={seats.length <= 2}
                      >
                        <Ionicons name="remove" size={16} color={Colors.label} />
                        <Text style={styles.smallToolText}>Remove Seat</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.smallToolBtn, seats.length >= 10 && { opacity: 0.4 }]}
                        onPress={handleAddSeat}
                        disabled={seats.length >= 10}
                      >
                        <Ionicons name="add" size={16} color={Colors.systemBlue} />
                        <Text style={[styles.smallToolText, { color: Colors.systemBlue }]}>Add Seat</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* Items Allocation Table */}
                <View style={styles.card}>
                  <Text style={styles.cardLabel}>ASSIGN ITEMS TO SEATS</Text>
                  {items.length === 0 ? (
                    <Text style={styles.noItemsText}>
                      No itemized dishes found on this active check. Use Even Split.
                    </Text>
                  ) : (
                    items.map((item) => {
                      const assignedSeat = itemAllocations[item.id] ?? 1
                      return (
                        <View key={item.id} style={styles.itemRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.itemName}>
                              {item.quantity}x {item.name}
                            </Text>
                            <Text style={styles.itemPrice}>
                              ${((item.totalPrice ?? ((item.unitPrice ?? item.price ?? 0) * item.quantity))).toFixed(2)}
                            </Text>


                          </View>

                          {/* Allocation Picker Scroll */}
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                            <TouchableOpacity
                              style={[
                                styles.seatChip,
                                assignedSeat === 0 && styles.seatChipActive,
                              ]}
                              onPress={() => {
                                triggerHaptic.selection()
                                setItemAllocations((prev) => ({ ...prev, [item.id]: 0 }))
                              }}
                            >
                              <Text style={[styles.seatChipText, assignedSeat === 0 && styles.seatChipTextActive]}>
                                Shared ➗
                              </Text>
                            </TouchableOpacity>

                            {seats.map((s) => (
                              <TouchableOpacity
                                key={s.id}
                                style={[
                                  styles.seatChip,
                                  assignedSeat === s.id && styles.seatChipActive,
                                ]}
                                onPress={() => {
                                  triggerHaptic.selection()
                                  setItemAllocations((prev) => ({ ...prev, [item.id]: s.id }))
                                }}
                              >
                                <Text
                                  style={[
                                    styles.seatChipText,
                                    assignedSeat === s.id && styles.seatChipTextActive,
                                  ]}
                                >
                                  {s.name}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                      )
                    })
                  )}
                </View>

                {/* Seat Calculations Cards */}
                <View style={{ gap: 10 }}>
                  <Text style={styles.sharesHeader}>SEAT TOTALS & TENDER</Text>
                  {seatCalculations.map((seat) => (
                    <View
                      key={seat.id}
                      style={[
                        styles.seatCard,
                        seat.isPaid && { borderColor: Colors.systemGreen, backgroundColor: 'rgba(52, 199, 89, 0.08)' },
                      ]}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={styles.shareGuestTitle}>{seat.name}</Text>
                          {seat.isPaid ? (
                            <View style={styles.paidBadge}>
                              <Ionicons name="checkmark-circle" size={14} color={Colors.systemGreen} />
                              <Text style={styles.paidBadgeText}>PAID ({seat.paidMethod})</Text>
                            </View>
                          ) : (
                            <View style={styles.unpaidBadge}>
                              <Text style={styles.unpaidBadgeText}>{seat.itemsCount} items</Text>
                            </View>
                          )}
                        </View>
                        <Text style={[styles.shareAmount, seat.isPaid && { color: Colors.systemGreen }]}>
                          ${seat.total.toFixed(2)}
                        </Text>
                      </View>

                      <Text style={styles.shareBreakdown}>
                        Subtotal ${seat.subtotal.toFixed(2)} + Tax ${seat.tax.toFixed(2)} + Tip ${seat.tip.toFixed(2)}
                      </Text>

                      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                        {seat.isPaid ? (
                          <TouchableOpacity
                            style={styles.undoBtn}
                            onPress={() => handleResetSeatPaid(seat.id)}
                          >
                            <Text style={styles.undoText}>Undo</Text>
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            style={styles.collectShareBtn}
                            onPress={() => {
                              triggerHaptic.selection()
                              setActiveTenderSeat(seat.id)
                            }}
                          >
                            <Ionicons name="card-outline" size={14} color="#FFFFFF" />
                            <Text style={styles.collectShareText}>Settle Seat</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>

          {/* Bottom Complete Checkout Bar */}
          <View style={styles.footer}>
            <View style={styles.footerInfo}>
              <Text style={styles.footerLabel}>
                {mode === 'EVEN'
                  ? `${evenPaidShares.length}/${evenShares.length} Shares Settled`
                  : `${itemPaidSeats.length}/${seatCalculations.length} Seats Settled`}
              </Text>
              <Text style={styles.footerAmount}>
                $
                {(mode === 'EVEN' ? evenTotalCollected : itemTotalCollected).toFixed(2)} of $
                {(mode === 'EVEN'
                  ? billGrandTotal
                  : seatCalculations.reduce((sum, s) => sum + s.total, 0)
                ).toFixed(2)}
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.completeBtn,
                !(mode === 'EVEN' ? isEvenAllPaid : isItemAllPaid) && styles.completeBtnDisabled,
              ]}
              onPress={handleFinalizeSplitOrder}
              disabled={
                !(mode === 'EVEN' ? isEvenAllPaid : isItemAllPaid) ||
                collectPaymentMutation.isPending
              }
              activeOpacity={0.8}
            >
              {collectPaymentMutation.isPending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-done-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.completeBtnText}>Finalize Bill Settlement</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Sub-modal: Quick Tender Share Sheet ── */}
        {(activeTenderShare !== null || activeTenderSeat !== null) && (
          <Modal transparent animationType="fade">
            <View style={styles.subModalOverlay}>
              <View style={styles.subModalCard}>
                <Text style={styles.subModalTitle}>
                  Collect Payment for{' '}
                  {activeTenderShare !== null
                    ? `Guest ${activeTenderShare}`
                    : seatCalculations.find((s) => s.id === activeTenderSeat)?.name || 'Seat'}
                </Text>
                <Text style={styles.subModalAmount}>
                  $
                  {activeTenderShare !== null
                    ? (
                        evenShares.find((s) => s.guestNumber === activeTenderShare)?.total || 0
                      ).toFixed(2)
                    : (
                        seatCalculations.find((s) => s.id === activeTenderSeat)?.total || 0
                      ).toFixed(2)}
                </Text>

                <View style={styles.tenderBtnRow}>
                  <TouchableOpacity
                    style={[styles.tenderBtn, { backgroundColor: '#10B981' }]}
                    onPress={() => {
                      if (activeTenderShare !== null) {
                        handleMarkEvenSharePaid(activeTenderShare, 'CASH')
                      } else if (activeTenderSeat !== null) {
                        handleMarkSeatPaid(activeTenderSeat, 'CASH')
                      }
                    }}
                  >
                    <Ionicons name="cash-outline" size={22} color="#FFFFFF" />
                    <Text style={styles.tenderBtnText}>Cash Tender</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.tenderBtn, { backgroundColor: Colors.systemBlue }]}
                    onPress={() => {
                      if (activeTenderShare !== null) {
                        handleMarkEvenSharePaid(activeTenderShare, 'CARD')
                      } else if (activeTenderSeat !== null) {
                        handleMarkSeatPaid(activeTenderSeat, 'CARD')
                      }
                    }}
                  >
                    <Ionicons name="card-outline" size={22} color="#FFFFFF" />
                    <Text style={styles.tenderBtnText}>Credit Card</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.subModalClose}
                  onPress={() => {
                    setActiveTenderShare(null)
                    setActiveTenderSeat(null)
                  }}
                >
                  <Text style={styles.subModalCloseText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#12141C',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    borderTopWidth: 1,
    borderColor: '#262A38',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderColor: '#1E2230',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.label,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.secondaryLabel,
    marginTop: 3,
  },
  closeBtn: {
    padding: 4,
  },
  modeTabs: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    backgroundColor: '#181C28',
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#202434',
    gap: 6,
  },
  modeTabActive: {
    backgroundColor: Colors.systemBlue,
  },
  modeTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.secondaryLabel,
  },
  modeTabTextActive: {
    color: '#FFFFFF',
  },
  body: {
    padding: 16,
  },
  card: {
    backgroundColor: '#181B26',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#262A38',
    padding: 14,
    gap: 12,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.secondaryLabel,
    letterSpacing: 0.5,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#262A3A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestCountDisplay: {
    alignItems: 'center',
    minWidth: 80,
  },
  guestCountNum: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.label,
  },
  guestCountText: {
    fontSize: 12,
    color: Colors.secondaryLabel,
  },
  presetRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  presetPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#222736',
    borderWidth: 1,
    borderColor: '#2F354A',
  },
  presetPillActive: {
    backgroundColor: `${Colors.systemBlue}25`,
    borderColor: Colors.systemBlue,
  },
  presetText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.secondaryLabel,
  },
  presetTextActive: {
    color: Colors.systemBlue,
    fontWeight: '700',
  },
  tipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tipBtn: {
    flex: 1,
    backgroundColor: '#222736',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2F354A',
  },
  tipBtnActive: {
    backgroundColor: `${Colors.systemBlue}25`,
    borderColor: Colors.systemBlue,
  },
  tipText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.secondaryLabel,
  },
  tipTextActive: {
    color: Colors.systemBlue,
  },
  customTipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#222736',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#2F354A',
  },
  customTipPrefix: {
    fontSize: 16,
    color: Colors.secondaryLabel,
    marginRight: 4,
  },
  customTipInput: {
    flex: 1,
    height: 38,
    color: Colors.label,
    fontSize: 15,
  },
  summaryBox: {
    flexDirection: 'row',
    backgroundColor: '#1E2333',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2D354E',
    padding: 16,
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summarySub: {
    fontSize: 12,
    color: Colors.secondaryLabel,
    marginBottom: 4,
  },
  summaryVal: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.label,
  },
  summaryDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#2D354E',
  },
  progressContainer: {
    backgroundColor: '#181B26',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#262A38',
    gap: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.secondaryLabel,
    letterSpacing: 0.5,
  },
  progressValue: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.label,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#242838',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  sharesHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.secondaryLabel,
    letterSpacing: 0.5,
    marginTop: 4,
  },
  shareCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#181B26',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#262A38',
    padding: 12,
    gap: 12,
  },
  shareGuestTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.label,
  },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(52, 199, 89, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  paidBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.systemGreen,
  },
  unpaidBadge: {
    backgroundColor: '#262A38',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  unpaidBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.secondaryLabel,
  },
  shareBreakdown: {
    fontSize: 11,
    color: Colors.secondaryLabel,
    marginTop: 3,
  },
  shareAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.label,
  },
  collectShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.systemGreen,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  collectShareText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  undoBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  undoText: {
    fontSize: 11,
    color: Colors.systemOrange,
    fontWeight: '600',
  },
  // Seat Split Styles
  smallToolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#242838',
  },
  smallToolText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.label,
  },
  noItemsText: {
    fontSize: 13,
    color: Colors.secondaryLabel,
    fontStyle: 'italic',
  },
  itemRow: {
    borderBottomWidth: 1,
    borderColor: '#222636',
    paddingVertical: 10,
    gap: 8,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.label,
  },
  itemPrice: {
    fontSize: 12,
    color: Colors.secondaryLabel,
    marginTop: 2,
  },
  seatChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#262A38',
    borderWidth: 1,
    borderColor: '#32374A',
  },
  seatChipActive: {
    backgroundColor: `${Colors.systemBlue}30`,
    borderColor: Colors.systemBlue,
  },
  seatChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.secondaryLabel,
  },
  seatChipTextActive: {
    color: Colors.systemBlue,
    fontWeight: '700',
  },
  seatCard: {
    backgroundColor: '#181B26',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#262A38',
    padding: 12,
    gap: 6,
  },
  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#161924',
    borderTopWidth: 1,
    borderColor: '#262A38',
    gap: 12,
  },
  footerInfo: {
    flex: 1,
  },
  footerLabel: {
    fontSize: 11,
    color: Colors.secondaryLabel,
    fontWeight: '600',
  },
  footerAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.label,
    marginTop: 2,
  },
  completeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.systemGreen,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },
  completeBtnDisabled: {
    opacity: 0.35,
  },
  completeBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Sub-modal Tender
  subModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  subModalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#1A1E2C',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#2D344A',
    alignItems: 'center',
    gap: 14,
  },
  subModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.label,
    textAlign: 'center',
  },
  subModalAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.systemGreen,
  },
  tenderBtnRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 8,
  },
  tenderBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  tenderBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  subModalClose: {
    paddingVertical: 8,
    marginTop: 4,
  },
  subModalCloseText: {
    fontSize: 14,
    color: Colors.secondaryLabel,
    fontWeight: '600',
  },
})
