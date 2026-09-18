# 🌿 CivicAI — Greenville Municipal Chatbot

> AI-powered citizen assistant for Greenville's water services, waste management, recycling programs, and environmental policies — aligned with **SDG 6** (Clean Water & Sanitation) and **SDG 12** (Responsible Consumption & Production).

---

## 🚀 Overview

CivicAI is a full-stack **Retrieval-Augmented Generation (RAG)** chatbot that allows Greenville citizens to instantly ask questions about local municipal services. Instead of navigating complex policy documents, users simply type a question and receive an accurate, AI-generated answer backed by real municipal policy data.

### Key Highlights
- 🔍 **Semantic search** over policy documents using `sentence-transformers`
- 🤖 **Generative AI answers** powered by Google Gemini 1.5 Flash
- 📚 **Source citations** — every answer links back to its policy document
- 💻 **Works offline** (document retrieval without an API key)
- 🌐 **Dual mode** — standalone frontend-only OR full Python backend

---

## 🏗️ Architecture

```
CivicAI/
├── index.html              # Main entry point (frontend-only mode)
├── style.css               # Global styles & design system
├── app.js                  # Frontend RAG logic
├── knowledge_base.js       # Policy documents (JS)
├── frontend/               # Enhanced frontend build
└── backend/
    ├── main.py             # FastAPI endpoints
    ├── rag_engine.py       # Core RAG pipeline
    ├── knowledge_base.py   # Policy documents (Python)
    ├── requirements.txt    # Python dependencies
    └── .env.example        # Environment variable template
```

### RAG Pipeline

```
User Question
     │
     ▼
[1] EMBED    ──► sentence-transformers (all-MiniLM-L6-v2)
     │
     ▼
[2] RETRIEVE ──► Cosine similarity search → Top-K policy chunks
     │
     ▼
[3] GENERATE ──► Gemini 1.5 Flash + context → Answer + Sources
```

---

## ✨ Features

| Feature | Description |
|---|---|
| 💬 Chat Interface | Clean, accessible chat UI with history |
| 📂 Document Navigator | Sidebar listing all indexed policy documents |
| 🔍 Document Search | Real-time search over the policy document list |
| 📜 Chat History | Sessions persisted in the sidebar |
| 🌊 Example Prompts | Click-to-ask question chips |
| 📌 Source Citations | Answers include linked source documents |
| ⚙️ API Key Manager | In-app Gemini API key entry (stored locally) |
| 🔒 Privacy First | Key stored in browser localStorage only |
| ♿ Accessible | ARIA roles, live regions, keyboard navigation |
| 📱 Responsive | Mobile-friendly layout |

---

## 📋 Policy Topics Covered

- 💧 Water leak reporting & emergency contacts  
- 🧪 Discolored / contaminated water response  
- 🌊 Water conservation programs & rebates  
- 🗑️ Garbage collection schedules by zone  
- ♻️ Recycling guidelines  
- 💻 E-waste / electronics recycling drop-offs  
- ⚠️ Household hazardous waste disposal (paint, batteries, chemicals)  
- 🛋️ Bulk waste & furniture pickup scheduling  
- 🚯 Illegal dumping reporting  

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| HTML5 / CSS3 | Structure & styling |
| Vanilla JavaScript | App logic & RAG orchestration |
| Google Gemini API | AI answer generation (client-side) |

### Backend
| Technology | Purpose |
|---|---|
| Python 3.10+ | Backend runtime |
| FastAPI | REST API framework |
| Uvicorn | ASGI server |
| sentence-transformers | Semantic embeddings (`all-MiniLM-L6-v2`) |
| NumPy | Cosine similarity computation |
| google-generativeai | Gemini 1.5 Flash integration |
| python-dotenv | Environment variable management |

---

## ⚡ Quick Start

### Option A — Frontend Only (No Install Required)

```bash
git clone https://github.com/Aparna02sajeevan/CivicAI.git
```

1. Open `index.html` in your browser
2. Enter your **Google Gemini API key** when prompted  
   → Get a free key at https://aistudio.google.com/app/apikey
3. Start chatting! 🎉

> **Note:** Without an API key, the app still demonstrates document retrieval but cannot generate AI answers.

---

### Option B — Full Backend Mode (Recommended)

#### Prerequisites
- Python 3.10 or higher
- A Google Gemini API key

#### 1. Set up the backend

```bash
cd backend

# Create and activate a virtual environment
python -m venv venv

venv\Scripts\activate      # Windows
source venv/bin/activate   # macOS / Linux
```

#### 2. Install dependencies

```bash
pip install -r requirements.txt
```

#### 3. Configure environment variables

```bash
cp .env.example .env
# Edit .env and set: GEMINI_API_KEY=your_key_here
```

#### 4. Start the backend server

```bash
python main.py
# API available at http://localhost:8000
```

#### 5. Open `index.html` in your browser

---

## 🌐 API Reference

Once the backend is running:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Health check |
| `GET` | `/api/status` | RAG engine status (chunks indexed, model info) |
| `GET` | `/api/documents` | List all indexed policy documents |
| `POST` | `/api/chat` | Main chat endpoint — returns AI answer + sources |

### Example Request

```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "How do I report a water leak in Greenville?"}'
```

### Example Response

```json
{
  "answer": "To report a water leak in Greenville, call the 24/7 emergency line at...",
  "sources": [
    {
      "title": "Water Leak & Emergency Response Policy",
      "category": "Water Services",
      "icon": "💧",
      "relevance": 0.87,
      "excerpt": "Citizens can report leaks by calling..."
    }
  ],
  "chunks_retrieved": 4,
  "model": "gemini-1.5-flash"
}
```

---

## 🌍 SDG Alignment

| SDG | Goal | How CivicAI Contributes |
|---|---|---|
| **SDG 6** | 💧 Clean Water & Sanitation | Educates citizens on water conservation, leak reporting, and water quality |
| **SDG 12** | ♻️ Responsible Consumption | Guides citizens on recycling, e-waste, and hazardous waste handling |

---

## 📁 Environment Variables

Create `backend/.env` from `backend/.env.example`:

```env
# Required: Your Google Gemini API Key
GEMINI_API_KEY=your_gemini_api_key_here
```

> ⚠️ **Never commit your `.env` file.** It is already listed in `.gitignore`.

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'Add my feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

---

## 📄 License

This project is open source. Feel free to use and adapt it for civic AI initiatives.

---

## 👤 Author

**Aparna Sajeevan**  
🔗 [GitHub — Aparna02sajeevan](https://github.com/Aparna02sajeevan)

---

*Built with ❤️ for smarter, more accessible municipal services.*
