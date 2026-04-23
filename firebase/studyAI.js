const express = require('express');
const router = express.Router();
const axios = require('axios');

// SUMMARY
router.post("/summarize", async (req, res) => {
  const { title } = req.body;

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [{
            text: `Summarize this study material in bullet points:\n\n${title}`
          }]
        }]
      }
    );

    const summary =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

    res.json({ summary });

  } catch (err) {
    res.status(500).json({ error: "Summary failed" });
  }
});

// QUIZ
router.post("/quiz", async (req, res) => {
  const { title } = req.body;

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [{
            text: `Create a 5-question multiple choice quiz:\n\n${title}`
          }]
        }]
      }
    );

    const quiz =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

    res.json({ quiz });

  } catch (err) {
    res.status(500).json({ error: "Quiz failed" });
  }
});
module.exports = router;