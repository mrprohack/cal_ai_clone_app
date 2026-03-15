import React, { useState, useRef } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { useQuery, useAction, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Colors, Spacing, Radius, FontSize, FontWeight } from "../../lib/theme";

const SUGGESTED_QUESTIONS = [
  "Build me a 5-day workout split",
  "How much protein do I need?",
  "Best foods for muscle gain?",
  "How to break a weight loss plateau?",
];

export default function ChatScreen() {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const messages = useQuery(api.chat.getChatHistory, { limit: 50 }) ?? [];
  const sendMessage = useAction(api.chat.sendMessage);
  const clearChat = useMutation(api.chat.clearChat);

  const handleSend = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg) return;

    setInput("");
    setSending(true);
    try {
      await sendMessage({ userMessage: msg });
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.kvContainer}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={90}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>🤖 FitBot</Text>
            <Text style={styles.headerSubtitle}>Your AI fitness coach</Text>
          </View>
          <TouchableOpacity onPress={() => clearChat()} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>Clear</Text>
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          style={styles.messageList}
          contentContainerStyle={styles.messageContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.length === 0 && (
            <View style={styles.welcomeCard}>
              <Text style={styles.welcomeIcon}>💪</Text>
              <Text style={styles.welcomeTitle}>Hey! I'm FitBot</Text>
              <Text style={styles.welcomeText}>
                I'm your personal fitness and nutrition coach. Ask me anything about workouts, diet, and reaching your goals!
              </Text>
              <Text style={styles.suggestTitle}>Try asking:</Text>
              {SUGGESTED_QUESTIONS.map((q) => (
                <TouchableOpacity key={q} style={styles.suggestBtn} onPress={() => handleSend(q)}>
                  <Text style={styles.suggestText}>{q}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {messages.map((msg) => (
            <View
              key={msg._id}
              style={[
                styles.bubble,
                msg.role === "user" ? styles.userBubble : styles.botBubble,
              ]}
            >
              {msg.role === "assistant" && (
                <Text style={styles.botTag}>🤖 FitBot</Text>
              )}
              <Text style={[styles.bubbleText, msg.role === "user" && styles.userBubbleText]}>
                {msg.content}
              </Text>
            </View>
          ))}

          {sending && (
            <View style={[styles.bubble, styles.botBubble, styles.typingBubble]}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.typingText}>FitBot is thinking...</Text>
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask about workouts, nutrition..."
            placeholderTextColor={Colors.textMuted}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={() => handleSend()}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]}
            onPress={() => handleSend()}
            disabled={!input.trim() || sending}
          >
            <Text style={styles.sendBtnText}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  kvContainer: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTitle: { fontSize: FontSize.xl, color: Colors.textPrimary, fontWeight: FontWeight.extrabold },
  headerSubtitle: { fontSize: FontSize.xs, color: Colors.primary },
  clearBtn: { padding: Spacing.sm },
  clearBtnText: { color: Colors.textMuted, fontSize: FontSize.sm },

  messageList: { flex: 1 },
  messageContent: { padding: Spacing.md, paddingBottom: 20 },

  welcomeCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.primary + "30" },
  welcomeIcon: { fontSize: 40, marginBottom: Spacing.sm },
  welcomeTitle: { fontSize: FontSize.xl, color: Colors.textPrimary, fontWeight: FontWeight.bold, marginBottom: Spacing.sm },
  welcomeText: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20, marginBottom: Spacing.lg },
  suggestTitle: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: FontWeight.bold, marginBottom: Spacing.sm, textTransform: "uppercase", letterSpacing: 1 },
  suggestBtn: { backgroundColor: Colors.primaryGlow, borderRadius: Radius.md, padding: Spacing.sm, marginBottom: Spacing.xs, borderWidth: 1, borderColor: Colors.primary + "30" },
  suggestText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: FontWeight.medium },

  bubble: { maxWidth: "85%", borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  userBubble: { alignSelf: "flex-end", backgroundColor: Colors.primary, borderBottomRightRadius: 4 },
  botBubble: { alignSelf: "flex-start", backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderBottomLeftRadius: 4 },
  botTag: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: FontWeight.bold, marginBottom: 4 },
  bubbleText: { fontSize: FontSize.sm, color: Colors.textPrimary, lineHeight: 20 },
  userBubbleText: { color: Colors.background },
  typingBubble: { flexDirection: "row", gap: Spacing.sm, alignItems: "center" },
  typingText: { fontSize: FontSize.sm, color: Colors.textMuted },

  inputBar: { flexDirection: "row", gap: Spacing.sm, padding: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border, alignItems: "flex-end" },
  input: { flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.lg, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, color: Colors.textPrimary, fontSize: FontSize.sm, borderWidth: 1, borderColor: Colors.border, maxHeight: 100 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center" },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { fontSize: FontSize.xl, color: Colors.background, fontWeight: FontWeight.extrabold },
});
