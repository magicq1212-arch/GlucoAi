# GlucoAI — Diabetes Management Assistant

A sleek, AI-powered diabetes management web app built with Flask + Groq AI.

## Features
- **Dashboard** — Real-time glucose stats with animated trend chart
- **Tracker** — Log blood sugar readings with date
- **AI Chat** — Diabetes-specific Q&A powered by Groq (Llama 3.1)

## Project Structure
```
glucoai/
├── app.py                  # Flask backend
├── requirements.txt        # Python dependencies
├── templates/
│   └── index.html          # Main HTML template
└── static/
    ├── style.css           # All styles
    └── script.js           # Frontend logic
```

## Run Locally

```bash
# 1. Create virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Run the server
python app.py

# 4. Open browser
# http://localhost:5000
```

## Deploy to Render (Free)

1. Push to GitHub
2. Go to https://render.com → New → Web Service
3. Connect your repo
4. Set:
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `gunicorn app:app`
5. Add env var: `GROQ_API_KEY` = your key
6. Deploy!

> Also works on Railway, Fly.io, or any platform supporting Python.

## Notes
- Update `GROQ_API_KEY` in `app.py` or set as environment variable for production
- Readings are stored in-memory (restart clears them) — connect a database for persistence
