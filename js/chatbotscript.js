import { spendPoints } from "/js/points.js";
import { db } from "/firebase/firebase-client.js";

const API = "https://api-qh3yfseiaq-uc.a.run.app";
const user = JSON.parse(localStorage.getItem("user")) || {};
const userID = user.email || "guest";

let chatSession = [];
let quizSession = null;

// wait for DOM
document.addEventListener("DOMContentLoaded", () => {

    const sendBtn = document.getElementById("send-btn");
    const input = document.getElementById("chat-input");
    const chatBody = document.getElementById("chat-body");

    const greetings = [
        "yo! what’s up?",
        "hello there!!! ready to study?",
        "hey hey? need help with something?",
        "sup? ask me anything",
        "yo genius? what are we solving today?",
        "wsp clanker! what’s the mission?",
        "yooooo! drop your question",
        "hello! let’s cook some answers",
        "hey clanky!! I’m ready when you are",
        "what’s good? how can I help?"
    ];

    if (!sendBtn || !input || !chatBody) {
        console.error("Chatbot elements missing in HTML");
        return;
    }

    sendBtn.addEventListener("click", sendMessage);
    // Enter key support
    input.addEventListener("keypress", (e) => {
        if (e.key === "Enter") sendMessage();
    });

    function showRandomGreeting() {
        const msg = greetings[Math.floor(Math.random() * greetings.length)];

        const div = document.createElement("div");
        div.className = "bot-msg";
        div.textContent = msg;

        chatBody.appendChild(div);
    }

    showRandomGreeting();

    function addMessage(text, sender) {
        const div = document.createElement("div");

        if (sender === "user") {
            div.style.textAlign = "right";
            div.textContent = "You: " + text;
        } else {
            div.className = "bot-msg";
            div.textContent = text;
        }

        chatBody.appendChild(div);
        chatBody.scrollTop = chatBody.scrollHeight;
    }

async function sendMessage() {
    const prompt = input.value.trim();
    if (!prompt) return;

    addMessage(prompt, "user");
    input.value = "";

    // =========================
    // 🧠 SESSION MEMORY
    // =========================
    chatSession.push({
        role: "user",
        text: prompt
    });

    // =========================
    // 💰 POINTS DEDUCTION
    // =========================
    const cost = 10;

    // ✅ FIX: single source of truth
    const storedUser = JSON.parse(localStorage.getItem("user"));
    const id = storedUser?.uid;

    console.log("👤 USER ID:", id);
    console.log("💰 REQUIRED COST:", cost);

    if (!id) {
        addMessage("User not ready yet 😭", "bot");
        return;
    }

    const ok = await spendPoints(db, id, cost);

    if (!ok) {
        addMessage("Not enough points to use AI 😭", "bot");
        return;
    }

    // loading message
    const loadingDiv = document.createElement("div");
    loadingDiv.className = "bot-msg";
    loadingDiv.textContent = "Thinking...";
    chatBody.appendChild(loadingDiv);

    chatBody.scrollTop = chatBody.scrollHeight;

    try {
        const res = await fetch(`${API}/chatbot`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                prompt,
                userID: id // 🔥 FIXED (was undefined before)
            })
        });

        const data = await res.json();

        loadingDiv.remove();

                if (prompt.toLowerCase().includes("quiz")) {
            quizSession = {
                step: "ask_count",
                total: 0,
                current: 0,
                score: 0
            };
        }

        if (data.reply) {
            const reply = "Lumiere: " + cleanText(data.reply);
            addMessage(reply, "bot");

            // 🧠 session memory
            chatSession.push({
                role: "bot",
                text: reply
            });

        } else {
            addMessage("Error: " + data.error, "bot");
        }

    } catch (err) {
        loadingDiv.remove();
        addMessage("Server error 😭", "bot");
        console.error(err);
    }
}

function cleanText(text) {
    return text
        .replace(/\*/g, "")
        .replace(/_/g, "")
        .trim();
}

// ❌ FIXED: no more userID bug
function saveChat(prompt, response) {
    const historyKey = `chat_${id}`;

    const history = JSON.parse(localStorage.getItem(historyKey)) || [];

    history.push({
        role: "user",
        text: prompt
    });

    history.push({
        role: "bot",
        text: response
    });
    

    localStorage.setItem(historyKey, JSON.stringify(history));
}
});