const express = require("express");
const router = express.Router();
const axios = require("axios");

const { defineSecret } = require("firebase-functions/params");

// ✅ define secret ONLY (no .value here)
const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

/* =========================
   RATE LIMIT PROTECTION
   ========================= */
let lastRequestTime = 0;
const MIN_DELAY_MS = 1200;

/* =========================
   SESSION MEMORY
   ========================= */
const sessions = {};

/* =========================
   CHATBOT ROUTE
   ========================= */
router.post("/", async (req, res) => {
  console.log("👉 /chatbot HIT");
  console.log("BODY:", req.body);

  try {
    const { prompt, userID } = req.body || {};

    if (!prompt) {
      return res.status(400).json({ error: "No prompt provided" });
    }

    const uid = userID || "guest";

    if (!sessions[uid]) {
      sessions[uid] = [];
    }

    /* =========================
       RATE LIMIT
       ========================= */
    const now = Date.now();
    const waitTime = MIN_DELAY_MS - (now - lastRequestTime);

    if (waitTime > 0) {
      await new Promise((r) => setTimeout(r, waitTime));
    }

    lastRequestTime = Date.now();

    /* =========================
       HISTORY
       ========================= */
    const history = sessions[uid]
      .slice(-10)
      .map((m) => `${m.role === "user" ? "User" : "AI"}: ${m.text}`)
      .join("\n");

    console.log("🤖 Sending request to Gemini...");

    // 🔥 IMPORTANT: GET SECRET HERE
    const apiKey = GEMINI_API_KEY.value();

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemma-3-1b-it:generateContent?key=${apiKey}`,
      {
        contents: [
          {
            parts: [
              {
                text: `
You are Lumiere, an AI assistant inside NoteXchange.

NoteXchange is a student platform for sharing notes, accessing learning materials, and using an AI assistant to support studying and understanding lessons.

RULES:
- Be natural, helpful, and clear
- Keep answers 2–4 sentences unless the topic needs more detail
- Always answer the question FIRST before anything else
- Do NOT ask follow-up questions by default
- Do NOT keep the conversation going unnecessarily
- Only ask a question if the user explicitly requests it (e.g. "quiz me", "ask me questions") or if clarification is required
- Do NOT repeat greetings or introduce yourself
- Stay on topic and use context from the conversation
- Explain like a student tutor (simple and understandable)
- If unsure, say you are not certain instead of guessing
- End responses naturally after answering (no forced continuation)

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

    sessions[uid].push({ role: "user", text: prompt });
    sessions[uid].push({ role: "ai", text: reply });

    if (sessions[uid].length > 20) {
      sessions[uid] = sessions[uid].slice(-20);
    }

    return res.json({ reply });

  } catch (err) {
    console.error("🔥 CHATBOT ERROR");
    console.error(err.response?.data || err.message);

    return res.status(500).json({
      error: "Chatbot failed"
    });
  }
});

module.exports = {
  router,
  GEMINI_API_KEY
};