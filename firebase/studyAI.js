const express = require('express');
const router = express.Router();
const axios = require('axios');

/* =========================
   MEMORY STORE
   ========================= */
const sessionMemory = {};

/* =========================
   GEMINI ENDPOINT
   ========================= */
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

/* =========================
   SUMMARY
   ========================= */
router.post("/summarize", async (req, res) => {
  const { title, userId } = req.body;

  if (!userId) return res.status(400).json({ error: "Missing userId" });

  if (!sessionMemory[userId]) {
    sessionMemory[userId] = [];
  }

  const history = sessionMemory[userId].join("\n");

  try {
    const response = await axios.post(GEMINI_URL, {
      contents: [{
        parts: [{
          text: `
You are a STUDY AI assistant.

IMPORTANT RULES:
- Focus ONLY on the provided file
- Use memory only for context

=== MEMORY ===
${history}

=== FILE ===
${title}

TASK:
Summarize in bullet points.
`
        }]
      }]
    });

    const summary =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

    // save memory
    sessionMemory[userId].push(`FILE: ${title}`);

    res.json({ summary });

  } catch (err) {
    res.status(500).json({ error: "Summary failed" });
  }
});

/* =========================
   QUIZ
   ========================= */
router.post("/quiz", async (req, res) => {
  const { title, userId } = req.body;

  if (!userId) return res.status(400).json({ error: "Missing userId" });

  if (!sessionMemory[userId]) {
    sessionMemory[userId] = [];
  }

  const history = sessionMemory[userId].join("\n");

  try {
    const response = await axios.post(GEMINI_URL, {
      contents: [{
        parts: [{
          text: `
You are an AI QUIZ generator.

RULES:
- Base questions ONLY on the file
- No outside knowledge

=== MEMORY ===
${history}

=== FILE ===
${title}

TASK:
Create 5 multiple choice questions.
`
        }]
      }]
    });

    const quiz =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

    sessionMemory[userId].push(`QUIZ GENERATED`);

    res.json({ quiz });

  } catch (err) {
    res.status(500).json({ error: "Quiz failed" });
  }
});

/* =========================
   OPTIONAL: CLEAR MEMORY
   ========================= */
router.post("/clear-memory", (req, res) => {
  const { userId } = req.body;

  if (sessionMemory[userId]) {
    delete sessionMemory[userId];
  }

  res.json({ success: true });
});

module.exports = router;