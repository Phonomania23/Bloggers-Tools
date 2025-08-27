// /js/messenger.js - внутренний мессенджер (объединенная версия)
(() => {
  const LS_KEY_THREADS = "msgThreadsV2";
  const LS_KEY_TEMPLATES = "msgTemplatesV2";

  const state = {
    threads: {},
    templates: [
      { 
        id: "hello", 
        name: "Первое обращение", 
        text: "Здравствуйте, {{name}}! Меня зовут {{myName}}, я представляю {{company}}. Хотим предложить сотрудничество." 
      },
      { 
        id: "brief", 
        name: "Отправка брифа", 
        text: "Прикладываю бриф по нашему проекту. Дедлайн: {{deadline}}. Бюджет: {{budget}} руб." 
      },
      { 
        id: "remind", 
        name: "Напоминание", 
        text: "Добрый день, {{name}}! Напоминаем о нашем предложении. Будем рады обсудить детали." 
      },
      { 
        id: "approval", 
        name: "Одобрение", 
        text: "Спасибо за материал, {{name}}! Комментарии: {{comments}}. Ждём обновлённую версию." 
      }
    ]
  };

  function load() {
    try {
      const threads = JSON.parse(localStorage.getItem(LS_KEY_THREADS) || "{}");
      const templates = JSON.parse(localStorage.getItem(LS_KEY_TEMPLATES) || "[]");
      
      state.threads = threads;
      if (templates.length > 0) state.templates = templates;
    } catch (e) {
      console.error("Error loading messenger data:", e);
    }
  }

  function save() {
    try {
      localStorage.setItem(LS_KEY_THREADS, JSON.stringify(state.threads));
      localStorage.setItem(LS_KEY_TEMPLATES, JSON.stringify(state.templates));
    } catch (e) {
      console.error("Error saving messenger data:", e);
    }
  }

  function injectUI() {
    if (document.getElementById("msg-fab")) return;

    const css = `
      #msg-fab {
        position: fixed;
        right: 20px;
        bottom: 20px;
        z-index: 10000;
        background: #2196F3;
        color: white;
        border: none;
        border-radius: 50%;
        width: 60px;
        height: 60px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 20px rgba(33,150,243,0.3);
        font-size: 24px;
        transition: all 0.3s ease;
      }
      #msg-fab:hover {
        transform: scale(1.05);
        box-shadow: 0 6px 25px rgba(33,150,243,0.4);
      }
      #msg-panel {
        position: fixed;
        right: 20px;
        bottom: 90px;
        width: 400px;
        height: 500px;
        background: #fff;
        border: 1px solid #e0e0e0;
        border-radius: 12px;
        box-shadow: 0 12px 40px rgba(0,0,0,0.15);
        display: none;
        flex-direction: column;
        overflow: hidden;
        z-index: 10001;
      }
      #msg-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px;
        border-bottom: 1px solid #eee;
        background: #f8f9fa;
      }
      #msg-conversations {
        width: 120px;
        border-right: 1px solid #eee;
        overflow-y: auto;
        background: #fafafa;
      }
      .msg-conv-item {
        padding: 12px;
        border-bottom: 1px solid #f0f0f0;
        cursor: pointer;
        transition: background 0.2s;
      }
      .msg-conv-item:hover {
        background: #f0f0f0;
      }
      .msg-conv-item.active {
        background: #e3f2fd;
        border-right: 3px solid #2196F3;
      }
      .msg-conv-name {
        font-weight: 500;
        font-size: 13px;
        margin-bottom: 4px;
      }
      .msg-conv-time {
        font-size: 11px;
        color: #666;
      }
      .msg-conv-badge {
        background: #e53935;
        color: white;
        border-radius: 50%;
        width: 18px;
        height: 18px;
        font-size: 11px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        margin-left: 4px;
      }
      #msg-content {
        flex: 1;
        display: flex;
        flex-direction: column;
      }
      #msg-history {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        background: #fafafa;
      }
      .msg-bubble {
        max-width: 80%;
        padding: 12px 16px;
        margin: 8px 0;
        border-radius: 18px;
        background: #fff;
        border: 1px solid #e0e0e0;
        word-wrap: break-word;
      }
      .msg-bubble.me {
        margin-left: auto;
        background: #e3f2fd;
        border-color: #bbdefb;
      }
      .msg-bubble-time {
        font-size: 11px;
        color: #666;
        margin-top: 4px;
        text-align: right;
      }
      #msg-input-area {
        border-top: 1px solid #eee;
        background: #fff;
      }
      #msg-templates {
        display: flex;
        gap: 8px;
        padding: 12px;
        overflow-x: auto;
        border-bottom: 1px solid #eee;
      }
      #msg-input-container {
        display: flex;
        gap: 8px;
        padding: 12px;
      }
      #msg-input {
        flex: 1;
        padding: 12px;
        border: 1px solid #ddd;
        border-radius: 24px;
        resize: none;
        font-family: inherit;
        font-size: 14px;
        line-height: 1.4;
        max-height: 120px;
      }
      #msg-send {
        align-self: flex-end;
        padding: 12px 20px;
        border-radius: 24px;
      }
      .msg-empty {
        text-align: center;
        color: #666;
        padding: 40px 20px;
      }
    `;

    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);

    const fab = document.createElement("button");
    fab.id = "msg-fab";
    fab.textContent = "💬";
    fab.title = "Мессенджер";
    document.body.appendChild(fab);

    const panel = document.createElement("div");
    panel.id = "msg-panel";
    panel.innerHTML = `
      <div id="msg-header">
        <strong>Сообщения</strong>
        <button id="msg-close" class="btn btn-secondary btn-sm">✕</button>
      </div>
      <div style="display: flex; flex: 1; overflow: hidden;">
        <div id="msg-conversations"></div>
        <div id="msg-content">
          <div id="msg-history">
            <div class="msg-empty">Выберите диалог для общения</div>
          </div>
          <div id="msg-input-area">
            <div id="msg-templates"></div>
            <div id="msg-input-container">
              <textarea id="msg-input" placeholder="Напишите сообщение..." rows="1"></textarea>
              <button id="msg-send" class="btn btn-primary">Отправить</button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(panel);

    // Обработчики событий
    fab.addEventListener("click", () => {
      panel.style.display = panel.style.display === "flex" ? "none" : "flex";
      if (panel.style.display === "flex") {
        renderConversations();
      }
    });

    document.getElementById("msg-close").addEventListener("click", () => {
      panel.style.display = "none";
    });

    document.getElementById("msg-send").addEventListener("click", sendMessage);
    
    document.getElementById("msg-input").addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
      // Автоматическое изменение высоты
      setTimeout(() => {
        e.target.style.height = 'auto';
        e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
      }, 0);
    });

    // Перетаскивание панели
    let isDragging = false;
    let startX, startY;
    
    panel.addEventListener('mousedown', (e) => {
      if (e.target.closest('#msg-header')) {
        isDragging = true;
        startX = e.clientX - panel.getBoundingClientRect().left;
        startY = e.clientY - panel.getBoundingClientRect().top;
        panel.style.cursor = 'grabbing';
      }
    });

    document.addEventListener('mousemove', (e) => {
      if (isDragging) {
        panel.style.left = (e.clientX - startX) + 'px';
        panel.style.top = (e.clientY - startY) + 'px';
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';
      }
    });

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        panel.style.cursor = '';
      }
    });
  }

  function ensureThread(id, title = "Новый диалог") {
    if (!state.threads[id]) {
      state.threads[id] = {
        id: id,
        title: title,
        messages: [],
        unread: 0,
        lastActivity: Date.now(),
        participants: [
          { id: "me", name: "Вы", role: "brand" },
          { id: id.replace('blogger-', ''), name: title, role: "blogger" }
        ]
      };
      save();
    }
    return state.threads[id];
  }

  function renderConversations() {
    const convsEl = document.getElementById("msg-conversations");
    const conversations = Object.values(state.threads).sort((a, b) => b.lastActivity - a.lastActivity);
    
    convsEl.innerHTML = conversations.map(conv => `
      <div class="msg-conv-item ${conv.id === window.currentConversationId ? 'active' : ''}" data-id="${conv.id}">
        <div class="msg-conv-name">${escapeHTML(conv.title)}</div>
        <div class="msg-conv-time">${formatTime(conv.lastActivity)}</div>
        ${conv.unread > 0 ? `<span class="msg-conv-badge">${conv.unread}</span>` : ''}
      </div>
    `).join("") || `<div class="msg-empty" style="padding:20px">Нет диалогов</div>`;

    convsEl.querySelectorAll(".msg-conv-item").forEach(item => {
      item.addEventListener("click", () => openConversation(item.dataset.id));
    });
  }

  function openConversation(threadId) {
    window.currentConversationId = threadId;
    const thread = ensureThread(threadId);
    const historyEl = document.getElementById("msg-history");
    const templatesEl = document.getElementById("msg-templates");

    // Обновляем заголовок
    document.querySelector("#msg-header strong").textContent = thread.title;

    // Рендерим историю сообщений
    historyEl.innerHTML = thread.messages.map(msg => `
      <div class="msg-bubble ${msg.author === 'me' ? 'me' : ''}">
        <div>${escapeHTML(msg.text)}</div>
        <div class="msg-bubble-time">${formatTime(msg.ts)}</div>
      </div>
    `).join("") || `<div class="msg-empty">Начните диалог</div>`;

    historyEl.scrollTop = historyEl.scrollHeight;

    // Рендерим шаблоны
    templatesEl.innerHTML = state.templates.map(tpl => `
      <button class="btn btn-secondary btn-sm" data-id="${tpl.id}">
        ${escapeHTML(tpl.name)}
      </button>
    `).join("");

    templatesEl.querySelectorAll("button").forEach(btn => {
      btn.addEventListener("click", () => {
        const peer = thread.participants.find(p => p.id !== "me");
        const funnel = JSON.parse(localStorage.getItem("dealFunnelV2") || "{}");
        
        const vars = {
          name: peer?.name || "блогер",
          myName: "Менеджер",
          company: "Bloggers.tools",
          deadline: funnel.brief?.deadline || new Date(Date.now() + 7 * 86400000).toLocaleDateString(),
          budget: funnel.brief?.budget ? `${funnel.brief.budget} руб.` : "не указан",
          comments: "",
          topic: "сотрудничества"
        };

        const input = document.getElementById("msg-input");
        input.value = renderTemplate(tpl.text, vars);
        input.focus();
        input.style.height = Math.min(input.scrollHeight, 120) + 'px';
      });
    });

    // Сбрасываем непрочитанные
    if (thread.unread > 0) {
      thread.unread = 0;
      save();
      renderConversations();
    }

    // Подсвечиваем активный диалог
    document.querySelectorAll(".msg-conv-item").forEach(item => {
      item.classList.toggle("active", item.dataset.id === threadId);
    });
  }

  function sendMessage() {
    const input = document.getElementById("msg-input");
    const text = input.value.trim();
    
    if (!text || !window.currentConversationId) return;

    const thread = ensureThread(window.currentConversationId);
    const message = {
      id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      author: "me",
      text: text,
      ts: Date.now(),
      status: "sent"
    };

    thread.messages.push(message);
    thread.lastActivity = Date.now();
    save();

    input.value = "";
    input.style.height = 'auto';
    renderConversation();

    // Имитация ответа
    setTimeout(() => {
      const response = {
        id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        author: "peer",
        text: getRandomResponse(),
        ts: Date.now(),
        status: "delivered"
      };

      thread.messages.push(response);
      thread.unread += 1;
      thread.lastActivity = Date.now();
      save();

      renderConversation();
      renderConversations();

      // Уведомление
      if (window.Notifier) {
        const peer = thread.participants.find(p => p.id !== "me");
        Notifier.push({
          type: "info",
          title: `Новое сообщение от ${peer?.name || "собеседника"}`,
          text: response.text
        });
      }
    }, 2000 + Math.random() * 3000);
  }

  function renderConversation() {
    if (!window.currentConversationId) return;
    const thread = state.threads[window.currentConversationId];
    if (!thread) return;

    const historyEl = document.getElementById("msg-history");
    historyEl.innerHTML = thread.messages.map(msg => `
      <div class="msg-bubble ${msg.author === 'me' ? 'me' : ''}">
        <div>${escapeHTML(msg.text)}</div>
        <div class="msg-bubble-time">${formatTime(msg.ts)}</div>
      </div>
    `).join("");

    historyEl.scrollTop = historyEl.scrollHeight;
  }

  function getRandomResponse() {
    const responses = [
      "Спасибо за информацию! Будем ждать деталей.",
      "Интересное предложение! Давайте обсудим.",
      "Получил, спасибо! Изучу и отвечу.",
      "Отлично! Жду дальнейших инструкций.",
      "Благодарю за оперативность!",
      "Принято к сведению 👍",
      "Отличные новости! Продолжаем работу.",
      "Всё понял, спасибо за уточнения!",
      "Замечательно! Жду следующих шагов.",
      "Супер! Благодарю за сотрудничество."
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  function renderTemplate(template, variables) {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] || match;
    });
  }

  function escapeHTML(str) {
    return String(str).replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
  }

  function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'только что';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} мин назад`;
    
    return date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  }

  // Публичный API
  function openWith(participant) {
    const threadId = `blogger-${participant.id}`;
    ensureThread(threadId, participant.name);
    
    const panel = document.getElementById("msg-panel");
    panel.style.display = "flex";
    
    openConversation(threadId);
    renderConversations();
  }

  // Инициализация
  load();
  document.addEventListener("DOMContentLoaded", () => {
    injectUI();
    // Создаем общий чат по умолчанию
    ensureThread("general", "Общий чат");
  });

  // Глобальный API
  window.Messenger = {
    openWith,
    open: () => {
      const panel = document.getElementById("msg-panel");
      panel.style.display = "flex";
      renderConversations();
    },
    getTemplates: () => [...state.templates],
    addTemplate: (template) => {
      state.templates.push(template);
      save();
    },
    getConversations: () => Object.values(state.threads)
  };
})();