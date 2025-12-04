import React, { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { knowledgeBase } from '../faqList.js';

type Message = {
  id: string;
  from: 'user' | 'bot';
  text: string;
  time: string;
  status: 'sent';
};



export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', from: 'bot', text: "Assalam-o-Alaikum! I'm here to help you. ", time: now(), status: 'sent' },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList<Message>>(null);

  function now() {
    return new Date().toLocaleTimeString();
  }

  function addMessage(from: 'user' | 'bot', text: string) {
    const newMsg: Message = { id: Date.now().toString(), from, text, time: now(), status: 'sent' };
    setMessages(prev => [...prev, newMsg]);
  }

  async function handleSend() {
    const text = input.trim();
    if (!text) return;
    setInput('');
    addMessage('user', text);
    setIsTyping(true);

    try {
      const reply = await getBotReply(text);
      addMessage('bot', reply);
    } catch (err) {
      console.warn('Bot error, using local fallback:', err);
      setTimeout(() => addMessage('bot', localBotReply(text)), 600);
    } finally {
      setIsTyping(false);
    }
  }

  function localBotReply(text: string): string {
    const t = text.toLowerCase();

    // Check FAQ dataset first
    for (const faq of knowledgeBase ) {
      if (t.includes(faq.topic.toLowerCase())) {
        return faq.reply;
      }
    }

    if (t.includes('assalam') || t.includes('salam')) return 'Wa Alaikum Assalam! How can I help you today?';
    if (t.includes('help') || t.includes('how')) return 'Tell me what help you need — coding, definitions, or simple chat.';
    if (t.includes('r and d') || t.includes('r&d') || t.includes('research')) return 'R&D stands for Research and Development — creating new products or improving existing ones.';
    if (t.includes('weather')) return "I can’t fetch live weather in offline mode — you can connect an API for real-time data.";
    if (t.length < 20) return "Nice! Tell me more so I can help better.";
    return "Thanks for sharing. I’m a simple rule-based bot locally — for smarter replies, enable OpenAI integration.";
  }

  async function getBotReply(userText: string): Promise<string> {
    try {
      const res = await fetch('http://localhost:3000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText }),
      });

      if (!res.ok) throw new Error('Backend response not OK');
      const data = await res.json();
      return data.reply || localBotReply(userText);
    } catch (err) {
      console.warn('OpenAI backend error, using local bot:', err);
      return localBotReply(userText);
    }
  }

  // Auto-scroll
  useEffect(() => {
    if (flatListRef.current) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.from === 'user';
    return (
      <View style={[styles.msgRow, isUser ? styles.msgRowRight : styles.msgRowLeft]}>
        <View style={[styles.msgBubble, isUser ? styles.userBubble : styles.botBubble]}>
          <Text style={[styles.msgText, isUser && { color: '#fff' }]}>{item.text}</Text>
          <Text style={styles.msgTime}>{item.time}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ChatGPT</Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.chatArea}
      />

      {isTyping && (
        <View style={styles.typingRow}>
          <Text style={styles.typingText}>typing...</Text>
        </View>
      )}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={90}>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            value={input}
            onChangeText={setInput}
            onSubmitEditing={handleSend}
            returnKeyType="send"
          />
          <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
            <Text style={styles.sendText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7fb' },
  header: { padding: 14, borderBottomWidth: 1, borderColor: '#eee' },
  headerTitle: { fontSize: 28, fontWeight: '700', textAlign: 'center' },
  chatArea: { paddingHorizontal: 12, paddingBottom: 8 },
  msgRow: { marginVertical: 6, flexDirection: 'row' },
  msgRowLeft: { justifyContent: 'flex-start' },
  msgRowRight: { justifyContent: 'flex-end' },
  msgBubble: { maxWidth: '80%', padding: 10, borderRadius: 12 },
  userBubble: { backgroundColor: '#ac2e34ff', borderTopRightRadius: 4 },
  botBubble: { backgroundColor: '#e6e6ea', borderTopLeftRadius: 4 },
  msgText: { color: '#a65252ff', fontSize: 15 },
  msgTime: { fontSize: 10, color: '#f2f0f0ff', marginTop: 6, textAlign: 'right' },
  inputRow: { flexDirection: 'row', padding: 10, borderTopWidth: 1, borderColor: '#eee', backgroundColor: '#fff' },
  input: { flex: 1, height: 44, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 10, backgroundColor: '#fff' },
  sendBtn: { marginLeft: 8, justifyContent: 'center', paddingHorizontal: 14, backgroundColor: '#ac2e34ff', borderRadius: 8 },
  sendText: { color: '#fff', fontWeight: '600' },
  typingRow: { paddingVertical: 6, paddingHorizontal: 12 },
  typingText: { color: '#666', fontStyle: 'italic' },
});
