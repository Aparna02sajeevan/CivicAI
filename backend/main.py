"""
main.py
-------
CivicAI — FastAPI Backend

Endpoints:
  GET  /              → health check
  GET  /api/status    → RAG engine status (chunks indexed, model, etc.)
  GET  /api/documents → list all policy documents
  POST /api/chat      → main RAG endpoint (question → answer + sources)
"""

import os
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv

from rag_engine import RAGEngine
from knowledge_base import KNOWLEDGE_BASE

# ─────────────────────────────────────────────
# Logging
# ─────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("civicai.main")

# ─────────────────────────────────────────────
# Load environment variables
# ─────────────────────────────────────────────
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# ─────────────────────────────────────────────
# RAG Engine (singleton)
# ─────────────────────────────────────────────
rag = RAGEngine()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize the RAG engine when the server starts."""
    logger.info("🚀  CivicAI backend starting…")
    try:
        rag.setup(GEMINI_API_KEY)
    except Exception as e:
        logger.error("❌  Failed to initialize RAG Gemini LLM: %s. Using Extractive RAG mode.", e)
        rag.setup("")
    yield
    logger.info("👋  CivicAI backend shutting down.")


# ─────────────────────────────────────────────
# FastAPI App
# ─────────────────────────────────────────────
app = FastAPI(
    title="CivicAI — Greenville Municipal RAG API",
    description=(
        "RAG-powered chatbot backend for Greenville municipal water and waste policies. "
        "Aligned with SDG 6 (Clean Water) and SDG 12 (Responsible Consumption)."
    ),
    version="1.0.0",
    docs_url="/docs",       # Swagger UI at http://localhost:8000/docs
    redoc_url="/redoc",     # ReDoc at http://localhost:8000/redoc
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────
# Allow frontend (localhost:8080 or file://) to call the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # In production: restrict to your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────
# Request / Response Models
# ─────────────────────────────────────────────
class ChatRequest(BaseModel):
    question: str = Field(..., min_length=2, max_length=1000,
                          description="The citizen's question about municipal services")


class SourceDoc(BaseModel):
    title: str
    category: str
    icon: str
    color: str
    sdg: int
    relevance: float
    excerpt: str


class ChatResponse(BaseModel):
    answer: str
    sources: list[SourceDoc]
    chunks_retrieved: int
    model: str


class StatusResponse(BaseModel):
    ready: bool
    embedding_model: str | None
    chunks_indexed: int
    documents_indexed: int
    llm_model: str
    gemini_configured: bool


# ─────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────

@app.get("/", summary="Health check")
def root():
    """Simple health check — confirms the server is running."""
    return {
        "status": "ok",
        "service": "CivicAI — Greenville Municipal RAG API",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/api/status", response_model=StatusResponse, summary="RAG engine status")
def get_status():
    """Returns the current state of the RAG engine (is it ready, how many chunks indexed, etc.)."""
    s = rag.status()
    s["gemini_configured"] = bool(GEMINI_API_KEY)
    return s


@app.get("/api/documents", summary="List all policy documents")
def list_documents():
    """Returns metadata for all policy documents in the knowledge base."""
    docs = []
    for doc in KNOWLEDGE_BASE:
        docs.append(
            {
                "id": doc["id"],
                "title": doc["title"],
                "category": doc["category"],
                "icon": doc["icon"],
                "color": doc["color"],
                "sdg": doc["sdg"],
                "chunk_count": len(doc["chunks"]),
            }
        )
    return {"documents": docs, "total": len(docs)}


@app.post("/api/chat", response_model=ChatResponse, summary="RAG chat endpoint")
def chat(request: ChatRequest):
    """
    Main RAG endpoint.

    1. Retrieves the most relevant policy chunks using semantic search
    2. Augments a Gemini prompt with the retrieved context
    3. Returns the AI-generated answer with source citations
    """
    if not rag.ready:
        raise HTTPException(
            status_code=503,
            detail=(
                "RAG engine is not ready. Please check that GEMINI_API_KEY is set "
                "in backend/.env and restart the server."
            ),
        )

    try:
        result = rag.chat(request.question)
        return result
    except Exception as e:
        logger.error("Error during chat: %s", e, exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred while generating the answer: {str(e)}",
        )


# ─────────────────────────────────────────────
# Run
# ─────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,      # auto-reload on file changes during development
        log_level="info",
    )
