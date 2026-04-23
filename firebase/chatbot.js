const express = require('express');
const router = express.Router();
const axios = require('axios');

// ⚠️ DO NOT expose this in production
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

router.post('/', async (req, res) => {
  console.log("👉 /chatbot HIT");
  console.log("BODY:", req.body);

  try {
    const { prompt } = req.body || {};

    if (!prompt) {
      console.log("❌ Missing prompt");
      return res.status(400).json({ error: "No prompt provided" });
    }

    console.log("🤖 Sending request to Gemini...");

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [
              {
                text: `Answer in max 2-3 sentences ONLY. No listing unless user requests.\n\n${prompt}`
              }
            ]
          }
        ]
      }
    );

    console.log("✅ Gemini responded");

    const reply =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "No response from AI";

    return res.json({ reply });

  } catch (err) {
    console.error("🔥 CHATBOT ERROR:");

    if (err.response?.data) {
      console.error(JSON.stringify(err.response.data, null, 2));
    } else {
      console.error(err.message);
    }

    const apiError = err.response?.data;
    let message = "Chatbot failed";

    if (apiError?.error?.message) {
      const msg = apiError.error.message.toLowerCase();

      if (msg.includes("quota")) {
        message = "🚫 Gemini quota limit reached.";
      } else if (msg.includes("api key")) {
        message = "🔑 Invalid or restricted API key.";
      } else if (msg.includes("model")) {
        message = "🤖 Invalid Gemini model or access denied.";
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