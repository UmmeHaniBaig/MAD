import bodyParser from "body-parser";
import cors from "cors";
import express from "express";
import OpenAI from "openai";

const app = express();
app.use(cors());
app.use(bodyParser.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const isRelevantToPoetry = (text) => {
  const t = text.toLowerCase().trim();
  const patterns = [
  /andaz[- ]?e[- ]?bayan/i,
  /shayari/i,
  /poetry/i,
  /urdu poetry/i,
  /calligraphy/i,
  /poetry apps?/i,
  /poetry websites?/i,
  /ghazal/i,
  /nazm/i,
  /rekhta/i,
  /urdupoint/i,
  /poemhub/i,
  /shayarihub/i,
  /urdupoint shayari/i,
  /poetries/i,
  /top poetries/i,
  /urdu literature/i,
  /urdu poetry books?/i,
  /urdu poetry collection/i,
  /urdu poems?/i,
  /urdu ghazals?/i,
  /nazms?/i,
  /urdu articles?/i,
  /urdu authors?/i,
  /urdu poets?/i,
  /urdu writers?/i,
  /urdu apps?/i,
  /online urdu poetry/i,
  /popular urdu poetry/i,
  /ar poetry/i,
];
  return patterns.some((pattern) => pattern.test(t));
};

app.post("/chat", async (req, res) => {
  try {
    let userMessage = req.body.message;
    if (!userMessage) return res.json({ answer: "No message provided." });
    const MIN_WORDS_FOR_ANSWER = 2; // e.g., require at least 2 words for auto-answer
const vagueShortWords = ["andaz", "sher", "nazm","ar poetry","bayan","vr"];

if (vagueShortWords.includes(userMessage.toLowerCase()) && userMessage.split(" ").length < MIN_WORDS_FOR_ANSWER) {
  return res.json({
    answer: `I see you mentioned '${userMessage}'. Could you please provide more details about what you want to know?`
  });
}

    // Optional: reject clearly irrelevant messages early
    if (!isRelevantToPoetry(userMessage)) {
      return res.json({ answer: "I'm sorry, I can only answer questions about Andaz e Bayan Aur website, Urdu poetry, apps, and websites." });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
You are a highly knowledgeable and helpful Urdu poetry assistant.

You answer questions about:
1. **Andaz-e-Bayan (https://vrandaz.online)**  
   - Include information about features, poetry collections, poets, nazms, ghazals, shers, blogs, user submissions, and other content on the site.  
   - Always mention the website link: Andaz-e-Bayan (https://vrandaz.online) when relevant.

2. **Other Urdu poetry websites, apps, and blogs**, including but not limited to:  
   - Rekhta (https://rekhta.org)  
   - UrduPoint (https://urdupoint.com)  
   - PoemHub (https://play.google.com/store/apps/details?id=com.poemhub)  
   - ShayariHub (https://play.google.com/store/apps/details?id=com.shayarihub)  
   - Other popular Urdu poetry websites, apps, and online blogs  

Instructions:
1. Always provide the main short explanation in **English**, so users can understand.  
2. Whenever including poetry (ghazals, nazms, couplets, shers), **write them only in Urdu script**. Never use Hindi/Devanagari.  
3. Include in every answer when relevant:  
   - App/website names  
   - Short descriptions of features or content  
   - Links if available  
   - Examples of Urdu poetry (in Urdu script)  
   - ar poetry
   - short explaination
4. For queries directly about **Andaz-e-Bayan**, give enough context about your website, its features, content types, and links.  
5. If the question is unrelated to Urdu poetry, apps, or websites, politely reply:  
   "I'm sorry, I can only answer questions about Urdu poetry, apps, and websites."
`

        },
        { role: "user", content: userMessage }
      ],
      temperature: 0.7
    });

    const answer = response.choices?.[0]?.message?.content;
    if (!answer) throw new Error("No answer returned from OpenAI");

    res.json({ answer });

  } catch (err) {
    console.error("Error in /chat:", err);
    res.json({ answer: "Sorry, something went wrong!" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
