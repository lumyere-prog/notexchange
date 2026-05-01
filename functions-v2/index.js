const { onRequest } = require("firebase-functions/v2/https");
const express = require("express");
const cors = require("cors");

// ✅ import BOTH router + secret
const { router: chatbot, GEMINI_API_KEY } = require("./chatbot");

const app = express();

app.use(cors({ origin: true }));
app.use(express.json());

// ✅ route
app.use("/chatbot", chatbot);

// ✅ EXPORT (V2 + SECRET ATTACHED)
exports.api = onRequest(
  {
    secrets: [GEMINI_API_KEY],
  },
  app
);