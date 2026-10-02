import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '../../theme/colors'
import { AiChatMessage, UserProfile } from '../../types/models'
import { Api } from '../../api/client'
import { triggerHaptic } from '../../components/Haptics'

interface RestoIqScreenProps {
  user: UserProfile
  onOpenHub?: () => void
}

const QUICK_PROMPTS = [
  "Today's sales & occupancy",
  'Which ingredients are low on stock?',
  'What is our current labor cost %?',
  'Recommend prep for dinner rush',
]

export function RestoIqScreen({ user, onOpenHub }: RestoIqScreenProps) {
  const [messages, setMessages] = useState<AiChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Hello ${user.name.split(' ')[0]}! I'm Resto IQ, your AI Restaurant Operations Assistant. Ask me anything about today's live floor occupancy, orders, inventory stock levels, labor costs, or sales forecasts.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ])
  const [inputText, setInputText] = useState('')
  const [isTyping, setIsTyping] = useState(false)

  const handleSend = async (textToSend?: string) => {
    const prompt = (textToSend || inputText).trim()
    if (!prompt || isTyping) return

    triggerHaptic.selection()
    setInputText('')

    const userMsg: AiChatMessage = {
      id: String(Date.now()),
      role: 'user',
      content: prompt,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages((prev) => [...prev, userMsg])
    setIsTyping(true)

    try {
      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }))
      const reply = await Api.askAiCopilot(prompt, history)
      triggerHaptic.medium()

      const assistantMsg: AiChatMessage = {
        id: String(Date.now() + 1),
        role: 'assistant',
        content: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }

      setMessages((prev) => [...prev, assistantMsg])
    } catch {
      triggerHaptic.error()
      const errorMsg: AiChatMessage = {
        id: String(Date.now() + 1),
        role: 'assistant',
        content: 'Unable to reach Resto IQ server. Please check your network connection.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setIsTyping(false)
    }
  }

  const renderBubble = ({ item }: { item: AiChatMessage }) => {
    const isUser = item.role === 'user'

    return (
      <View style={[styles.bubbleWrapper, isUser ? styles.userWrapper : styles.assistantWrapper]}>
        {!isUser && (
          <View style={styles.botAvatar}>
            <Ionicons name="sparkles" size={14} color="#ffffff" />
          </View>
        )}
        <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
          <Text style={[styles.bubbleText, isUser ? styles.userText : styles.assistantText]}>
            {item.content}
          </Text>
          <Text style={[styles.timestamp, isUser ? styles.userTimestamp : styles.assistantTimestamp]}>
            {item.timestamp}
          </Text>
        </View>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIcon}>
            <Ionicons name="sparkles" size={18} color="#ffffff" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Resto IQ Copilot</Text>
            <Text style={styles.headerSubtitle}>AI Operations Intelligence</Text>
          </View>
        </View>
        {onOpenHub && (
          <TouchableOpacity style={styles.hubBtn} onPress={onOpenHub}>
            <Ionicons name="grid-outline" size={18} color={Colors.label} />
            <Text style={styles.hubBtnText}>Modules</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Messages */}
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderBubble}
        contentContainerStyle={styles.messagesContainer}
      />

      {/* Quick Prompts Ribbon */}
      <View style={styles.quickPromptsRibbon}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={QUICK_PROMPTS}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.promptChip}
              onPress={() => handleSend(item)}
              disabled={isTyping}
            >
              <Text style={styles.promptChipText}>{item}</Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.promptContainer}
        />
      </View>

      {/* Typing Indicator */}
      {isTyping && (
        <View style={styles.typingIndicator}>
          <ActivityIndicator size="small" color={Colors.systemBlue} />
          <Text style={styles.typingText}>Resto IQ is analyzing store data...</Text>
        </View>
      )}

      {/* Input Bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.textInput}
          placeholder="Ask Resto IQ about sales, inventory, labor..."
          placeholderTextColor={Colors.tertiaryLabel}
          value={inputText}
          onChangeText={setInputText}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
          onPress={() => handleSend()}
          disabled={!inputText.trim() || isTyping}
        >
          <Ionicons name="arrow-up" size={18} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
    backgroundColor: Colors.secondarySystemGroupedBackground,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.systemBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.label,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.secondaryLabel,
  },
  hubBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.fillColor,
  },
  hubBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.label,
  },
  messagesContainer: {
    padding: 14,
    gap: 12,
  },
  bubbleWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginVertical: 3,
  },
  userWrapper: {
    justifyContent: 'flex-end',
  },
  assistantWrapper: {
    justifyContent: 'flex-start',
  },
  botAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.systemBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: Colors.systemBlue,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: Colors.secondarySystemGroupedBackground,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
  },
  userText: {
    color: '#ffffff',
  },
  assistantText: {
    color: Colors.label,
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  userTimestamp: {
    color: 'rgba(255,255,255,0.7)',
  },
  assistantTimestamp: {
    color: Colors.tertiaryLabel,
  },
  quickPromptsRibbon: {
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
    backgroundColor: Colors.secondarySystemGroupedBackground,
  },
  promptContainer: {
    paddingHorizontal: 14,
    gap: 8,
  },
  promptChip: {
    backgroundColor: Colors.fillColor,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  promptChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.label,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  typingText: {
    fontSize: 12,
    color: Colors.secondaryLabel,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: Colors.secondarySystemGroupedBackground,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
  },
  textInput: {
    flex: 1,
    backgroundColor: Colors.systemGroupedBackground,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
    color: Colors.label,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.systemBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
})
