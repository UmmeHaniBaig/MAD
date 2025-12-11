import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Easing,
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

const CHAT_SESSIONS_KEY = "chat_sessions_v1";
const SCREEN_WIDTH = Dimensions.get("window").width;

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

  // Sidebar animation
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarX = useRef(new Animated.Value(-SCREEN_WIDTH * 0.65)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  // ===== Poetry Flip Card (Option A: small & minimal) =====
  const [flipped, setFlipped] = useState(false);
  const flipAnimation = useRef(new Animated.Value(0)).current;

  const poetry = [
    "دل ہی تو ہے نہ سنگ و خشت",
    "چلتے رہو کہ سفر باقی ہے",
    "زندگی ایک لمحہ ٹھہر جا",
    "لفظوں میں چھپی دل کی کہانی",
  ];
  const randomPoetry = poetry[Math.floor(Math.random() * poetry.length)];

  const frontInterpolate = flipAnimation.interpolate({
    inputRange: [0, 180],
    outputRange: ["0deg", "180deg"],
  });

  const backInterpolate = flipAnimation.interpolate({
    inputRange: [0, 180],
    outputRange: ["180deg", "360deg"],
  });

  const flipCard = () => {
    Animated.spring(flipAnimation, {
      toValue: flipped ? 0 : 180,
      friction: 9,
      useNativeDriver: true,
    }).start();
    setFlipped(!flipped);
  };
  // =======================================================

  const now = () => new Date().toLocaleTimeString();

  // Open Sidebar
  const openSidebar = () => {
    setSidebarOpen(true);
    Animated.parallel([
      Animated.timing(sidebarX, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0.5,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  };

  // Close Sidebar
  const closeSidebar = () => {
    Animated.parallel([
      Animated.timing(sidebarX, {
        toValue: -SCREEN_WIDTH * 0.65,
        duration: 300,
        easing: Easing.in(Easing.ease),
        useNativeDriver: false,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start(() => setSidebarOpen(false));
  };

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

  // Local greeting handler
  const handleLocalGreeting = (text: string): string | null => {
    const t = text.toLowerCase().trim();
    if (["hi", "hello", "hey", "hy"].includes(t)) return "Hello! How can I help you today? 😊";
    if (t.includes("salam") || t.includes("assalam")) return "Wa Alaikum Assalam! How can I help you today?";
    if (["bye", "goodbye", "see you"].includes(t)) return "Goodbye! Have a nice day! 👋";
    if (["thanks", "thank you", "thx"].includes(t)) return "You're welcome! 😊";
    if (["ok", "okay", "sure"].includes(t)) return "Okay! 👍";
    return null;
  };

  // Main bot reply function
  const getBotReply = async (userText: string) => {
    const localReply = handleLocalGreeting(userText);
    if (localReply) return localReply;

    try {
      const res = await fetch("https://ruttish-inviolately-giada.ngrok-free.dev/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText }),
      });

      if (!res.ok) throw new Error("Backend error");
      const data = await res.json();
      if (!data.answer) return "Sorry, something went wrong!";
      return data.answer;
    } catch (e) {
      console.log("API error:", e);
      return "Sorry, something went wrong!";
    }
  };

  // Send message
  const handleSend = async () => {
    if (!currentSession) {
      Alert.alert("Create chat first", "Please create a new one.");
      return;
    }

    const text = input.trim();
    if (!text) return;

    setInput("");
    setIsTyping(true);

    const userMsg: Message = { id: Date.now().toString() + Math.random(), from: "user", text, time: now(), status: "sent" };
    const updatedSession: ChatSession = { ...currentSession, messages: [...currentSession.messages, userMsg] };
    const updatedSessions = sessions.map((s) => (s.sessionId === currentSession.sessionId ? updatedSession : s));

    setCurrentSession(updatedSession);
    setSessions(updatedSessions);
    await AsyncStorage.setItem(CHAT_SESSIONS_KEY, JSON.stringify(updatedSessions));

    try {
      const reply = await getBotReply(text);
      const botMsg: Message = { id: Date.now().toString() + Math.random(), from: "bot", text: reply, time: now(), status: "sent" };
      const newSession: ChatSession = { ...updatedSession, messages: [...updatedSession.messages, botMsg] };
      const newSessions = updatedSessions.map((s) => (s.sessionId === currentSession.sessionId ? newSession : s));

      setCurrentSession(newSession);
      setSessions(newSessions);
      await AsyncStorage.setItem(CHAT_SESSIONS_KEY, JSON.stringify(newSessions));
    } finally {
      setIsTyping(false);
    }
  };

  // Auto scroll
  useEffect(() => {
    if (flatListRef.current && currentSession?.messages.length) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [currentSession?.messages, isTyping]);

  // Chat creation
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

  const deleteChat = async (sessionId: string) => {
    const filtered = sessions.filter((s) => s.sessionId !== sessionId);
    setSessions(filtered);
    if (currentSession?.sessionId === sessionId) setCurrentSession(filtered[0] || null);
    await AsyncStorage.setItem(CHAT_SESSIONS_KEY, JSON.stringify(filtered));
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.from === "user";
    return (
      <View style={[styles.msgRow, isUser ? styles.msgRowRight : styles.msgRowLeft]}>
        <View style={[styles.msgBubble, isUser ? styles.userBubble : styles.botBubble]}>
          <Text style={[styles.msgText, isUser && { color: "#fff" }]}>{item.text}</Text>
          <Text style={[styles.msgTime, isUser && { color: "#f0f0f0" }]}>{item.time}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>

      {/* === HEADER === */}
      <View style={styles.header}>
        <TouchableOpacity onPress={openSidebar} style={styles.menuBtn}>
          <Text style={{ fontSize: 26, color: "#fff" }}>☰</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Andaz AI  🖋 </Text>
        
      </View>

      {/* === OVERLAY WHEN SIDEBAR OPEN === */}
      {sidebarOpen && (
        <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
          <TouchableOpacity style={{ flex: 1 }} onPress={closeSidebar} />
        </Animated.View>
      )}

      {/* === SIDEBAR === */}
      <Animated.View style={[styles.sidebar, { left: sidebarX }]}>
        {/* Back Arrow */}
        <TouchableOpacity style={styles.backBtn} onPress={closeSidebar}>
          <Text style={{ fontSize: 32, color: "#111111ff" ,fontWeight:"bold"}}>←</Text>
        </TouchableOpacity>

        <Text style={styles.panelTitle}>Your chats</Text>

        <FlatList
  data={sessions}
  keyExtractor={(item) => item.sessionId}
  renderItem={({ item }) => (
    <View style={styles.sessionRow}>
      {/* Chat box */}
      <TouchableOpacity
        style={[
          styles.sessionItem,
          item.sessionId === currentSession?.sessionId && styles.sessionActive,
        ]}
        onPress={() => {
          setCurrentSession(item);
          closeSidebar();
        }}
      >
        <Text
          style={[
            styles.sessionTitle,
            item.sessionId === currentSession?.sessionId && { color: "#fff" },
          ]}
          numberOfLines={1} // prevent overflow
        >
          {item.title}
        </Text>
      </TouchableOpacity>

      {/* Delete button outside, aligned */}
      <TouchableOpacity onPress={() => deleteChat(item.sessionId)} style={styles.deleteBtn}>
        <Text style={{ color: "red", fontWeight: "bold", fontSize: 18 }}>⛔</Text>
      </TouchableOpacity>
    </View>
  )}
  style={{ maxHeight: '70%' }}
/>


        {/* === Flip Poetry Card (replaces old Poetry button) === */}
        <View style={{ marginTop: 20 }}>
          <TouchableOpacity onPress={flipCard}>
            <View style={styles.cardContainer}>

              {/* Front side */}
              <Animated.View
                style={[
                  styles.card,
                  { transform: [{ rotateY: frontInterpolate }] }
                ]}
              >
                <Text style={styles.frontText}>👆 Tap to Reveal</Text>
              </Animated.View>

              {/* Back side */}
              <Animated.View
                style={[
                  styles.card,
                  styles.cardBack,
                  { transform: [{ rotateY: backInterpolate }] }
                ]}
              >
                <Text style={styles.poetryText}>{randomPoetry}</Text>
              </Animated.View>

            </View>
          </TouchableOpacity>
        </View>

        {/* New Chat button */}
        <TouchableOpacity style={styles.newSessionBtn} onPress={() => setModalVisible(true)}>
          <Text style={{ color: "#fff", fontWeight: "bold" }}>+ New Chat</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* === CHAT AREA === */}
      <View style={styles.chatWrapper}>
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
              placeholderTextColor="#999"
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

      {/* === MODAL === */}
      <Modal transparent visible={modalVisible} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={{ fontSize: 16, marginBottom: 10 }}>Enter chat name:</Text>
            <TextInput style={styles.modalInput} placeholder="Chat name" value={newChatName} onChangeText={setNewChatName} />
            <View style={{ flexDirection: "row", marginTop: 10 }}>
              <TouchableOpacity style={styles.modalBtn} onPress={createNewChat}>
                <Text style={{ color: "#fff" }}>Create</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: "#777", marginLeft: 10 }]} onPress={() => setModalVisible(false)}>
                <Text style={{ color: "#fff" }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

/* ============================================================
    STYLES
==============================================================*/
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7f7fb" },

  /* HEADER */
  header: {
    height: 50,
    backgroundColor: "#a52a2a",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    elevation: 5,
  },
  menuBtn: {
    padding: 10,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 22,
    marginLeft: 10,
    textAlign: "center",
    flex: 1,
  },

  /* SIDEBAR */
  sidebar: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width:
      SCREEN_WIDTH < 400
        ? SCREEN_WIDTH * 0.25 // was 0.35
        : SCREEN_WIDTH < 600
        ? SCREEN_WIDTH * 0.20 // was 0.30
        : SCREEN_WIDTH * 0.18,
    backgroundColor: "#fff",
    padding: 15,
    elevation: 10,
    zIndex: 20,
    borderRightWidth: 1,
    borderColor: "#ddd",
  },

  overlay: {
    position: "absolute",
    top: 60,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#000",
    zIndex: 1,
  },

  backBtn: { marginBottom: 20 },
  panelTitle: { fontWeight: "bold", fontSize: 18, marginBottom: 20 },
sessionRow: {
  flexDirection: "row",
  alignItems: "center",
  marginBottom: 8, // space between items
},
  sessionItem: {
  flex: 1,
  paddingVertical: 8,      // slightly larger for consistent height
  paddingHorizontal: 10,
  backgroundColor: "#eee",
  borderRadius: 8,
  justifyContent: "center",
},

  sessionActive: { backgroundColor: "#a52a2a" },
  sessionTitle: { fontSize: 16, color: "#000" },

  deleteBtn: {
  marginLeft: 8,
  justifyContent: "center",
  alignItems: "center",
  height: "100%",        // match height of sessionItem
},

  

  newSessionBtn: { padding: 10, backgroundColor: "#ac2e34", borderRadius: 6, marginTop: 10, alignItems: "center" },

  /* Flip Card (Poetry) styles */
  cardContainer: {
    alignItems: "center",
    justifyContent: "center",
    height: 120,
    marginBottom: 10,
  },

  card: {
    width: "100%",
    height: 120,
    backgroundColor: "#e6e6ea",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backfaceVisibility: "hidden",
    position: "absolute",
    padding: 10,
  },

  cardBack: {
    backgroundColor: "#a52a2a",
  },

  frontText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#a52a2a",
  },

  poetryText: {
    fontSize: 18,
    color: "#fff",
    textAlign: "center",
    fontWeight: "600",
    lineHeight: 26,
  },

  /* CHAT AREA */
  chatWrapper: { flex: 1 },
  chatArea: { paddingHorizontal: 12, paddingBottom: 8 },

  msgRow: { marginVertical: 6, flexDirection: "row" },
  msgRowLeft: { justifyContent: "flex-start" },
  msgRowRight: { justifyContent: "flex-end" },

  msgBubble: {
    maxWidth: "80%",
    padding: 12,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  userBubble: { backgroundColor: "#a52a2a", borderTopRightRadius: 4 },
  botBubble: { backgroundColor: "#e6e6ea", borderTopLeftRadius: 4 },

  msgText: { fontSize: 16 },
  msgTime: { fontSize: 10, marginTop: 4, textAlign: "right" },

  typingRow: { paddingVertical: 6, paddingHorizontal: 12 },
  typingText: { color: "#333", fontStyle: "italic" },

  inputRow: {
    flexDirection: "row",
    padding: 10,
    borderTopWidth: 1,
    borderColor: "#e5e5e5",
    backgroundColor: "#fff",
  },
  input: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: "#f0f0f0",
  },
  sendBtn: {
    marginLeft: 8,
    backgroundColor: "#a52a2a",
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  sendText: { color: "#fff", fontWeight: "bold" },

  /* MODAL */
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center" },
  modalContainer: { width: "70%", backgroundColor: "#fff", padding: 20, borderRadius: 10 },
  modalInput: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 10, marginBottom: 10 },
  modalBtn: {
    flex: 1,
    backgroundColor: "#a52a2a",
    padding: 10,
    borderRadius: 6,
    alignItems: "center",
  },

  poetryBtn: {
    height: 36,
    justifyContent: "center",
    backgroundColor: "#8b0000", // deep maroon for poetry feel
    borderRadius: 6,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 10,
  },
});
