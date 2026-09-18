/**
 * app.js — RAG Civic Chatbot Core
 * =================================
 * Pipeline:
 *   1. Ingest → chunk policy documents from knowledge_base.js
 *   2. Index  → build TF-IDF vectors for each chunk
 *   3. Query  → embed the user's question as a TF-IDF vector
 *   4. Retrieve → cosine similarity → top-k most relevant chunks
 *   5. Generate → call Gemini API with context + question
 *   6. Render → stream-style display with source citations
 */

'use strict';

// ─────────────────────────────────────────────
// 1. CONFIGURATION
// ─────────────────────────────────────────────
const CONFIG = {
  GEMINI_MODEL: 'gemini-2.5-flash',
  TOP_K: 4,           // number of chunks to retrieve
  MAX_CHUNK_TOKENS: 400,
  STORAGE_KEY_API: 'greenville_gemini_key',
};

// ─────────────────────────────────────────────
// 2. TF-IDF ENGINE
// ─────────────────────────────────────────────
const TFIDF = (() => {
  const STOP_WORDS = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
    'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do',
    'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'shall',
    'that', 'this', 'these', 'those', 'it', 'its', 'they', 'them', 'their', 'we',
    'our', 'you', 'your', 'i', 'my', 'he', 'she', 'his', 'her', 'us', 'who', 'which',
    'what', 'when', 'where', 'how', 'if', 'then', 'than', 'so', 'as', 'by', 'from',
    'into', 'through', 'during', 'before', 'after', 'above', 'below', 'up', 'down',
    'out', 'off', 'over', 'under', 'again', 'further', 'once', 'can', 'not', 'no',
    'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such',
  ]);

  function tokenize(text) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !STOP_WORDS.has(w));
  }

  function termFrequency(tokens) {
    const tf = {};
    for (const t of tokens) tf[t] = (tf[t] || 0) + 1;
    const max = Math.max(...Object.values(tf));
    for (const t in tf) tf[t] /= max;
    return tf;
  }

  function buildIndex(chunks) {
    const tokenizedChunks = chunks.map(c => tokenize(c.text));
    const N = chunks.length;

    // DF: how many docs contain each term
    const df = {};
    for (const tokens of tokenizedChunks) {
      for (const t of new Set(tokens)) df[t] = (df[t] || 0) + 1;
    }

    // IDF
    const idf = {};
    for (const t in df) idf[t] = Math.log((N + 1) / (df[t] + 1)) + 1;

    // TF-IDF vectors per chunk
    const vectors = tokenizedChunks.map(tokens => {
      const tf = termFrequency(tokens);
      const vec = {};
      for (const t in tf) vec[t] = tf[t] * (idf[t] || 1);
      return vec;
    });

    return { vectors, idf, N };
  }

  function queryVector(query, idf) {
    const tokens = tokenize(query);
    const tf = termFrequency(tokens);
    const vec = {};
    for (const t in tf) vec[t] = tf[t] * (idf[t] || 1);
    return vec;
  }

  function cosineSimilarity(vecA, vecB) {
    let dot = 0, magA = 0, magB = 0;
    for (const t in vecA) {
      dot += vecA[t] * (vecB[t] || 0);
      magA += vecA[t] ** 2;
    }
    for (const t in vecB) magB += vecB[t] ** 2;
    const denom = Math.sqrt(magA) * Math.sqrt(magB);
    return denom === 0 ? 0 : dot / denom;
  }

  function retrieve(queryText, chunks, index, topK = CONFIG.TOP_K) {
    const qVec = queryVector(queryText, index.idf);
    const scores = index.vectors.map((vec, i) => ({
      chunk: chunks[i],
      score: cosineSimilarity(qVec, vec),
    }));
    return scores
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .filter(r => r.score > 0);
  }

  return { buildIndex, retrieve };
})();

// ─────────────────────────────────────────────
// 3. RAG STATE
// ─────────────────────────────────────────────
const RAG = {
  allChunks: [],
  index: null,
  docMap: {},   // chunkId → doc metadata

  init() {
    // Flatten all chunks from knowledge base
    for (const doc of KNOWLEDGE_BASE) {
      for (const chunk of doc.chunks) {
        this.allChunks.push(chunk);
        this.docMap[chunk.id] = {
          docId: doc.id,
          title: doc.title,
          category: doc.category,
          icon: doc.icon,
          color: doc.color,
          sdg: doc.sdg,
        };
      }
    }
    this.index = TFIDF.buildIndex(this.allChunks);
    console.log(`[RAG] Indexed ${this.allChunks.length} chunks from ${KNOWLEDGE_BASE.length} documents.`);
  },

  retrieve(query) {
    return TFIDF.retrieve(query, this.allChunks, this.index, CONFIG.TOP_K);
  },
};

// ─────────────────────────────────────────────
// 4. GEMINI API
// ─────────────────────────────────────────────
// 4. GEMINI API & DYNAMIC SYNTHESIS FALLBACK
// ─────────────────────────────────────────────
function extractiveRagGenerate(question, retrievedChunks) {
  if (!retrievedChunks || retrievedChunks.length === 0) {
    return `Thank you for contacting Greenville Municipal Services regarding: **"${escapeHtml(question)}"**.

We searched our civic policy database, but couldn't find a direct record matching this specific query.

**How to get immediate assistance:**
• Call Greenville Municipal Customer Service: **311** (or 555-311-CITY)
• Online Support Portal: **greenville.gov/311**
• Water Emergency Hotline (24/7): **1-800-GRN-WATER**`;
  }

  // Group chunks by document title for clear, structured synthesis
  const byDoc = {};
  for (const r of retrievedChunks) {
    const meta = RAG.docMap[r.chunk.id] || {};
    const title = meta.title || 'Municipal Policy Record';
    if (!byDoc[title]) byDoc[title] = { icon: meta.icon || '📄', category: meta.category || 'Policy', items: [] };
    byDoc[title].items.push(r);
  }

  const lines = [
    `Thank you for reaching out to Greenville Municipal Services regarding **"${escapeHtml(question)}"**.\n`,
    `### 📋 Official Directives & Policy Information\n`
  ];

  for (const [title, group] of Object.entries(byDoc)) {
    lines.push(`#### ${group.icon} ${title} *(${group.category})*`);
    for (const item of group.items) {
      const relevancePct = Math.round(item.score * 100);
      lines.push(`• ${item.chunk.text} *(Relevance: ${relevancePct}%)*`);
    }
    lines.push('');
  }

  lines.push('**Need further help?** You can ask a follow-up question here or contact Greenville 311 at **greenville.gov/311**.');
  return lines.join('\n');
}

async function callGemini(apiKey, question, retrievedChunks) {
  if (!retrievedChunks || retrievedChunks.length === 0) {
    return `Thank you for contacting Greenville Municipal Services regarding **"${escapeHtml(question)}"**. We couldn't locate matching records in our policy database for this inquiry. For direct assistance, please contact Greenville 311 by calling **311** or visiting **greenville.gov/311**.`;
  }

  const contextText = retrievedChunks
    .map((r, i) => {
      const meta = RAG.docMap[r.chunk.id] || {};
      return `[Source ${i + 1} — ${meta.title || 'Policy'} (${meta.category || 'General'})]\n${r.chunk.text}`;
    })
    .join('\n\n');

  const systemPrompt = `You are CivicAI, the official AI assistant for Greenville Municipal Services.
Synthesize accurate, helpful, customized responses tailored specifically to each citizen's inquiry using the retrieved municipal policy records.
Do NOT use predefined or template responses. Customize every single sentence to address the citizen's specific question.`;

  const userPrompt = `CITIZEN QUESTION: ${question}

RETRIEVED MUNICIPAL DATASET CONTEXT:
${contextText}

INSTRUCTIONS FOR YOUR RESPONSE:
1. Answer the citizen's question directly, accurately, and thoroughly using the provided context.
2. Do NOT use canned or predefined template phrases. Customize every single sentence to address the citizen's specific inquiry.
3. Start with a warm, polite greeting addressing the topic.
4. Provide step-by-step guidance, exact phone numbers, deadlines, addresses, and policy requirements from the context.
5. Structure your response clearly using markdown sections, bullet points, and bold text for key terms (**text**).
6. If relevant policy details (fines, rebate amounts, hours, contact links) are in the context, include them clearly.`;

  const modelsToTry = [
    'gemini-1.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-pro',
    'gemini-1.5-flash-8b',
    'gemini-flash-latest',
  ];

  let lastError = null;

  for (const modelName of modelsToTry) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: {
            temperature: 0.3,
            topP: 0.85,
            maxOutputTokens: 1024,
          },
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        const msg = err?.error?.message || `HTTP ${response.status}`;
        console.warn(`[Gemini] Model ${modelName} returned error (${msg}), trying next fallback...`);
        lastError = new Error(msg);
        continue;
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text;
    } catch (e) {
      console.warn(`[Gemini] Network/API call failed for ${modelName}:`, e.message);
      lastError = e;
    }
  }

  console.warn('[Gemini] All LLM models unavailable. Falling back to Local Extractive RAG engine.');
  return extractiveRagGenerate(question, retrievedChunks);
}

// ─────────────────────────────────────────────
// 5. UI CONTROLLER
// ─────────────────────────────────────────────
const UI = {
  // Elements
  el: {},
  apiKey: null,
  isLoading: false,
  chatStarted: false,
  chats: [],
  currentChatId: null,

  init() {
    this.cacheElements();
    this.bindEvents();
    this.loadApiKey();
    this.initHistory();
    this.renderSidebar();
    this.updateStatus();
  },

  cacheElements() {
    const ids = [
      'app-header', 'sidebar', 'chat-area', 'welcome-screen',
      'messages-container', 'chat-input', 'send-btn', 'input-area',
      'api-modal', 'api-key-input', 'save-api-btn', 'skip-api-btn',
      'settings-btn', 'sidebar-toggle', 'sidebar-search-input',
      'sidebar-docs-list', 'status-dot', 'status-text', 'toast',
      'new-chat-btn', 'sidebar-new-chat-btn', 'sidebar-history-section',
      'sidebar-history-list', 'scroll-to-bottom-btn',
    ];
    for (const id of ids) {
      this.el[id] = document.getElementById(id);
    }
  },

  bindEvents() {
    // API modal
    this.el['save-api-btn']?.addEventListener('click', () => this.saveApiKey());
    this.el['skip-api-btn']?.addEventListener('click', () => this.closeModal());
    this.el['settings-btn']?.addEventListener('click', () => this.openModal());
    this.el['api-key-input']?.addEventListener('keydown', e => {
      if (e.key === 'Enter') this.saveApiKey();
    });

    // Chat input
    this.el['chat-input']?.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.handleSend();
      }
    });
    this.el['chat-input']?.addEventListener('input', () => this.autoResize());
    this.el['send-btn']?.addEventListener('click', () => this.handleSend());

    // New Chat buttons
    this.el['new-chat-btn']?.addEventListener('click', () => this.newChat());
    this.el['sidebar-new-chat-btn']?.addEventListener('click', () => this.newChat());

    // Floating Scroll to Bottom button
    this.el['scroll-to-bottom-btn']?.addEventListener('click', () => this.scrollToBottom(true));

    // Scroll listener on messages container
    this.el['messages-container']?.addEventListener('scroll', () => this.handleMessagesScroll());

    // Sidebar toggle
    this.el['sidebar-toggle']?.addEventListener('click', () => this.toggleSidebar());

    // Sidebar search
    this.el['sidebar-search-input']?.addEventListener('input', e => {
      this.filterSidebar(e.target.value);
    });

    // Example chips
    document.querySelectorAll('.example-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const q = chip.dataset.q;
        this.el['chat-input'].value = q;
        this.handleSend();
      });
    });

    // Close modal on backdrop click
    this.el['api-modal']?.addEventListener('click', e => {
      if (e.target === this.el['api-modal']) this.closeModal();
    });
  },

  // ── History Management ─────────────────────
  initHistory() {
    try {
      const saved = localStorage.getItem('greenville_chat_history');
      if (saved) this.chats = JSON.parse(saved);
    } catch (e) {
      this.chats = [];
    }
    this.renderHistorySidebar();
  },

  saveHistory() {
    try {
      localStorage.setItem('greenville_chat_history', JSON.stringify(this.chats));
    } catch (e) {}
    this.renderHistorySidebar();
  },

  newChat() {
    this.currentChatId = null;
    this.chatStarted = false;
    const msgs = this.el['messages-container'];
    const welcome = this.el['welcome-screen'];
    if (msgs) {
      msgs.innerHTML = '';
      msgs.style.display = 'none';
    }
    if (welcome) welcome.style.display = 'flex';
    if (this.el['scroll-to-bottom-btn']) {
      this.el['scroll-to-bottom-btn'].classList.remove('visible');
    }
    this.renderHistorySidebar();
    this.showToast('✨ Started a new chat session', 'info');
  },

  createChat(firstQuestion) {
    const id = 'chat-' + Date.now();
    const title = firstQuestion.substring(0, 36) + (firstQuestion.length > 36 ? '…' : '');
    const newChatObj = {
      id,
      title,
      timestamp: new Date().toISOString(),
      messages: []
    };
    this.chats.unshift(newChatObj);
    if (this.chats.length > 20) this.chats.pop();
    this.currentChatId = id;
    this.saveHistory();
    return newChatObj;
  },

  saveMessageToCurrentChat(msgObj) {
    if (!this.currentChatId) return;
    const chat = this.chats.find(c => c.id === this.currentChatId);
    if (chat) {
      chat.messages.push(msgObj);
      this.saveHistory();
    }
  },

  loadChat(chatId) {
    const chat = this.chats.find(c => c.id === chatId);
    if (!chat) return;
    this.currentChatId = chatId;
    this.chatStarted = true;

    const msgs = this.el['messages-container'];
    const welcome = this.el['welcome-screen'];
    if (welcome) welcome.style.display = 'none';
    if (msgs) {
      msgs.innerHTML = '';
      msgs.style.display = 'flex';
    }

    for (const msg of chat.messages) {
      if (msg.role === 'user') {
        this.renderUserMessageDOM(msg.text, msg.time);
      } else if (msg.role === 'bot') {
        this.renderBotMessageDOM(msg.text, msg.retrieved || [], msg.time);
      }
    }
    this.renderHistorySidebar();
    this.scrollToBottom(false);
  },

  deleteChat(chatId, e) {
    if (e) e.stopPropagation();
    this.chats = this.chats.filter(c => c.id !== chatId);
    if (this.currentChatId === chatId) {
      this.newChat();
    } else {
      this.saveHistory();
    }
    this.showToast('🗑️ Chat deleted', 'info');
  },

  renderHistorySidebar() {
    const container = this.el['sidebar-history-list'];
    if (!container) return;
    if (this.chats.length === 0) {
      container.innerHTML = '<div style="padding: 6px 4px; font-size: 11px; color: var(--text-muted);">No recent chats yet</div>';
      return;
    }

    let html = '';
    for (const chat of this.chats) {
      const isActive = chat.id === this.currentChatId ? 'active' : '';
      html += `
        <div class="history-item ${isActive}" data-chat-id="${chat.id}">
          <span style="font-size:13px;">💬</span>
          <span class="history-item-title" title="${escapeHtml(chat.title)}">${escapeHtml(chat.title)}</span>
          <span class="history-item-delete" title="Delete chat" data-delete-id="${chat.id}">🗑️</span>
        </div>`;
    }
    container.innerHTML = html;

    container.querySelectorAll('.history-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.classList.contains('history-item-delete')) return;
        this.loadChat(item.dataset.chatId);
      });
    });

    container.querySelectorAll('.history-item-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.deleteChat(btn.dataset.deleteId, e);
      });
    });
  },

  loadApiKey() {
    this.apiKey = localStorage.getItem(CONFIG.STORAGE_KEY_API) || null;
    if (!this.apiKey) {
      this.openModal();
    }
  },

  saveApiKey() {
    const key = this.el['api-key-input']?.value?.trim();
    if (!key || key.length < 5) {
      this.showToast('⚠️ Please enter a valid API key', 'error');
      return;
    }
    this.apiKey = key;
    localStorage.setItem(CONFIG.STORAGE_KEY_API, key);
    this.closeModal();
    this.updateStatus();
    this.showToast('✅ API key saved! You\'re ready to chat.', 'success');
  },

  openModal() {
    this.el['api-modal']?.classList.remove('hidden');
    if (this.apiKey) {
      this.el['api-key-input'].value = this.apiKey;
    }
    setTimeout(() => this.el['api-key-input']?.focus(), 100);
  },

  closeModal() {
    this.el['api-modal']?.classList.add('hidden');
    this.updateStatus();
  },

  updateStatus() {
    const dot = this.el['status-dot'];
    const text = this.el['status-text'];
    if (!dot || !text) return;
    if (this.apiKey) {
      dot.classList.add('ready');
      text.textContent = 'Ready · Greenville Policy Index loaded';
    } else {
      dot.classList.remove('ready');
      text.textContent = 'API key required to generate answers';
    }
  },

  toggleSidebar() {
    const sidebar = this.el['sidebar'];
    if (!sidebar) return;
    if (window.innerWidth <= 768) {
      sidebar.classList.toggle('mobile-open');
    } else {
      sidebar.classList.toggle('collapsed');
    }
  },

  renderSidebar() {
    const container = this.el['sidebar-docs-list'];
    if (!container) return;

    // Group by category
    const categories = {};
    for (const doc of KNOWLEDGE_BASE) {
      if (!categories[doc.category]) categories[doc.category] = [];
      categories[doc.category].push(doc);
    }

    let html = '';
    for (const [cat, docs] of Object.entries(categories)) {
      html += `<div class="sidebar-category-label">${cat}</div>`;
      for (const doc of docs) {
        const sdgLabel = doc.sdg > 0 ? `SDG ${doc.sdg}` : 'Program';
        html += `
          <div class="doc-item" data-doc-id="${doc.id}" title="${doc.title}">
            <span class="doc-icon">${doc.icon}</span>
            <div class="doc-info">
              <div class="doc-title">${doc.title}</div>
              <div class="doc-meta">
                <span class="sdg-dot" style="background:${doc.color}"></span>
                ${sdgLabel} · ${doc.chunks.length} sections
              </div>
            </div>
          </div>`;
      }
    }
    container.innerHTML = html;

    // Click handler
    container.querySelectorAll('.doc-item').forEach(item => {
      item.addEventListener('click', () => {
        container.querySelectorAll('.doc-item').forEach(d => d.classList.remove('active'));
        item.classList.add('active');
        const docId = item.dataset.docId;
        const doc = KNOWLEDGE_BASE.find(d => d.id === docId);
        if (doc) this.askAboutDoc(doc);
      });
    });
  },

  filterSidebar(query) {
    const q = query.toLowerCase();
    document.querySelectorAll('.doc-item').forEach(item => {
      const text = item.textContent.toLowerCase();
      item.style.display = text.includes(q) ? '' : 'none';
    });
  },

  askAboutDoc(doc) {
    const q = `Tell me about "${doc.title}" — what do I need to know?`;
    this.el['chat-input'].value = q;
    this.el['chat-input'].focus();
  },

  autoResize() {
    const ta = this.el['chat-input'];
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  },

  async handleSend() {
    const input = this.el['chat-input'];
    const question = input?.value?.trim();
    if (!question || this.isLoading) return;

    if (!this.apiKey) {
      this.openModal();
      this.showToast('Please add your Gemini API key first.', 'error');
      return;
    }

    if (!this.chatStarted) this.startChat();
    if (!this.currentChatId) this.createChat(question);

    input.value = '';
    input.style.height = 'auto';

    // Render & save user message
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    this.renderUserMessageDOM(question, time);
    this.saveMessageToCurrentChat({ role: 'user', text: question, time });

    // Show typing indicator
    const typingId = this.appendTyping();
    this.setLoading(true);

    try {
      // Step 1: Retrieve relevant chunks
      const retrieved = RAG.retrieve(question);

      // Step 2: Generate answer via Gemini
      const answer = await callGemini(this.apiKey, question, retrieved);

      // Step 3: Render bot response with sources & save
      this.removeTyping(typingId);
      this.renderBotMessageDOM(answer, retrieved, time);
      this.saveMessageToCurrentChat({ role: 'bot', text: answer, retrieved, time });

    } catch (err) {
      this.removeTyping(typingId);
      const errMsg = err.message?.includes('API_KEY_INVALID')
        ? 'Invalid API key. Please check your Gemini API key in Settings.'
        : err.message?.includes('quota')
          ? 'API quota exceeded. Please wait and try again.'
          : `Error: ${err.message}. Please try again.`;
      this.renderBotMessageDOM(errMsg, [], time);
      this.saveMessageToCurrentChat({ role: 'bot', text: errMsg, retrieved: [], time });
      this.showToast('❌ ' + errMsg.substring(0, 60), 'error');
    } finally {
      this.setLoading(false);
    }
  },

  startChat() {
    this.chatStarted = true;
    const welcome = this.el['welcome-screen'];
    const msgs = this.el['messages-container'];
    if (welcome) welcome.style.display = 'none';
    if (msgs) {
      msgs.style.display = 'flex';
    }
  },

  renderUserMessageDOM(text, timeStr) {
    const msgs = this.el['messages-container'];
    if (!msgs) return;
    const time = timeStr || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const div = document.createElement('div');
    div.className = 'message user-message';
    div.innerHTML = `
      <div class="message-avatar">👤</div>
      <div class="message-body">
        <div class="message-bubble">${escapeHtml(text)}</div>
        <div class="message-meta-row" style="display:flex; align-items:center; gap:8px; margin-top:4px; justify-content:flex-end;">
          <div class="message-time">${time}</div>
          <button class="edit-query-btn" title="Edit question" data-question="${escapeHtml(text)}">✏️ Edit</button>
        </div>
      </div>`;

    const editBtn = div.querySelector('.edit-query-btn');
    if (editBtn) {
      editBtn.addEventListener('click', () => {
        const q = editBtn.dataset.question;
        const input = this.el['chat-input'];
        if (input) {
          input.value = q;
          input.focus();
          this.autoResize();
          this.showToast('✏️ Question loaded into chat input for editing', 'info');
        }
      });
    }

    msgs.appendChild(div);
    this.scrollToBottom();
  },

  renderBotMessageDOM(text, retrieved = [], timeStr) {
    const msgs = this.el['messages-container'];
    if (!msgs) return;
    const time = timeStr || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const formatted = formatText(text);

    // Build RAG pipeline badge
    const ragSteps = retrieved && retrieved.length > 0 ? `
      <div class="rag-steps">
        <span class="rag-step"><span class="rag-step-dot"></span>Query</span>
        <span class="rag-arrow">→</span>
        <span class="rag-step"><span class="rag-step-dot"></span>Retrieved ${retrieved.length} chunks</span>
        <span class="rag-arrow">→</span>
        <span class="rag-step"><span class="rag-step-dot"></span>Gemini Generated</span>
      </div>` : '';

    // Build source cards
    const seenDocs = new Set();
    const sourcesHtml = retrieved && retrieved.length > 0 ? (() => {
      let cards = '';
      for (const r of retrieved) {
        const chunkId = r.chunk ? r.chunk.id : null;
        const meta = chunkId ? RAG.docMap[chunkId] : null;
        if (!meta || seenDocs.has(meta.docId)) continue;
        seenDocs.add(meta.docId);
        const pct = Math.round((r.score || 0) * 100);
        const snippetText = r.chunk ? r.chunk.text.substring(0, 120) : '';
        cards += `
          <div class="source-card" title="${escapeHtml(snippetText)}...">
            <span class="source-card-icon">${meta.icon}</span>
            <div class="source-card-info">
              <div class="source-card-title">${meta.title}</div>
              <div class="source-card-relevance">Relevance: ${pct}% · ${meta.category}</div>
            </div>
          </div>`;
      }
      return cards ? `
        <div class="message-sources">
          <div class="sources-label">📎 Sources</div>
          ${cards}
        </div>` : '';
    })() : '';

    const div = document.createElement('div');
    div.className = 'message bot-message';
    div.innerHTML = `
      <div class="message-avatar">🌿</div>
      <div class="message-body">
        ${ragSteps}
        <div class="message-bubble">${formatted}</div>
        ${sourcesHtml}
        <div class="message-time">CivicAI · ${time}</div>
      </div>`;
    msgs.appendChild(div);
    this.scrollToBottom();
  },

  appendTyping() {
    const msgs = this.el['messages-container'];
    if (!msgs) return null;
    const id = 'typing-' + Date.now();
    const div = document.createElement('div');
    div.id = id;
    div.className = 'message bot-message typing-indicator';
    div.innerHTML = `
      <div class="message-avatar">🌿</div>
      <div class="typing-dots">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>`;
    msgs.appendChild(div);
    this.scrollToBottom();
    return id;
  },

  removeTyping(id) {
    document.getElementById(id)?.remove();
  },

  setLoading(loading) {
    this.isLoading = loading;
    const btn = this.el['send-btn'];
    const input = this.el['chat-input'];
    if (btn) btn.disabled = loading;
    if (input) input.disabled = loading;
    if (!loading && input) input.focus();
  },

  handleMessagesScroll() {
    const msgs = this.el['messages-container'];
    const btn = this.el['scroll-to-bottom-btn'];
    if (!msgs || !btn) return;
    const distFromBottom = msgs.scrollHeight - msgs.scrollTop - msgs.clientHeight;
    if (distFromBottom > 120) {
      btn.classList.add('visible');
    } else {
      btn.classList.remove('visible');
    }
  },

  scrollToBottom(smooth = true) {
    const msgs = this.el['messages-container'];
    const btn = this.el['scroll-to-bottom-btn'];
    if (!msgs) return;
    if (btn) btn.classList.remove('visible');

    const doScroll = () => {
      msgs.scrollTop = msgs.scrollHeight;
    };

    doScroll();
    requestAnimationFrame(doScroll);
    setTimeout(doScroll, 50);
  },

  showToast(message, type = 'info') {
    const toast = this.el['toast'];
    if (!toast) return;
    toast.textContent = message;
    toast.className = `show ${type}`;
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      toast.className = '';
    }, 4000);
  },
};

// ─────────────────────────────────────────────
// 6. HELPERS
// ─────────────────────────────────────────────
function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatText(text) {
  // Convert basic markdown to HTML
  let html = escapeHtml(text);

  // Bold **text**
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Italic *text*
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  // Bullet points (lines starting with - or •)
  html = html.replace(/^[-•]\s+(.+)$/gm, '<li>$1</li>');
  // Numbered lists
  html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');
  // Wrap consecutive <li> in <ul>
  html = html.replace(/(<li>.*<\/li>\n?)+/g, m => `<ul>${m}</ul>`);
  // Paragraphs
  html = html.split(/\n\n+/).map(p => {
    p = p.trim();
    if (!p || p.startsWith('<ul>') || p.startsWith('<li>')) return p;
    return `<p>${p.replace(/\n/g, '<br>')}</p>`;
  }).join('');

  return html;
}

// ─────────────────────────────────────────────
// 7. BOOT
// ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  RAG.init();
  UI.init();
  console.log('[CivicAI] 🌿 Greenville RAG Chatbot initialized.');
});
