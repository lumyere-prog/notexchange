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
You are Lumiere, a friendly AI assistant inside NoteXchange.

BEHAVIOR:
- Be natural and conversational
- Keep answers short (2–4 sentences unless needed)
- Remember conversation context
- Do not be robotic
- Match user vibe
- No unnecessary greetings

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