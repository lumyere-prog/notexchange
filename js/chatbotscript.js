const API = 'http://localhost:3000';

if (!user) {
    alert("Not logged in!");
    window.location.href = "login.html";
}

const userID = user.email;

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
        } else {
            div.className = "bot-msg";
        }

        div.textContent = text;
        chatBody.appendChild(div);

        chatBody.scrollTop = chatBody.scrollHeight;
    }

    async function sendMessage() {
    const prompt = input.value;
    if (!prompt) return;

    addMessage("You: " + prompt, "user");

    input.value = "";

    // ⏳ CREATE LOADING MESSAGE
    const loadingId = "loading-" + Date.now();

    const loadingDiv = document.createElement("div");
    loadingDiv.id = loadingId;
    loadingDiv.className = "bot-msg";
    loadingDiv.textContent = "Thinking...";
    chatBody.appendChild(loadingDiv);

    chatBody.scrollTop = chatBody.scrollHeight;

    try {
        const res = await fetch(`${API}/chatbot`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt, userID })
        });

        const data = await res.json();

        // remove loading
        document.getElementById(loadingId)?.remove();

        if (data.reply) {
            addMessage(
                "Lumiere: " + cleanText(data.reply),
                "bot"
            );
        } else {
            addMessage("Error: " + data.error, "bot");
        }

    } catch (err) {
        document.getElementById(loadingId)?.remove();
        addMessage("Server error 😭", "bot");
    }
}
        function cleanText(text) {
            return text
                .replace(/\*/g, "")     // remove *
                .replace(/_/g, "")      // optional cleanup
                .trim();
        }
        function saveChat() {
        const history = JSON.parse(localStorage.getItem(`chat_${userID}`)) || [];

        history.push({
            role: "user",
            text: prompt
        });

        localStorage.setItem(`chat_${userID}`, JSON.stringify(history));
    }
    
});