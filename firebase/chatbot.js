const express = require('express');
const router = express.Router();
const axios = require('axios');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

/* =========================
   RATE LIMIT PROTECTION
   ========================= */
let lastRequestTime = 0;
const MIN_DELAY_MS = 1200;

/* =========================
   SESSION MEMORY (IN-MEMORY)
   ========================= */
const sessions = {}; 
// format:
// sessions[userID] = [{role: "user/ai", text: "..."}]

/* =========================
   CHATBOT ROUTE
   ========================= */
router.post('/', async (req, res) => {
  console.log("👉 /chatbot HIT");
  console.log("BODY:", req.body);

  try {
    const { prompt, userID } = req.body || {};

    if (!prompt) {
      return res.status(400).json({ error: "No prompt provided" });
    }

    const uid = userID || "guest";

    /* =========================
       INIT SESSION
       ========================= */
    if (!sessions[uid]) {
      sessions[uid] = [];
    }

    /* =========================
       RATE LIMIT DELAY
       ========================= */
    const now = Date.now();
    const waitTime = MIN_DELAY_MS - (now - lastRequestTime);

    if (waitTime > 0) {
      await new Promise(r => setTimeout(r, waitTime));
    }

    lastRequestTime = Date.now();

    /* =========================
       BUILD CONTEXT (LAST 10 MESSAGES ONLY)
       ========================= */
    const history = sessions[uid]
      .slice(-10)
      .map(m => `${m.role === "user" ? "User" : "AI"}: ${m.text}`)
      .join("\n");

    console.log("🤖 Sending request to Gemini...");

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemma-3-1b-it:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [
              {
                text: `
You are Lumiere, a friendly AI assistant inside a student platform called NoteXchange.

BEHAVIOR:
- Be natural and conversational
- Keep answers short (2–4 sentences unless needed)
- Remember conversation context
- Do not be robotic
- Talk like a real friend in chat (like Discord or Messenger) also match the vibe of the user
- DO NOT greet the user every message
- DO NOT repeat explanations of what the conversation is about, unless the user asks you to
- Keep responses natural, and context-aware
- Sometimes use casual phrasing like a human ("yeah", "hmm", "got it")
- Avoid emojis unless user uses them first

CONVERSATION RULES:
- Continue the conversation naturally (do NOT restart context each reply)
- Do NOT reintroduce yourself, unless the user asked you
- If giving multiple items, use line breaks or numbering with spacing (1. 2. 3. with new lines)(use bullet unless the user asked for numbers)
- Do NOT summarize the topic unless asked
- Answer directly, like you're already mid-convo



=== CHAT HISTORY ===
${history}

=== USER MESSAGE ===
${prompt}
`
              }
            ]
          }
        ]
      }
    );

    const reply =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "No response from AI";

    console.log("✅ AI responded");

    /* =========================
       SAVE TO SESSION
       ========================= */
    sessions[uid].push({ role: "user", text: prompt });
    sessions[uid].push({ role: "ai", text: reply });

    /* =========================
       LIMIT MEMORY SIZE
       ========================= */
    if (sessions[uid].length > 20) {
      sessions[uid] = sessions[uid].slice(-20);
    }

    return res.json({ reply });

  } catch (err) {
    console.error("🔥 CHATBOT ERROR (FULL)");

    if (err.response) {
      console.error("Status:", err.response.status);
      console.error("Data:", JSON.stringify(err.response.data, null, 2));
    } else {
      console.error(err.message);
    }

    const apiError = err.response?.data;
    let message = "Chatbot failed";

    if (err.response?.status === 429) {
      message = "⏳ Too many requests. Please wait a few seconds.";
    } else if (apiError?.error?.message) {
      const msg = apiError.error.message.toLowerCase();

      if (msg.includes("quota")) {
        message = "🚫 API quota reached. Try again later.";
      } else if (msg.includes("api key")) {
        message = "🔑 API key issue.";
      } else if (msg.includes("model")) {
        message = "🤖 Model not available.";
      } else {
        message = apiError.error.message;
      }
    }

    return res.status(500).json({
      error: message,
      raw: apiError || err.message
    });
  }
});

module.exports = router;