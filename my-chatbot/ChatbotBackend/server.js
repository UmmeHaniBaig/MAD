import { knowledgeBase } from '../faqList.js'; // make sure path is correct


import translatePkg from '@vitalets/google-translate-api';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import fetch from 'node-fetch';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// Fix for translate import
const translate = translatePkg.default || translatePkg;

// Your inline knowledge base (FAQ)


const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

app.post('/chat', async (req, res) => {
  try {
    const { message, lang } = req.body;
    const userLang = lang || 'auto';

    // Convert user message to lowercase for matching
    const msgLower = message.toLowerCase();

    // Check FAQ first
    const kbReply = knowledgeBase.find(k => msgLower.includes(k.topic.toLowerCase()));
    if (kbReply) {
      return res.json({ reply: kbReply.reply });
    }

    // Fallback to OpenAI if no FAQ match
    if (OPENAI_API_KEY) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: "I'm a helpful assistant for Andaz-e-Bayan Aur website."},
            { role: 'user', content: message },
          ],
          temperature: 0.7,
          max_tokens: 400,
        }),
      });

      const data = await response.json();
      const aiReply = data.choices?.[0]?.message?.content?.trim() || "Sorry, no reply.";
      return res.json({ reply: aiReply });
    }

    // Fallback if OpenAI key missing
    return res.json({ reply: `Local bot fallback: "${message}"` });

  } catch (err) {
    console.error(err);
    res.json({ reply: "Server error. Please try again later." });
  }
});

app.listen(3000, () => console.log('Server running on port 3000'));
