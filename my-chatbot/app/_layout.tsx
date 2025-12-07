import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { knowledgeBase } from "../faqList.js";

const CHAT_SESSIONS_KEY = "chat_sessions_v1";

type Message = {
  id: string;
  from: "user" | "bot";
  text: string;
  time: string;
  status: "sent";
};

type ChatSession = {
  sessionId: string;
  title: string;
  messages: Message[];
};

export default function App() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [newChatName, setNewChatName] = useState("");
  const flatListRef = useRef<FlatList<Message>>(null);

  const now = () => new Date().toLocaleTimeString();

  // Load chat sessions
  useEffect(() => {
    const loadSessions = async () => {
      try {
        const saved = await AsyncStorage.getItem(CHAT_SESSIONS_KEY);
        if (saved) {
          const loaded: ChatSession[] = JSON.parse(saved);
          setSessions(loaded);
          setCurrentSession(loaded[0] || null);
        } else {
          const sessionId = Date.now().toString();
          const welcome: Message[] = [
            { id: "1", from: "bot", text: "Assalam-o-Alaikum! I'm here to help you.", time: now(), status: "sent" },
          ];
          const newSession: ChatSession = { sessionId, title: "Welcome", messages: welcome };
          setSessions([newSession]);
          setCurrentSession(newSession);
          await AsyncStorage.setItem(CHAT_SESSIONS_KEY, JSON.stringify([newSession]));
        }
      } catch (e) {
        console.log("Session load error:", e);
      }
    };
    loadSessions();
  }, []);

  // Send message
  const handleSend = async () => {
    const text = input.trim();
    if (!text || !currentSession) return;

    setInput("");
    setIsTyping(true);

    // 1️⃣ Add user message immediately
    const userMsg: Message = { id: Date.now().toString(), from: "user", text, time: now(), status: "sent" };
    const updatedSession: ChatSession = { ...currentSession, messages: [...currentSession.messages, userMsg] };
    const updatedSessions = sessions.map((s) =>
      s.sessionId === currentSession.sessionId ? updatedSession : s
    );

    setCurrentSession(updatedSession);
    setSessions(updatedSessions);
    AsyncStorage.setItem(CHAT_SESSIONS_KEY, JSON.stringify(updatedSessions));

    try {
      // 2️⃣ Fetch bot reply
      const reply = await getBotReply(text);

      // Add bot message immediately
      const botMsg: Message = { id: Date.now().toString(), from: "bot", text: reply, time: now(), status: "sent" };
      const newSession: ChatSession = { ...updatedSession, messages: [...updatedSession.messages, botMsg] };
      const newSessions = updatedSessions.map((s) =>
        s.sessionId === currentSession.sessionId ? newSession : s
      );

      setCurrentSession(newSession);
      setSessions(newSessions);
      AsyncStorage.setItem(CHAT_SESSIONS_KEY, JSON.stringify(newSessions));
    } finally {
      setIsTyping(false);
    }
  };

  // Local bot fallback
  const localBotReply = (text: string) => {
    const t = text.toLowerCase();
    for (const faq of knowledgeBase) {
      for (const key of faq.topic) {
        if (t.includes(key.toLowerCase())) return faq.reply;
      }
    }
    if (t.includes("salam") || t.includes("assalam")) return "Wa Alaikum Assalam! How can I help you today?";
    if (t.length < 20) return "Nice! Tell me more so I can help better.";
    return "Thanks! I'm trying my best to help.";
  };

  const getBotReply = async (userText: string) => {
    try {
      const res = await fetch("http://192.168.100.44:3000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText }),
      });
      if (!res.ok) throw new Error("Backend error");
      const data = await res.json();
      return data.reply || localBotReply(userText);
    } catch {
      return localBotReply(userText);
    }
  };

  // Auto-scroll
  useEffect(() => {
    if (flatListRef.current && currentSession?.messages.length) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [currentSession?.messages, isTyping]);

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.from === "user";
    return (
      <View style={[styles.msgRow, isUser ? styles.msgRowRight : styles.msgRowLeft]}>
        <View style={[styles.msgBubble, isUser ? styles.userBubble : styles.botBubble]}>
          <Text style={[styles.msgText, isUser && { color: "#fff" }]}>{item.text}</Text>
          <Text style={styles.msgTime}>{item.time}</Text>
        </View>
      </View>
    );
  };

  // Create new chat
  const createNewChat = async () => {
    const title = newChatName.trim() || "Untitled Chat";
    const sessionId = Date.now().toString();
    const newSession: ChatSession = { sessionId, title, messages: [] };

    const updatedSessions = [newSession, ...sessions];
    setSessions(updatedSessions);
    setCurrentSession(newSession);
    await AsyncStorage.setItem(CHAT_SESSIONS_KEY, JSON.stringify(updatedSessions));

    setModalVisible(false);
    setNewChatName("");
  };

  // Delete chat
  const deleteChat = async (sessionId: string) => {
    const filtered = sessions.filter((s) => s.sessionId !== sessionId);
    setSessions(filtered);

    if (currentSession?.sessionId === sessionId) {
      setCurrentSession(filtered[0] || null);
    }

    await AsyncStorage.setItem(CHAT_SESSIONS_KEY, JSON.stringify(filtered));
  };

  return (
    <View style={styles.container}>
      {/* Left panel */}
      <View style={styles.leftPanel}>
        <Text style={styles.panelTitle}>Chats</Text>
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.sessionId}
          renderItem={({ item }) => (
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 5 }}>
              <TouchableOpacity
                style={[styles.sessionItem, item.sessionId === currentSession?.sessionId && styles.sessionActive, { flex: 1 }]}
                onPress={() => setCurrentSession(item)}
              >
                <Text style={[styles.sessionTitle, item.sessionId === currentSession?.sessionId && { color: "#fff" }]}>
                  {item.title || "Session"}
                </Text>
              </TouchableOpacity>

              {/* Delete button */}
              <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteChat(item.sessionId)}>
                <Text style={{ color: "#fff", fontWeight: "bold" }}>🗑</Text>
              </TouchableOpacity>
            </View>
          )}
        />
        <TouchableOpacity style={styles.newSessionBtn} onPress={() => setModalVisible(true)}>
          <Text style={{ color: "#fff" }}>+ New Chat</Text>
        </TouchableOpacity>
      </View>

      {/* Right panel */}
      <View style={styles.rightPanel}>
        <Text style={styles.chatHeader}>GPT PRO</Text>
        <FlatList
          ref={flatListRef}
          data={currentSession?.messages || []}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          extraData={currentSession}
          contentContainerStyle={styles.chatArea}
          style={{ flex: 1 }}
        />
        {isTyping && (
          <View style={styles.typingRow}>
            <Text style={styles.typingText}>typing...</Text>
          </View>
        )}
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={80}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              value={input}
              onChangeText={setInput}
              onSubmitEditing={handleSend}
            />
            <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
              <Text style={styles.sendText}>Send</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>

      {/* Modal for chat name */}
      <Modal transparent visible={modalVisible} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={{ fontSize: 16, marginBottom: 10 }}>Enter chat name:</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Chat name"
              value={newChatName}
              onChangeText={setNewChatName}
            />
            <View style={{ flexDirection: "row", marginTop: 10 }}>
              <TouchableOpacity style={styles.modalBtn} onPress={createNewChat}>
                <Text style={{ color: "#fff" }}>Create</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: "#777", marginLeft: 10 }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={{ color: "#fff" }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: "row", backgroundColor: "#f7f7fb" },
  leftPanel: { width: 140, backgroundColor: "#eee", padding: 10 },
  rightPanel: { flex: 1, backgroundColor: "#f7f7fb" },
  panelTitle: { fontWeight: "bold", fontSize: 16, marginBottom: 10 },
  sessionItem: { padding: 10, borderRadius: 6, backgroundColor: "#ddd" },
  sessionActive: { backgroundColor: "#ac2e34" },
  sessionTitle: { color: "#000" },
  newSessionBtn: { padding: 10, backgroundColor: "#ac2e34", borderRadius: 6, marginTop: 10, alignItems: "center" },
  deleteBtn: { backgroundColor: "#ac2e34", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginLeft: 5, justifyContent: "center", alignItems: "center" },

  chatHeader: { fontSize: 29, fontWeight: "bold", color: "#050505ff", padding: 12, borderBottomWidth: 1, borderColor: "#eee", textAlign: "center", },
  chatArea: { paddingHorizontal: 12, paddingBottom: 8 },
  msgRow: { marginVertical: 6, flexDirection: "row" },
  msgRowLeft: { justifyContent: "flex-start" },
  msgRowRight: { justifyContent: "flex-end" },
  msgBubble: { maxWidth: "80%", padding: 10, borderRadius: 12 },
  userBubble: { backgroundColor: "#ac2e34", borderTopRightRadius: 4 },
  botBubble: { backgroundColor: "#e6e6ea", borderTopLeftRadius: 4 },
  msgText: { color: "#333", fontSize: 15 },
  msgTime: { fontSize: 10, color: "#060404ff", marginTop: 6, textAlign: "right" },
  inputRow: { flexDirection: "row", padding: 10, borderTopWidth: 1, borderColor: "#eee", backgroundColor: "#fff" },
  input: { flex: 1, height: 44, borderWidth: 1, borderColor: "#ddd", borderRadius: 8, paddingHorizontal: 10, backgroundColor: "#fff" },
  sendBtn: { marginLeft: 8, justifyContent: "center", paddingHorizontal: 14, backgroundColor: "#ac2e34", borderRadius: 8 },
  sendText: { color: "#fff", fontWeight: "600" },
  typingRow: { paddingVertical: 6, paddingHorizontal: 12 },
  typingText: { color: "#666", fontStyle: "italic" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center" },
  modalContainer: { width: "80%", backgroundColor: "#fff", padding: 20, borderRadius: 10 },
  modalInput: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 10, marginBottom: 10 },
  modalBtn: { flex: 1, backgroundColor: "#ac2e34", padding: 10, borderRadius: 6, alignItems: "center" },
});
