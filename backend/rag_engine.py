"""
rag_engine.py
-------------
Core RAG (Retrieval-Augmented Generation) pipeline.

Steps:
  1. EMBED   — Use sentence-transformers to encode all policy chunks into vectors
  2. RETRIEVE — Compute cosine similarity between query and chunk vectors → top-K
  3. GENERATE — Call Gemini API with retrieved context to produce an answer
"""

import os
import logging
import warnings
warnings.filterwarnings("ignore")

import numpy as np
import google.generativeai as genai
from sentence_transformers import SentenceTransformer
from typing import List, Dict, Any

from knowledge_base import get_all_chunks

logger = logging.getLogger("civicai.rag")


class RAGEngine:
    """
    Full RAG pipeline:
      - Sentence-transformer embeddings (all-MiniLM-L6-v2)
      - Cosine similarity retrieval
      - Gemini 1.5 Flash generation
    """

    MODEL_NAME = "all-MiniLM-L6-v2"   # fast, lightweight, great for semantic search
    GEMINI_MODEL = "gemini-1.5-flash"
    FALLBACK_MODELS = [
        "gemini-1.5-flash",
        "gemini-2.0-flash",
        "gemini-1.5-pro",
        "gemini-1.5-flash-8b",
        "gemini-flash-latest",
        "gemini-pro-latest",
    ]
    TOP_K = 4
    MIN_SCORE = 0.15  # minimum cosine similarity to include a chunk

    def __init__(self):
        self.embed_model: SentenceTransformer | None = None
        self.chunks: List[Dict] = []       # raw chunk text dicts
        self.doc_metas: List[Dict] = []    # parallel doc metadata
        self.embeddings: np.ndarray | None = None
        self.ready = False

    # ─────────────────────────────────────────────
    # 1. SETUP
    # ─────────────────────────────────────────────
    def setup(self, gemini_api_key: str):
        """Load the embedding model, build the vector index, and configure Gemini API."""
        logger.info("⚙️  Loading embedding model: %s", self.MODEL_NAME)
        self.embed_model = SentenceTransformer(self.MODEL_NAME)

        logger.info("📚  Building vector index from knowledge base…")
        all_chunks = get_all_chunks()
        self.chunks = [c for c, _ in all_chunks]
        self.doc_metas = [m for _, m in all_chunks]

        # Embed all chunks in one batch
        texts = [c["text"] for c in self.chunks]
        self.embeddings = self.embed_model.encode(
            texts,
            batch_size=32,
            show_progress_bar=False,
            normalize_embeddings=True,  # pre-normalize for fast cosine via dot product
        )

        # Configure Gemini API if key is supplied
        if gemini_api_key:
            try:
                genai.configure(api_key=gemini_api_key)

                system_instruction = (
                    "You are CivicAI, the official AI assistant for Greenville Municipal Services. "
                    "Always maintain an exceptionally polite, warm, empathetic, appreciative, and citizen-focused tone. "
                    "Start answers with a respectful, warm greeting acknowledging the citizen's inquiry. "
                    "Express genuine appreciation for their care regarding Greenville's water management, recycling, "
                    "and municipal environment. Provide clear, empathetic, step-by-step guidance using the provided context. "
                    "Only cite facts found in the context — never invent phone numbers, addresses, or URLs. "
                    "If the context is insufficient, politely explain and suggest contacting 311."
                )

                self.gemini = None
                for m_name in self.FALLBACK_MODELS:
                    try:
                        g = genai.GenerativeModel(
                            model_name=m_name,
                            system_instruction=system_instruction,
                        )
                        self.gemini = g
                        self.GEMINI_MODEL = m_name
                        logger.info("✅  Selected Gemini model: %s", m_name)
                        break
                    except Exception as e:
                        logger.warning("⚠️  Could not init model %s: %s", m_name, e)
            except Exception as e:
                logger.warning("⚠️  Gemini configuration error: %s. Using Extractive RAG fallback.", e)

        # RAG index is ready even if LLM uses extractive fallback
        self.ready = True
        logger.info(
            "✅  RAG engine ready. %d chunks indexed from %d documents.",
            len(self.chunks),
            len({m["doc_id"] for m in self.doc_metas}),
        )

    # ─────────────────────────────────────────────
    # 2. RETRIEVE
    # ─────────────────────────────────────────────
    def retrieve(self, query: str) -> List[Dict[str, Any]]:
        """
        Embed the query and return the top-K most similar chunks.
        Returns a list of result dicts with chunk text, score, and doc metadata.
        """
        if not self.ready:
            raise RuntimeError("RAG engine not initialized. Call setup() first.")

        # Embed query (normalized)
        query_vec = self.embed_model.encode(
            query, normalize_embeddings=True
        )

        # Cosine similarity = dot product when both vectors are L2-normalized
        scores = self.embeddings @ query_vec  # shape: (N,)

        # Sort descending, take top-K above threshold
        top_indices = np.argsort(scores)[::-1][: self.TOP_K * 2]
        results = []
        seen_docs = set()

        for idx in top_indices:
            score = float(scores[idx])
            if score < self.MIN_SCORE:
                break
            if len(results) >= self.TOP_K:
                break
            chunk = self.chunks[idx]
            meta = self.doc_metas[idx]
            results.append(
                {
                    "chunk_id": chunk["id"],
                    "text": chunk["text"],
                    "score": round(score, 4),
                    "doc_id": meta["doc_id"],
                    "title": meta["title"],
                    "category": meta["category"],
                    "icon": meta["icon"],
                    "color": meta["color"],
                    "sdg": meta["sdg"],
                    "is_new_doc": meta["doc_id"] not in seen_docs,
                }
            )
            seen_docs.add(meta["doc_id"])

        logger.info("🔍  Retrieved %d chunks for query: %r", len(results), query[:60])
        return results

    # ─────────────────────────────────────────────
    # 3. GENERATE
    # ─────────────────────────────────────────────
    def extractive_rag_generate(self, question: str, retrieved: List[Dict]) -> str:
        """
        Extractive RAG engine fallback:
        Synthesizes structured, accurate, question-tailored answers directly from
        retrieved document chunks without static boilerplate templates.
        """
        if not retrieved:
            return (
                f"Thank you for contacting Greenville Municipal Services regarding: **\"{question}\"**.\n\n"
                "I searched our civic policy index, but couldn't find a direct record matching this specific query.\n\n"
                "**How to get immediate assistance:**\n"
                "• Call Greenville Municipal Customer Service: **311** (or 555-311-CITY)\n"
                "• Online Support Portal: **greenville.gov/311**\n"
                "• Water Emergency Hotline (24/7): **1-800-GRN-WATER**"
            )

        # Group chunks by document title for structured synthesis
        by_doc = {}
        for r in retrieved:
            t = r.get("title", "Municipal Policy Record")
            if t not in by_doc:
                by_doc[t] = []
            by_doc[t].append(r)

        lines = [
            f"Thank you for reaching out to Greenville Municipal Services regarding **\"{question}\"**.\n",
            "### 📋 Official Directives & Policy Information\n"
        ]

        for doc_title, items in by_doc.items():
            icon = items[0].get("icon", "📄")
            category = items[0].get("category", "Policy")
            lines.append(f"#### {icon} {doc_title} *({category})*")
            for item in items:
                snippet = item.get("text", "").strip()
                relevance = int(item.get("score", 0.0) * 100)
                lines.append(f"• {snippet} *(Relevance: {relevance}%)*")
            lines.append("")

        lines.append(
            "**Need further help?** You can ask a follow-up question here or reach Greenville 311 at **greenville.gov/311**."
        )
        return "\n".join(lines)

    def generate(self, question: str, retrieved: List[Dict]) -> str:
        """Call Gemini with retrieved context to generate a precise, customized, non-predefined response."""
        if not retrieved:
            return (
                f"Thank you for contacting Greenville Municipal Services regarding **\"{question}\"**.\n\n"
                "We couldn't locate matching records in our policy database for this inquiry. "
                "For direct assistance, please contact Greenville 311 by calling **311** or visiting **greenville.gov/311**."
            )

        context = "\n\n".join(
            f"[Source {i+1} — {r['title']} ({r['category']})]\n{r['text']}"
            for i, r in enumerate(retrieved)
        )

        prompt = (
            f"CITIZEN QUESTION: {question}\n\n"
            f"RETRIEVED MUNICIPAL DATASET CONTEXT:\n{context}\n\n"
            f"INSTRUCTIONS FOR YOUR RESPONSE:\n"
            f"1. Answer the citizen's question directly, accurately, and thoroughly using the provided context.\n"
            f"2. Do NOT use canned or predefined template phrases. Customize every single sentence to address the citizen's specific inquiry.\n"
            f"3. Start with a warm, polite greeting addressing the topic.\n"
            f"4. Provide step-by-step guidance, exact phone numbers, deadlines, addresses, and policy requirements from the context.\n"
            f"5. Structure your response clearly using markdown sections, bullet points, and bold text for key terms (**text**).\n"
            f"6. If relevant policy details (fines, rebate amounts, hours, contact links) are in the context, include them clearly."
        )

        logger.info("🤖  Calling Gemini to generate custom answer for: %r", question[:50])
        last_err = None
        for m_name in self.FALLBACK_MODELS:
            try:
                model = genai.GenerativeModel(
                    model_name=m_name,
                    system_instruction=(
                        "You are CivicAI, the official AI assistant for Greenville Municipal Services. "
                        "Synthesize accurate, helpful, customized responses tailored specifically to each citizen's inquiry "
                        "using the retrieved municipal policy records."
                    ),
                )
                response = model.generate_content(
                    prompt,
                    generation_config=genai.types.GenerationConfig(
                        temperature=0.3,
                        top_p=0.85,
                        max_output_tokens=1024,
                    ),
                )
                if response and hasattr(response, 'text') and response.text:
                    self.GEMINI_MODEL = m_name
                    return response.text
            except Exception as e:
                logger.warning("⚠️  Model %s generation failed: %s, trying next fallback...", m_name, str(e)[:60])
                last_err = e
                continue

        logger.warning("⚠️  All Gemini models unavailable (%s). Falling back to Local Extractive RAG.", last_err)
        self.GEMINI_MODEL = "Local Extractive RAG Engine"
        return self.extractive_rag_generate(question, retrieved)

    # ─────────────────────────────────────────────
    # 4. FULL PIPELINE
    # ─────────────────────────────────────────────
    def chat(self, question: str) -> Dict[str, Any]:
        """
        Full RAG pipeline: retrieve → augment → generate.
        Returns answer text + source metadata.
        """
        retrieved = self.retrieve(question)
        answer = self.generate(question, retrieved)

        # Build clean source list for the API response (deduplicate by doc)
        seen = set()
        sources = []
        for r in retrieved:
            if r["doc_id"] not in seen:
                seen.add(r["doc_id"])
                sources.append(
                    {
                        "title": r["title"],
                        "category": r["category"],
                        "icon": r["icon"],
                        "color": r["color"],
                        "sdg": r["sdg"],
                        "relevance": r["score"],
                        "excerpt": r["text"][:150] + "…",
                    }
                )

        return {
            "answer": answer,
            "sources": sources,
            "chunks_retrieved": len(retrieved),
            "model": self.GEMINI_MODEL,
        }

    # ─────────────────────────────────────────────
    # 5. STATUS
    # ─────────────────────────────────────────────
    def status(self) -> Dict[str, Any]:
        return {
            "ready": self.ready,
            "embedding_model": self.MODEL_NAME if self.ready else None,
            "chunks_indexed": len(self.chunks) if self.ready else 0,
            "documents_indexed": len({m["doc_id"] for m in self.doc_metas}) if self.ready else 0,
            "llm_model": self.GEMINI_MODEL,
        }
