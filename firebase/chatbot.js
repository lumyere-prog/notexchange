const express = require('express');
const router = express.Router();
const axios = require('axios');

const GEMINI_API_KEY = 'AIzaSyAb3GQa8OTIaXKgimkwokeX99hNpYQls78';

router.post('/', async (req, res) => {
  const { prompt } = req.body;

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [
  {
    text: `Answer in max 2-3 sentences ONLY.no listing unless the user told so.\n\n${prompt}`
  }
]
          }
        ]
      }
    );

    const reply = response.data.candidates[0].content.parts[0].text;

    res.json({ reply });

  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: 'Chatbot failed' });
  }
});

module.exports = router;