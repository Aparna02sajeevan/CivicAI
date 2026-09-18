/**
 * app.js — CivicAI Frontend (Full-Stack Version)
 * ================================================
 * The frontend now talks to the FastAPI backend via REST API.
 * All RAG logic (embeddings, retrieval, Gemini generation) runs on the server.
 *
 * API calls:
 *   GET  /api/status    → check if backend is ready
 *   GET  /api/documents → load sidebar document list
 *   POST /api/chat      → send question, receive answer + sources
 */

'use strict';

// ─────────────────────────────────────────────
// 1. CONFIGURATION
// ─────────────────────────────────────────────
const CONFIG = {
  BACKEND_URL: 'http://localhost:8000',   // FastAPI backend
  POLL_INTERVAL: 3000,                    // ms between status polls on startup
};

// ─────────────────────────────────────────────
// 2. API CLIENT
// ─────────────────────────────────────────────
const API = {
  async get(path) {
    const res = await fetch(`${CONFIG.BACKEND_URL}${path}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.detail || `HTTP ${res.status}`);
    }
    return res.json();
  },

  async post(path, body) {
    const res = await fetch(`${CONFIG.BACKEND_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.detail || `HTTP ${res.status}`);
    }
    return res.json();
  },

  async status()    { return this.get('/api/status'); },
  async documents() { return this.get('/api/documents'); },
  async chat(question) { return this.post('/api/chat', { question }); },
};

// ─────────────────────────────────────────────
// 3. UI CONTROLLER
// ─────────────────────────────────────────────
const UI = {
  el: {},
  isLoading: false,
  chatStarted: false,
  backendReady: false,
  chats: [],
  currentChatId: null,

  init() {
    this.cacheElements();
    this.bindEvents();
    this.initHistory();
    this.checkBackend();
    this.loadDocuments();
  },

  cacheElements() {
    const ids = [
      'sidebar', 'welcome-screen', 'messages-container',
      'chat-input', 'send-btn', 'sidebar-toggle',
      'sidebar-search-input', 'sidebar-docs-list',
      'status-dot', 'status-text', 'toast',
      'backend-status-card', 'new-chat-btn', 'sidebar-new-chat-btn',
      'sidebar-history-section', 'sidebar-history-list', 'scroll-to-bottom-btn',
    ];
    for (const id of ids) {
      this.el[id] = document.getElementById(id);
    }
  },

  bindEvents() {
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
        this.el['chat-input'].value = chip.dataset.q;
        this.handleSend();
      });
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
    const welcome = document.getElementById('welcome-screen');
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
    const welcome = document.getElementById('welcome-screen');
    if (welcome) welcome.style.display = 'none';
    if (msgs) {
      msgs.innerHTML = '';
      msgs.style.display = 'flex';
    }

    for (const msg of chat.messages) {
      if (msg.role === 'user') {
        this.renderUserMessageDOM(msg.text, msg.time);
      } else if (msg.role === 'bot') {
        this.renderBotMessageDOM(msg.text, msg.sources || [], msg.chunksRetrieved || 0, msg.time);
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

  // ── Backend Status ──────────────────────────
  async checkBackend() {
    this.setStatus('loading', 'Connecting to backend…');
    try {
      const s = await API.status();
      if (s.ready) {
        this.backendReady = true;
        this.setStatus('ready',
          `Ready · ${s.chunks_indexed} chunks · ${s.embedding_model}`);
        this.updateBackendCard(s, true);
      } else {
        this.setStatus('warn',
          s.gemini_configured
            ? 'Backend loading — please wait…'
            : 'Set GEMINI_API_KEY in backend/.env then restart server');
        this.updateBackendCard(s, false);
        setTimeout(() => this.checkBackend(), CONFIG.POLL_INTERVAL);
      }
    } catch (err) {
      this.setStatus('error', 'Backend offline — start the server first');
      this.updateBackendCard(null, false);
      setTimeout(() => this.checkBackend(), CONFIG.POLL_INTERVAL);
    }
  },

  setStatus(type, text) {
    const dot = this.el['status-dot'];
    const label = this.el['status-text'];
    if (!dot || !label) return;
    dot.className = 'status-dot ' + type;
    label.textContent = text;
  },

  updateBackendCard(status, ok) {
    const card = this.el['backend-status-card'];
    if (!card) return;
    if (!status) {
      card.innerHTML = `<span class="backend-indicator error">⚠️ Backend Offline</span>
        <span class="backend-hint">Run: <code>python main.py</code> in the backend folder</span>`;
      return;
    }
    if (ok) {
      card.innerHTML = `
        <span class="backend-indicator ready">🟢 Backend Ready</span>
        <span class="backend-hint">${status.chunks_indexed} chunks · ${status.embedding_model} · ${status.llm_model}</span>`;
    } else {
      card.innerHTML = `
        <span class="backend-indicator warn">🟡 Backend Loading…</span>
        <span class="backend-hint">${status.gemini_configured ? 'Embedding model loading…' : '⚠️ Set GEMINI_API_KEY in backend/.env'}</span>`;
    }
  },

  // ── Sidebar ──────────────────────────────────
  async loadDocuments() {
    try {
      const data = await API.documents();
      this.renderSidebar(data.documents);
    } catch {
      // Backend not yet up — sidebar will populate after retry
    }
  },

  renderSidebar(docs) {
    const container = this.el['sidebar-docs-list'];
    if (!container) return;

    const categories = {};
    for (const doc of docs) {
      if (!categories[doc.category]) categories[doc.category] = [];
      categories[doc.category].push(doc);
    }

    let html = '';
    for (const [cat, catDocs] of Object.entries(categories)) {
      html += `<div class="sidebar-category-label">${cat}</div>`;
      for (const doc of catDocs) {
        const sdgLabel = doc.sdg > 0 ? `SDG ${doc.sdg}` : 'Program';
        html += `
          <div class="doc-item" data-doc-title="${doc.title}" title="${doc.title}">
            <span class="doc-icon">${doc.icon}</span>
            <div class="doc-info">
              <div class="doc-title">${doc.title}</div>
              <div class="doc-meta">
                <span class="sdg-dot" style="background:${doc.color}"></span>
                ${sdgLabel} · ${doc.chunk_count} sections
              </div>
            </div>
          </div>`;
      }
    }
    container.innerHTML = html;

    container.querySelectorAll('.doc-item').forEach(item => {
      item.addEventListener('click', () => {
        container.querySelectorAll('.doc-item').forEach(d => d.classList.remove('active'));
        item.classList.add('active');
        const title = item.dataset.docTitle;
        this.el['chat-input'].value = `Tell me about "${title}" — what do citizens need to know?`;
        this.el['chat-input'].focus();
      });
    });
  },

  filterSidebar(query) {
    const q = query.toLowerCase();
    document.querySelectorAll('.doc-item').forEach(item => {
      item.style.display = item.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
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

  autoResize() {
    const ta = this.el['chat-input'];
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  },

  // ── Chat ────────────────────────────────────
  async handleSend() {
    const input = this.el['chat-input'];
    const question = input?.value?.trim();
    if (!question || this.isLoading) return;

    if (!this.backendReady) {
      this.showToast('⏳ Backend is not ready yet. Please wait…', 'error');
      return;
    }

    if (!this.chatStarted) this.startChat();
    if (!this.currentChatId) this.createChat(question);

    input.value = '';
    input.style.height = 'auto';

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    this.renderUserMessageDOM(question, time);
    this.saveMessageToCurrentChat({ role: 'user', text: question, time });

    const typingId = this.appendTyping();
    this.setLoading(true);

    try {
      const result = await API.chat(question);
      this.removeTyping(typingId);
      this.renderBotMessageDOM(result.answer, result.sources, result.chunks_retrieved, time);
      this.saveMessageToCurrentChat({
        role: 'bot',
        text: result.answer,
        sources: result.sources,
        chunksRetrieved: result.chunks_retrieved,
        time
      });
    } catch (err) {
      this.removeTyping(typingId);
      const msg = err.message?.includes('503')
        ? 'The RAG engine is not ready. Check that GEMINI_API_KEY is set in backend/.env and the server is running.'
        : `Error: ${err.message}`;
      this.renderBotMessageDOM(msg, [], 0, time);
      this.saveMessageToCurrentChat({ role: 'bot', text: msg, sources: [], chunksRetrieved: 0, time });
      this.showToast('❌ ' + msg.substring(0, 70), 'error');
    } finally {
      this.setLoading(false);
    }
  },

  startChat() {
    this.chatStarted = true;
    const welcome = document.getElementById('welcome-screen');
    const msgs = this.el['messages-container'];
    if (welcome) welcome.style.display = 'none';
    if (msgs) msgs.style.display = 'flex';
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

  renderBotMessageDOM(text, sources = [], chunksRetrieved = 0, timeStr) {
    const msgs = this.el['messages-container'];
    if (!msgs) return;
    const time = timeStr || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const formatted = formatText(text);

    const ragSteps = chunksRetrieved > 0 ? `
      <div class="rag-steps">
        <span class="rag-step"><span class="rag-step-dot"></span>Query</span>
        <span class="rag-arrow">→</span>
        <span class="rag-step"><span class="rag-step-dot"></span>${chunksRetrieved} chunks retrieved</span>
        <span class="rag-arrow">→</span>
        <span class="rag-step"><span class="rag-step-dot"></span>Gemini generated</span>
      </div>` : '';

    const sourcesHtml = sources && sources.length > 0 ? `
      <div class="message-sources">
        <div class="sources-label">📎 Sources</div>
        ${sources.map(s => `
          <div class="source-card" title="${escapeHtml(s.excerpt || '')}">
            <span class="source-card-icon">${s.icon || '📄'}</span>
            <div class="source-card-info">
              <div class="source-card-title">${escapeHtml(s.title || '')}</div>
              <div class="source-card-relevance">
                Relevance: ${Math.round((s.relevance || 0) * 100)}% · ${s.category || ''}
                ${s.sdg > 0 ? `· SDG ${s.sdg}` : ''}
              </div>
            </div>
          </div>`).join('')}
      </div>` : '';

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

  removeTyping(id) { document.getElementById(id)?.remove(); },

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
    this._toastTimer = setTimeout(() => { toast.className = ''; }, 4500);
  },
};

// ─────────────────────────────────────────────
// 4. HELPERS
// ─────────────────────────────────────────────
function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatText(text) {
  let html = escapeHtml(text);
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/^[-•]\s+(.+)$/gm, '<li>$1</li>');
  html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, m => `<ul>${m}</ul>`);
  html = html.split(/\n\n+/).map(p => {
    p = p.trim();
    if (!p || p.startsWith('<ul>') || p.startsWith('<li>')) return p;
    return `<p>${p.replace(/\n/g, '<br>')}</p>`;
  }).join('');
  return html;
}

// ─────────────────────────────────────────────
// 5. BOOT
// ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  UI.init();
  console.log('[CivicAI] 🌿 Full-stack frontend initialized → backend:', CONFIG.BACKEND_URL);
});
