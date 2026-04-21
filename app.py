from flask import Flask, request, jsonify, render_template
import requests, os, random

app = Flask(__name__)

# ===== CONFIG =====
API_KEY = "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"
URL = "https://api.groq.com/openai/v1/chat/completions"
MODEL = "llama-3.1-8b-instant"

# ===== MEMORY =====
chat_history = []

# ===== KEYWORDS =====
DIABETES = {"glucose","sugar","diabetes","insulin","blood","hba1c","diet"}
BLOCKED = {"ipl","cricket","movie","joke","ai","news","football"}
GREET = {"hi","hello","hey"}
THANKS = {"thanks","thank","ok","okay"}

# ===== SYSTEM PROMPT =====
SYSTEM = """You are GlucoAI, a friendly diabetes assistant.

Answer ONLY diabetes-related topics such as blood sugar, insulin, diet, and symptoms.

Rules:
- If query has diabetes + other topics → answer only diabetes part, then say:
  "I specialize in diabetes topics, so I can’t help with unrelated parts 😊"
- If query is fully unrelated → say:
  "I focus on diabetes-related topics, but I’d be happy to help with blood sugar or insulin 😊"
- Do NOT tell jokes, discuss IPL, AI, or other topics
- Do NOT talk about being an AI

Style:
- Short (2–3 lines)
- Clear and helpful
- Friendly and natural
- Use light emojis occasionally

Memory:
- Use previous messages for follow-up questions
"""

# ===== AI CALL =====
def ask_ai(msg):
    try:
        chat_history.append({"role":"user","content":msg})

        payload = {
            "model": MODEL,
            "messages": [{"role":"system","content":SYSTEM}] + chat_history[-5:],
            "temperature": 0.4
        }

        res = requests.post(URL, headers={
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json"
        }, json=payload, timeout=10)

        reply = res.json()["choices"][0]["message"]["content"]
        chat_history.append({"role":"assistant","content":reply})
        return reply

    except:
        return "I'm having a small issue right now. Please try again 😊"

# ===== ROUTES =====
@app.route("/")
def home():
    return render_template("index.html")

@app.route("/chat", methods=["POST"])
def chat():
    msg = request.get_json().get("message","").lower()
    words = set(msg.split())

    # greet
    if words & GREET and not words & BLOCKED:
        return jsonify({"response":"Hey! 👋 I'm your diabetes assistant. Ask me about sugar, insulin or diet."})

    # thanks
    if words & THANKS:
        return jsonify({"response":"You're welcome! 😊"})

    # block unrelated
    if words & BLOCKED and not words & DIABETES:
        return jsonify({"response":"I focus on diabetes-related topics, but I’d be happy to help with blood sugar or insulin 😊"})

    # AI response
    reply = ask_ai(msg)

    # mixed query note
    if words & BLOCKED:
        reply += "\n\nI specialize in diabetes topics, so I can’t help with unrelated parts 😊"

    return jsonify({"response": reply})

# ===== RUN =====
if __name__ == "__main__":
    app.run(debug=True)