import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '../theme/colors'
import { triggerHaptic } from './Haptics'
import { useCollectPayment } from '../api/hooks'
import Toast from 'react-native-toast-message'

interface PaymentModalProps {
  visible: boolean
  orderId: string
  orderNumber: string
  tableName: string
  subtotal: number
  tax: number
  total: number
  onClose: () => void
  onSuccess?: (change?: number, receiptUrl?: string) => void
}

type PaymentMethod = 'CASH' | 'CARD'
type TipOption = 0 | 0.15 | 0.18 | 0.2 | 'CUSTOM'

export function PaymentModal({
  visible,
  orderId,
  orderNumber,
  tableName,
  subtotal,
  tax,
  total: initialTotal,
  onClose,
  onSuccess,
}: PaymentModalProps) {
  const [method, setMethod] = useState<PaymentMethod>('CASH')
  const [tipRate, setTipRate] = useState<TipOption>(0.18)
  const [customTip, setCustomTip] = useState('')
  const [cashGiven, setCashGiven] = useState('')
  const [successReceipt, setSuccessReceipt] = useState<{ change?: number; receiptUrl?: string } | null>(null)

  const collectPaymentMutation = useCollectPayment()

  // Base bill calculations
  const calculatedTip =
    tipRate === 'CUSTOM'
      ? parseFloat(customTip) || 0
      : Number((subtotal * tipRate).toFixed(2))

  const grandTotal = Number((initialTotal + calculatedTip).toFixed(2))

  // Cash preset buttons
  const getCashPresets = () => {
    const exact = grandTotal
    const roundNext5 = Math.ceil(grandTotal / 5) * 5
    const roundNext10 = Math.ceil(grandTotal / 10) * 10
    const roundNext20 = Math.ceil(grandTotal / 20) * 20
    const roundNext50 = Math.ceil(grandTotal / 50) * 50

    const list = [exact]
    if (roundNext5 > exact) list.push(roundNext5)
    if (roundNext10 > exact && !list.includes(roundNext10)) list.push(roundNext10)
    if (roundNext20 > exact && !list.includes(roundNext20)) list.push(roundNext20)
    if (roundNext50 > exact && !list.includes(roundNext50)) list.push(roundNext50)
    return list.slice(0, 4)
  }

  // Set default cash given to exact total when opened
  useEffect(() => {
    if (visible) {
      setSuccessReceipt(null)
      setCashGiven(grandTotal.toFixed(2))
    }
  }, [visible, grandTotal])

  const parsedCash = parseFloat(cashGiven) || 0
  const changeDue = Math.max(0, parsedCash - grandTotal)
  const isShort = method === 'CASH' && parsedCash < grandTotal

  const handleProcessPayment = async () => {
    if (method === 'CASH' && isShort) {
      Alert.alert(
        'Insufficient Cash',
        `Cash received ($${parsedCash.toFixed(2)}) is less than total due ($${grandTotal.toFixed(2)}).`
      )
      return
    }

    triggerHaptic.medium()

    try {
      const res = await collectPaymentMutation.mutateAsync({
        orderId,
        method,
        subtotal,
        tax,
        tip: calculatedTip,
        total: grandTotal,
        cashReceived: method === 'CASH' ? parsedCash : undefined,
        cashChange: method === 'CASH' ? changeDue : undefined,
      })

      if (res.success) {
        triggerHaptic.success()
        Toast.show({
          type: 'success',
          text1: 'Payment Settled Successfully',
          text2: method === 'CASH' && changeDue > 0 ? `Change due: $${changeDue.toFixed(2)}` : 'Check paid and closed',
        })

        setSuccessReceipt({ change: res.change ?? changeDue, receiptUrl: res.receiptUrl })
        if (onSuccess) {
          onSuccess(res.change ?? changeDue, res.receiptUrl)
        }
      } else {
        triggerHaptic.error()
        Alert.alert('Payment Failed', res.error || 'Could not process transaction.')
      }
    } catch (err: any) {
      triggerHaptic.error()
      Alert.alert('Payment Error', err.message || 'Network error processing payment.')
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Collect Payment</Text>
              <Text style={styles.headerSub}>
                {tableName} • Order {orderNumber}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={24} color={Colors.label} />
            </TouchableOpacity>
          </View>

          {successReceipt ? (
            /* Payment Success Screen */
            <View style={styles.successContainer}>
              <View style={styles.successIconWrapper}>
                <Ionicons name="checkmark-circle" size={64} color={Colors.systemGreen} />
              </View>
              <Text style={styles.successTitle}>Payment Completed!</Text>
              <Text style={styles.successSub}>
                Table {tableName} is now marked settled & cleared.
              </Text>

              {method === 'CASH' && (successReceipt.change || 0) > 0 && (
                <View style={styles.changeDueCard}>
                  <Text style={styles.changeDueLabel}>CHANGE DUE TO GUEST</Text>
                  <Text style={styles.changeDueAmount}>
                    ${(successReceipt.change || 0).toFixed(2)}
                  </Text>
                </View>
              )}

              <View style={styles.receiptSummary}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total Paid</Text>
                  <Text style={styles.summaryVal}>${grandTotal.toFixed(2)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Payment Method</Text>
                  <Text style={styles.summaryVal}>{method === 'CASH' ? 'Cash' : 'Card'}</Text>
                </View>
                {calculatedTip > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Tip Included</Text>
                    <Text style={styles.summaryVal}>${calculatedTip.toFixed(2)}</Text>
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={styles.doneBtn}
                onPress={onClose}
                activeOpacity={0.8}
              >
                <Text style={styles.doneBtnText}>Done / Back to Tables</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Payment Form Screen */
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
              {/* Grand Total Display */}
              <View style={styles.amountCard}>
                <Text style={styles.amountLabel}>TOTAL DUE</Text>
                <Text style={styles.amountBig}>${grandTotal.toFixed(2)}</Text>
                <Text style={styles.amountBreakdown}>
                  Subtotal: ${subtotal.toFixed(2)} • Tax: ${tax.toFixed(2)}
                  {calculatedTip > 0 ? ` • Tip: $${calculatedTip.toFixed(2)}` : ''}
                </Text>
              </View>

              {/* Tip Selection */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Add Tip</Text>
                <View style={styles.tipRow}>
                  <TouchableOpacity
                    style={[styles.tipChip, tipRate === 0 && styles.tipChipActive]}
                    onPress={() => {
                      triggerHaptic.selection()
                      setTipRate(0)
                    }}
                  >
                    <Text style={[styles.tipText, tipRate === 0 && styles.tipTextActive]}>
                      No Tip
                    </Text>
                  </TouchableOpacity>

                  {[0.15, 0.18, 0.2].map((rate) => {
                    const isActive = tipRate === rate
                    return (
                      <TouchableOpacity
                        key={rate}
                        style={[styles.tipChip, isActive && styles.tipChipActive]}
                        onPress={() => {
                          triggerHaptic.selection()
                          setTipRate(rate as TipOption)
                        }}
                      >
                        <Text style={[styles.tipText, isActive && styles.tipTextActive]}>
                          {rate * 100}%
                        </Text>
                      </TouchableOpacity>
                    )
                  })}

                  <TouchableOpacity
                    style={[styles.tipChip, tipRate === 'CUSTOM' && styles.tipChipActive]}
                    onPress={() => {
                      triggerHaptic.selection()
                      setTipRate('CUSTOM')
                    }}
                  >
                    <Text style={[styles.tipText, tipRate === 'CUSTOM' && styles.tipTextActive]}>
                      Custom
                    </Text>
                  </TouchableOpacity>
                </View>

                {tipRate === 'CUSTOM' && (
                  <View style={styles.customTipRow}>
                    <Text style={styles.currencyPrefix}>$</Text>
                    <TextInput
                      style={styles.customTipInput}
                      placeholder="0.00"
                      placeholderTextColor={Colors.tertiaryLabel}
                      keyboardType="decimal-pad"
                      value={customTip}
                      onChangeText={setCustomTip}
                      autoFocus
                    />
                  </View>
                )}
              </View>

              {/* Payment Method Selector */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Payment Method</Text>
                <View style={styles.methodToggleRow}>
                  <TouchableOpacity
                    style={[styles.methodBtn, method === 'CASH' && styles.methodBtnActive]}
                    onPress={() => {
                      triggerHaptic.selection()
                      setMethod('CASH')
                    }}
                  >
                    <Ionicons
                      name="cash-outline"
                      size={20}
                      color={method === 'CASH' ? '#FFFFFF' : Colors.secondaryLabel}
                    />
                    <Text style={[styles.methodBtnText, method === 'CASH' && styles.methodBtnTextActive]}>
                      Cash Tender
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.methodBtn, method === 'CARD' && styles.methodBtnActive]}
                    onPress={() => {
                      triggerHaptic.selection()
                      setMethod('CARD')
                    }}
                  >
                    <Ionicons
                      name="card-outline"
                      size={20}
                      color={method === 'CARD' ? '#FFFFFF' : Colors.secondaryLabel}
                    />
                    <Text style={[styles.methodBtnText, method === 'CARD' && styles.methodBtnTextActive]}>
                      Card / Terminal
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Cash Tender Details */}
              {method === 'CASH' ? (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Cash Received</Text>
                  <View style={styles.cashPresetsRow}>
                    {getCashPresets().map((val, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={[
                          styles.presetChip,
                          parsedCash === val && styles.presetChipActive,
                        ]}
                        onPress={() => {
                          triggerHaptic.selection()
                          setCashGiven(val.toFixed(2))
                        }}
                      >
                        <Text
                          style={[
                            styles.presetText,
                            parsedCash === val && styles.presetTextActive,
                          ]}
                        >
                          ${val.toFixed(2)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={styles.customCashInputRow}>
                    <Text style={styles.currencyPrefix}>$</Text>
                    <TextInput
                      style={styles.cashInput}
                      keyboardType="decimal-pad"
                      value={cashGiven}
                      onChangeText={setCashGiven}
                      placeholder="0.00"
                      placeholderTextColor={Colors.tertiaryLabel}
                    />
                  </View>

                  {/* Change Due Banner */}
                  <View
                    style={[
                      styles.changeBanner,
                      isShort ? styles.changeBannerShort : styles.changeBannerGood,
                    ]}
                  >
                    <Text style={styles.changeBannerLabel}>
                      {isShort ? 'AMOUNT SHORT' : 'CHANGE DUE'}
                    </Text>
                    <Text
                      style={[
                        styles.changeBannerAmount,
                        { color: isShort ? Colors.systemOrange : Colors.systemGreen },
                      ]}
                    >
                      ${isShort ? (grandTotal - parsedCash).toFixed(2) : changeDue.toFixed(2)}
                    </Text>
                  </View>
                </View>
              ) : (
                /* Card Terminal Simulator */
                <View style={styles.cardSimulator}>
                  <Ionicons name="hardware-chip-outline" size={36} color={Colors.systemBlue} />
                  <Text style={styles.cardSimulatorTitle}>Card Reader Ready</Text>
                  <Text style={styles.cardSimulatorSub}>
                    Tap, insert chip, or swipe card on handheld terminal for ${grandTotal.toFixed(2)}
                  </Text>
                </View>
              )}

              {/* Submit Button */}
              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  isShort && { opacity: 0.5 },
                  collectPaymentMutation.isPending && { opacity: 0.8 },
                ]}
                onPress={handleProcessPayment}
                disabled={collectPaymentMutation.isPending || isShort}
                activeOpacity={0.8}
              >
                {collectPaymentMutation.isPending ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-done" size={20} color="#FFFFFF" />
                    <Text style={styles.submitBtnText}>
                      {method === 'CASH'
                        ? `Accept $${parsedCash.toFixed(2)} Cash`
                        : `Process Card $${grandTotal.toFixed(2)}`}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: Colors.secondarySystemBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.label,
  },
  headerSub: {
    fontSize: 12,
    color: Colors.secondaryLabel,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    padding: 20,
    gap: 16,
  },
  amountCard: {
    backgroundColor: Colors.tertiarySystemBackground,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    gap: 4,
  },
  amountLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.tertiaryLabel,
    letterSpacing: 0.8,
  },
  amountBig: {
    fontSize: 36,
    fontWeight: '900',
    color: Colors.systemBlue,
  },
  amountBreakdown: {
    fontSize: 12,
    color: Colors.secondaryLabel,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.secondaryLabel,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tipChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.tertiarySystemBackground,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  tipChipActive: {
    backgroundColor: 'rgba(10, 132, 255, 0.15)',
    borderColor: Colors.systemBlue,
  },
  tipText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.secondaryLabel,
  },
  tipTextActive: {
    color: Colors.systemBlue,
  },
  customTipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.tertiarySystemBackground,
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  currencyPrefix: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.label,
    marginRight: 6,
  },
  customTipInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.label,
    paddingVertical: 10,
  },
  methodToggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  methodBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.tertiarySystemBackground,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
  },
  methodBtnActive: {
    backgroundColor: Colors.systemBlue,
    borderColor: Colors.systemBlue,
  },
  methodBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.secondaryLabel,
  },
  methodBtnTextActive: {
    color: '#FFFFFF',
  },
  cashPresetsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  presetChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.tertiarySystemBackground,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  presetChipActive: {
    borderColor: Colors.systemBlue,
    backgroundColor: 'rgba(10, 132, 255, 0.15)',
  },
  presetText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.secondaryLabel,
  },
  presetTextActive: {
    color: Colors.systemBlue,
  },
  customCashInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.tertiarySystemBackground,
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  cashInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    color: Colors.label,
    paddingVertical: 10,
  },
  changeBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  changeBannerGood: {
    backgroundColor: 'rgba(52, 199, 89, 0.12)',
    borderColor: 'rgba(52, 199, 89, 0.3)',
  },
  changeBannerShort: {
    backgroundColor: 'rgba(255, 159, 10, 0.12)',
    borderColor: 'rgba(255, 159, 10, 0.3)',
  },
  changeBannerLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.label,
  },
  changeBannerAmount: {
    fontSize: 20,
    fontWeight: '900',
  },
  cardSimulator: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: Colors.tertiarySystemBackground,
    borderRadius: 16,
    gap: 8,
  },
  cardSimulatorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.label,
  },
  cardSimulatorSub: {
    fontSize: 12,
    color: Colors.secondaryLabel,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.systemGreen,
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 6,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  successContainer: {
    padding: 24,
    alignItems: 'center',
    gap: 16,
  },
  successIconWrapper: {
    marginTop: 8,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.label,
  },
  successSub: {
    fontSize: 13,
    color: Colors.secondaryLabel,
    textAlign: 'center',
  },
  changeDueCard: {
    backgroundColor: 'rgba(52, 199, 89, 0.15)',
    borderWidth: 1.5,
    borderColor: Colors.systemGreen,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 28,
    alignItems: 'center',
    gap: 4,
    width: '100%',
  },
  changeDueLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.systemGreen,
    letterSpacing: 0.5,
  },
  changeDueAmount: {
    fontSize: 32,
    fontWeight: '900',
    color: Colors.systemGreen,
  },
  receiptSummary: {
    backgroundColor: Colors.tertiarySystemBackground,
    borderRadius: 12,
    padding: 14,
    width: '100%',
    gap: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontSize: 13,
    color: Colors.secondaryLabel,
  },
  summaryVal: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.label,
  },
  doneBtn: {
    backgroundColor: Colors.systemBlue,
    borderRadius: 14,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
  },
  doneBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
})
