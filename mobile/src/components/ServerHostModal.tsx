import React, { useState } from 'react'
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '../theme/colors'
import { triggerHaptic } from './Haptics'
import { Api, DEFAULT_BACKEND_URL } from '../api/client'

interface ServerHostModalProps {
  visible: boolean
  onClose: () => void
  onSaved: (newUrl: string) => void
}

export function ServerHostModal({ visible, onClose, onSaved }: ServerHostModalProps) {
  const [url, setUrl] = useState(Api.getBaseURL())
  const [testing, setTesting] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState<boolean | null>(null)

  const handleTestConnection = async () => {
    triggerHaptic.light()
    setTesting(true)
    setStatusMessage(null)
    setIsSuccess(null)

    const clean = url.trim().replace(/\/+$/, '')
    try {
      const controller = new AbortController()
      const id = setTimeout(() => controller.abort(), 4000)
      const res = await fetch(`${clean}/api/health`, { signal: controller.signal })
      clearTimeout(id)

      if (res.ok) {
        setIsSuccess(true)
        setStatusMessage('✅ Connection successful! Backend is online.')
        triggerHaptic.success()
      } else {
        setIsSuccess(false)
        setStatusMessage(`⚠️ Server returned status: ${res.status}`)
        triggerHaptic.warning()
      }
    } catch (err: any) {
      setIsSuccess(false)
      setStatusMessage('❌ Could not connect. Ensure Next.js dev server is running.')
      triggerHaptic.error()
    } finally {
      setTesting(false)
    }
  }

  const handleSave = async () => {
    triggerHaptic.medium()
    const clean = url.trim().replace(/\/+$/, '')
    await Api.setBaseURL(clean)
    onSaved(clean)
    onClose()
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Backend Host Config</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeBtn}>Close</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={styles.desc}>
            Configure the URL of the Prominentz SaaS server on your local Wi-Fi:
          </Text>

          <Text style={styles.label}>SERVER ADDRESS</Text>
          <TextInput
            style={styles.input}
            value={url}
            onChangeText={setUrl}
            placeholder={DEFAULT_BACKEND_URL}
            placeholderTextColor={Colors.secondaryLabel}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <View style={styles.quickButtonsRow}>
            <TouchableOpacity
              style={styles.quickChip}
              onPress={() => setUrl('http://192.168.0.187:3000')}
            >
              <Text style={styles.quickChipText}>Wi-Fi PC (192.168.0.187)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickChip}
              onPress={() => setUrl('http://localhost:3000')}
            >
              <Text style={styles.quickChipText}>Localhost</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickChip}
              onPress={() => setUrl('http://10.0.2.2:3000')}
            >
              <Text style={styles.quickChipText}>Emulator</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickChip}
              onPress={() => setUrl('https://resto-platform.vercel.app')}
            >
              <Text style={styles.quickChipText}>Cloud</Text>
            </TouchableOpacity>
          </View>

          {statusMessage && (
            <Text
              style={[
                styles.statusText,
                { color: isSuccess ? Colors.systemGreen : Colors.systemRed },
              ]}
            >
              {statusMessage}
            </Text>
          )}

          <TouchableOpacity
            style={styles.testBtn}
            onPress={handleTestConnection}
            disabled={testing}
          >
            {testing ? (
              <ActivityIndicator color={Colors.label} />
            ) : (
              <Text style={styles.testBtnText}>Test Connection</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>Save & Reconnect</Text>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.label,
  },
  closeBtn: {
    fontSize: 16,
    color: Colors.systemBlue,
    fontWeight: '600',
  },
  content: {
    padding: 20,
    gap: 14,
  },
  desc: {
    fontSize: 13,
    color: Colors.secondaryLabel,
    lineHeight: 18,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.secondaryLabel,
    letterSpacing: 0.5,
    marginTop: 6,
  },
  input: {
    backgroundColor: Colors.secondarySystemGroupedBackground,
    color: Colors.label,
    fontSize: 16,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  quickButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickChip: {
    backgroundColor: Colors.secondarySystemGroupedBackground,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  quickChipText: {
    fontSize: 12,
    color: Colors.systemBlue,
    fontWeight: '600',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  testBtn: {
    backgroundColor: Colors.secondarySystemGroupedBackground,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginTop: 6,
  },
  testBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.label,
  },
  saveBtn: {
    backgroundColor: Colors.systemBlue,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
})
