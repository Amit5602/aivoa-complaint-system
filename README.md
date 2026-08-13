# AIVOA — AI-Powered Customer Complaint Management System
### Pharmaceutical QMS | Round 1 Assignment

---

## 🏗️ Architecture

```
Frontend (React + Redux + Vite)  ──►  Backend (FastAPI)  ──►  LangGraph AI Agent
       Port 3000                          Port 8000              Groq llama-3.1-8b-instant
                                              │
                                        PostgreSQL DB
```

### LangGraph Agent Workflow (6 Nodes)
```
[Extract Fields] → [Risk Classification] → [Generate Summary]
      → [Root Cause + CAPA] → [Regulatory Flags] → [Completeness Check]
```

---

## ⚡ Quick Setup

### 1. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Set environment variables
export GROQ_API_KEY="your-groq-api-key"       # https://console.groq.com
export DATABASE_URL="postgresql://user:pass@localhost:5432/aivoa_complaints"

# Create DB and run
python -c "from models.database import create_tables; create_tables()"
uvicorn main:app --reload --port 8000
```

For SQLite (dev/demo without PostgreSQL):
```python
# In models/database.py, change line 8 to:
DATABASE_URL = "sqlite:///./complaints.db"
# and change: engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

---

## 🤖 AI Features

| Feature | Model | Description |
|---------|-------|-------------|
| Field Extraction | llama-3.1-8b-instant | Auto-parse email/PDF text into form fields |
| Risk Classification | llama-3.1-8b-instant | ICH Q9-based Critical/Major/Minor assessment |
| AI Summary | llama-3.1-8b-instant | QMS-compliant complaint summary |
| Root Cause | llama-3.3-70b | Probable root cause analysis |
| CAPA Recommendations | llama-3.3-70b | Actionable corrective/preventive actions |
| Regulatory Flags | llama-3.1-8b-instant | FDA/ICH/WHO applicability detection |
| Completeness Check | Rule-based | % completeness of complaint form |

---

## 📁 Project Structure

```
pharma-complaint-system/
├── backend/
│   ├── main.py                    # FastAPI app
│   ├── requirements.txt
│   ├── models/
│   │   ├── database.py            # SQLAlchemy models
│   │   └── schemas.py             # Pydantic schemas
│   ├── routers/
│   │   ├── complaints.py          # CRUD endpoints
│   │   └── ai_agent.py            # AI endpoints
│   └── agents/
│       └── complaint_agent.py     # LangGraph agent (6 nodes)
│
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx               # Entry point + Redux Provider
│       ├── App.jsx                # Complete UI (Dashboard + Form + List)
│       └── store/
│           ├── index.js           # Redux store config
│           └── complaintsSlice.js # Redux slice + async thunks
│
└── demo_complaints/
    └── complaint_email_1.txt      # Sample pharma complaint for demo
```

---

## 🔗 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/complaints/` | Create complaint (runs AI automatically) |
| GET | `/api/complaints/` | List all complaints (with filters) |
| GET | `/api/complaints/{id}` | Get single complaint |
| PATCH | `/api/complaints/{id}/status` | Update status |
| GET | `/api/complaints/stats/dashboard` | Dashboard statistics |
| POST | `/api/ai/parse-document` | Extract fields from text |
| POST | `/api/ai/analyze` | Full AI analysis |
| POST | `/api/ai/upload-complaint` | Upload file for parsing |

---

## 🎯 Bonus Features Implemented

- ✅ **Complaint Completeness Checker** — real-time % score
- ✅ **Root Cause Recommendation** — AI-powered (LLaMA 70B)
- ✅ **CAPA Recommendation** — ICH Q10-aligned
- ✅ **Complaint Summary** — QMS-compliant auto-summary
- ✅ **AI Risk Classification** — 3-tier with score (ICH Q9)
- ✅ **Regulatory Flags** — FDA/WHO/CDSCO detection
- ✅ **AI Document Parsing** — email/text → auto-fill form

---

## 📋 Tech Stack

- **Frontend**: React 18 + Redux Toolkit + Vite + Google Inter font
- **Backend**: Python 3.11 + FastAPI + SQLAlchemy
- **AI Agent**: LangGraph (6-node pipeline)
- **LLMs**: Groq `llama-3.1-8b-instant` + `llama-3.3-70b-versatile`
- **Database**: PostgreSQL (SQLite for dev)
- **Standards**: ICH Q9, ICH Q10, 21 CFR Part 211, Schedule M
