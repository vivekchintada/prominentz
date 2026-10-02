import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '../../theme/colors'
import { triggerHaptic } from '../../components/Haptics'
import { ServerHostModal } from '../../components/ServerHostModal'
import { Api } from '../../api/client'
import { UserProfile, UserRole } from '../../types/models'

interface LoginScreenProps {
  onLoginSuccess: (user: UserProfile) => void
}

export function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [showHostModal, setShowHostModal] = useState(false)

  const handleSignIn = async () => {
    triggerHaptic.medium()
    setIsLoading(true)
    setErrorMessage(null)

    const loginEmail = email.trim()
    const loginPassword = password.trim()

    if (!loginEmail || !loginPassword) {
      setIsLoading(false)
      setErrorMessage('Please enter your email and password or PIN')
      return
    }

    const res = await Api.login(loginEmail, loginPassword)
    setIsLoading(false)

    if (res.user) {
      triggerHaptic.success()
      onLoginSuccess(res.user)
    } else {
      triggerHaptic.error()
      setErrorMessage(res.error || 'Invalid credentials or server unreachable')
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Top Bar with Server Host Settings */}
        <View style={styles.topHostRow}>
          <TouchableOpacity
            style={styles.hostConfigBtn}
            onPress={() => {
              triggerHaptic.light()
              setShowHostModal(true)
            }}
          >
            <Ionicons name="server-outline" size={14} color={Colors.systemBlue} />
            <Text style={styles.hostConfigText}>Host: {Api.getBaseURL().replace(/^https?:\/\//, '')}</Text>
          </TouchableOpacity>
        </View>

        {/* Logo & Header */}
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Ionicons name="restaurant" size={38} color={Colors.systemBlue} />
          </View>
          <Text style={styles.appName}>Prominentz</Text>
          <Text style={styles.tagline}>Native Restaurant Operating System</Text>
        </View>

        {/* Input Card */}
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>EMAIL</Text>
          <TextInput
            style={styles.input}
            placeholder="manager@bistrolumiere.com"
            placeholderTextColor={Colors.secondaryLabel}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={[styles.fieldLabel, { marginTop: 14 }]}>PASSWORD</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••••••"
            placeholderTextColor={Colors.secondaryLabel}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => handleSignIn()}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Sign In with SaaS Account</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.versionText}>Prominentz Mobile v1.0.0 • Connected to SaaS API</Text>
      </ScrollView>

      <ServerHostModal
        visible={showHostModal}
        onClose={() => setShowHostModal(false)}
        onSaved={() => {}}
      />
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.systemGroupedBackground,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  topHostRow: {
    alignItems: 'center',
    marginBottom: 16,
  },
  hostConfigBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondarySystemGroupedBackground,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    gap: 6,
  },
  hostConfigText: {
    fontSize: 11,
    color: Colors.systemBlue,
    fontWeight: '700',
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(0, 122, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.25)',
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.label,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 14,
    color: Colors.secondaryLabel,
    marginTop: 4,
  },
  card: {
    backgroundColor: Colors.secondarySystemGroupedBackground,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.secondaryLabel,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: Colors.tertiarySystemBackground,
    color: Colors.label,
    fontSize: 16,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.separator,
  },
  errorText: {
    color: Colors.systemRed,
    fontSize: 13,
    marginTop: 8,
  },
  primaryButton: {
    backgroundColor: Colors.systemBlue,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 18,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  versionText: {
    fontSize: 11,
    color: Colors.secondaryLabel,
    textAlign: 'center',
    marginTop: 40,
  },
})
