// /js/notify.js - система уведомлений (объединенная версия)
(() => {
  const LS_KEY_NOTIFICATIONS = "notifyCenterV2";
  const LS_KEY_PREFS = "notifyPrefsV2";
  
  const state = {
    notifications: [],
    prefs: {
      inapp: true,
      email: false,
      telegram: false,
      criticalOnly: false,
      emailTo: "",
      telegramChatId: ""
    }
  };

  // Загрузка из localStorage
  function load() {
    try {
      state.notifications = JSON.parse(localStorage.getItem(LS_KEY_NOTIFICATIONS) || "[]");
      const savedPrefs = JSON.parse(localStorage.getItem(LS_KEY_PREFS) || "{}");
      state.prefs = { ...state.prefs, ...savedPrefs };
    } catch (e) {
      console.error("Error loading notifications:", e);
    }
  }

  // Сохранение в localStorage
  function save() {
    try {
      localStorage.setItem(LS_KEY_NOTIFICATIONS, JSON.stringify(state.notifications));
      localStorage.setItem(LS_KEY_PREFS, JSON.stringify(state.prefs));
    } catch (e) {
      console.error("Error saving notifications:", e);
    }
  }

  // Создание UI
  function injectUI() {
    if (document.getElementById("ntf-root")) return;

    const css = `
      #ntf-bell {
        position: fixed;
        right: 16px;
        top: 16px;
        z-index: 10000;
        background: #fff;
        border: 1px solid #e0e0e0;
        border-radius: 50%;
        width: 48px;
        height: 48px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 16px rgba(0,0,0,.08);
      }
      #ntf-bell .badge {
        position: absolute;
        top: -5px;
        right: -5px;
        background: #e53935;
        color: #fff;
        border-radius: 50%;
        width: 18px;
        height: 18px;
        font-size: 11px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      #ntf-panel {
        position: fixed;
        right: 16px;
        top: 70px;
        width: 380px;
        max-height: 60vh;
        overflow: auto;
        background: #fff;
        border: 1px solid #e0e0e0;
        border-radius: 12px;
        box-shadow: 0 12px 32px rgba(0,0,0,.12);
        display: none;
        z-index: 10001;
      }
      #ntf-panel header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px;
        border-bottom: 1px solid #eee;
        background: #f8f9fa;
        font-weight: 600;
      }
      .ntf-item {
        padding: 16px;
        border-bottom: 1px solid #f5f5f5;
        cursor: pointer;
        transition: background 0.2s;
      }
      .ntf-item:hover {
        background: #f8f9fa;
      }
      .ntf-item:last-child {
        border-bottom: none;
      }
      .ntf-item.unread {
        background: #f0f7ff;
        border-left: 3px solid #2196F3;
      }
      .ntf-item.critical {
        background: #fff5f5;
        border-left: 3px solid #f44336;
      }
      .ntf-item.success {
        background: #f6fff8;
        border-left: 3px solid #4caf50;
      }
      .ntf-item small {
        color: #666;
        display: block;
        margin-top: 8px;
        font-size: 12px;
      }
      #ntf-panel .actions {
        display: flex;
        gap: 8px;
        padding: 12px;
        border-top: 1px solid #eee;
        background: #fafafa;
      }
      .ntf-settings {
        padding: 16px;
        border-top: 1px solid #eee;
        display: grid;
        gap: 16px;
        background: #fafafa;
      }
      .ntf-settings h4 {
        margin: 0 0 12px 0;
        font-size: 16px;
      }
      .ntf-settings label {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        margin-bottom: 8px;
      }
      .ntf-settings input[type="email"],
      .ntf-settings input[type="text"] {
        padding: 8px 12px;
        border: 1px solid #ddd;
        border-radius: 6px;
        width: 100%;
        font-size: 14px;
      }
      .ntf-settings .section {
        background: #fff;
        padding: 16px;
        border-radius: 8px;
        border: 1px solid #eee;
      }
      .ntf-toast-wrap {
        position: fixed;
        right: 16px;
        top: 16px;
        z-index: 10002;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .ntf-toast {
        background: #333;
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        max-width: 320px;
        animation: toastSlideIn 0.3s ease;
      }
      .ntf-toast.success {
        background: #4caf50;
      }
      .ntf-toast.warning {
        background: #ff9800;
      }
      .ntf-toast.critical {
        background: #f44336;
      }
      @keyframes toastSlideIn {
        from {
          opacity: 0;
          transform: translateX(100%);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
    `;

    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);

    const root = document.createElement("div");
    root.id = "ntf-root";
    root.innerHTML = `
      <button id="ntf-bell" title="Уведомления">
        🔔
        <span class="badge" style="display:none">0</span>
      </button>
      <div id="ntf-panel" role="dialog" aria-label="Уведомления">
        <header>
          <strong>Уведомления</strong>
          <div class="actions">
            <button id="ntf-mark-all" class="btn btn-secondary btn-sm">Прочитать все</button>
            <button id="ntf-settings-btn" class="btn btn-secondary btn-sm">Настройки</button>
          </div>
        </header>
        <div id="ntf-list"></div>
        <div class="ntf-settings" id="ntf-settings" style="display:none"></div>
      </div>
    `;

    document.body.appendChild(root);

    // Обработчики событий
    document.getElementById("ntf-bell").addEventListener("click", togglePanel);
    document.getElementById("ntf-mark-all").addEventListener("click", markAllRead);
    document.getElementById("ntf-settings-btn").addEventListener("click", toggleSettings);
  }

  function togglePanel() {
    const panel = document.getElementById("ntf-panel");
    panel.style.display = panel.style.display === "block" ? "none" : "block";
    if (panel.style.display === "block") {
      render();
    }
  }

  function toggleSettings() {
    const settings = document.getElementById("ntf-settings");
    const isVisible = settings.style.display === "block";
    settings.style.display = isVisible ? "none" : "block";
    if (!isVisible && settings.innerHTML.trim() === "") {
      renderSettings();
    }
  }

  function markAllRead() {
    state.notifications = state.notifications.map(n => ({ ...n, read: true }));
    save();
    render();
    showToast("Все уведомления прочитаны", "success");
  }

  function renderSettings() {
    const settings = document.getElementById("ntf-settings");
    settings.innerHTML = `
      <h4>Настройки уведомлений</h4>
      
      <div class="section">
        <label>
          <input type="checkbox" id="ntf-inapp" ${state.prefs.inapp ? 'checked' : ''}/>
          In-app уведомления
        </label>
        <label>
          <input type="checkbox" id="ntf-critical-only" ${state.prefs.criticalOnly ? 'checked' : ''}/>
          Только критичные уведомления
        </label>
      </div>

      <div class="section">
        <label>
          <input type="checkbox" id="ntf-email" ${state.prefs.email ? 'checked' : ''}/>
          Email уведомления
        </label>
        <input type="email" id="ntf-email-address" placeholder="your@email.com" 
               value="${escapeHTML(state.prefs.emailTo)}" 
               ${!state.prefs.email ? 'disabled' : ''}
               style="margin: 8px 0">
      </div>

      <div class="section">
        <label>
          <input type="checkbox" id="ntf-telegram" ${state.prefs.telegram ? 'checked' : ''}/>
          Telegram уведомления
        </label>
        <input type="text" id="ntf-telegram-chat" placeholder="Chat ID" 
               value="${escapeHTML(state.prefs.telegramChatId)}" 
               ${!state.prefs.telegram ? 'disabled' : ''}
               style="margin: 8px 0">
      </div>

      <button id="ntf-save-prefs" class="btn btn-primary">Сохранить настройки</button>
    `;

    // Включаем/выключаем поля в зависимости от чекбоксов
    document.getElementById("ntf-email").addEventListener("change", (e) => {
      document.getElementById("ntf-email-address").disabled = !e.target.checked;
    });

    document.getElementById("ntf-telegram").addEventListener("change", (e) => {
      document.getElementById("ntf-telegram-chat").disabled = !e.target.checked;
    });

    document.getElementById("ntf-save-prefs").addEventListener("click", savePreferences);
  }

  function savePreferences() {
    state.prefs.inapp = document.getElementById("ntf-inapp").checked;
    state.prefs.criticalOnly = document.getElementById("ntf-critical-only").checked;
    state.prefs.email = document.getElementById("ntf-email").checked;
    state.prefs.emailTo = document.getElementById("ntf-email-address").value.trim();
    state.prefs.telegram = document.getElementById("ntf-telegram").checked;
    state.prefs.telegramChatId = document.getElementById("ntf-telegram-chat").value.trim();
    
    save();
    showToast("Настройки сохранены", "success");
    toggleSettings();
  }

  function render() {
    const list = document.getElementById("ntf-list");
    const badge = document.querySelector("#ntf-bell .badge");
    
    if (!list || !badge) return;

    const unreadCount = state.notifications.filter(n => !n.read).length;
    badge.textContent = unreadCount;
    badge.style.display = unreadCount > 0 ? "flex" : "none";

    list.innerHTML = state.notifications.slice().reverse().map(notification => `
      <div class="ntf-item ${notification.read ? '' : 'unread'} ${notification.type || ''}" 
           data-id="${notification.id}">
        <div><strong>${escapeHTML(notification.title || '')}</strong></div>
        <div>${escapeHTML(notification.text || '')}</div>
        <small>${formatDate(notification.ts)}</small>
      </div>
    `).join('') || '<div class="ntf-item"><div class="muted">Нет уведомлений</div></div>';

    // Обработчики кликов для уведомлений
    list.querySelectorAll(".ntf-item").forEach(item => {
      item.addEventListener("click", () => {
        const id = item.dataset.id;
        const notification = state.notifications.find(n => n.id === id);
        if (notification && !notification.read) {
          notification.read = true;
          save();
          render();
        }
      });
    });
  }

  function showToast(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = `ntf-toast ${type}`;
    toast.textContent = message;
    
    const toastWrap = document.querySelector(".ntf-toast-wrap") || document.createElement("div");
    if (!document.querySelector(".ntf-toast-wrap")) {
      toastWrap.className = "ntf-toast-wrap";
      document.body.appendChild(toastWrap);
    }
    
    toastWrap.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transition = "opacity 0.3s";
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  async function push(notification) {
    const item = {
      id: Math.random().toString(36).substr(2, 9),
      type: notification.type || "info",
      title: notification.title || "",
      text: notification.text || "",
      ts: Date.now(),
      read: false
    };

    state.notifications.push(item);
    save();
    render();

    // Отправка по каналам
    const isCritical = item.type === "critical";
    
    if (state.prefs.email && (!state.prefs.criticalOnly || isCritical) && state.prefs.emailTo) {
      await sendEmail(item);
    }

    if (state.prefs.telegram && (!state.prefs.criticalOnly || isCritical) && state.prefs.telegramChatId) {
      await sendTelegram(item);
    }

    // Показ toast
    if (state.prefs.inapp && (!state.prefs.criticalOnly || isCritical)) {
      showToast(`${item.title}: ${item.text}`, item.type);
    }
  }

  async function sendEmail(notification) {
    try {
      const response = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: state.prefs.emailTo,
          subject: `[Bloggers.tools] ${notification.title}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">${escapeHTML(notification.title)}</h2>
              <p style="color: #666; line-height: 1.6;">${escapeHTML(notification.text)}</p>
              <p style="color: #999; font-size: 12px; margin-top: 20px;">
                Sent from Bloggers.tools • ${new Date().toLocaleDateString()}
              </p>
            </div>
          `
        })
      });
      
      if (!response.ok) throw new Error("Email send failed");
    } catch (error) {
      console.error("Email error:", error);
    }
  }

  async function sendTelegram(notification) {
    try {
      const response = await fetch("/api/telegram/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `*${notification.title}*\n${notification.text}\n\n_${new Date().toLocaleDateString()}_`,
          chatId: state.prefs.telegramChatId
        })
      });
      
      if (!response.ok) throw new Error("Telegram send failed");
    } catch (error) {
      console.error("Telegram error:", error);
    }
  }

  function escapeHTML(str) {
    return String(str).replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
  }

  function formatDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'только что';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} мин назад`;
    if (diff < 86400000) return date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    return date.toLocaleDateString();
  }

  // Автоматические уведомления для сделок
  function setupDealMonitoring() {
    let lastStep = null;
    
    setInterval(() => {
      try {
        const funnel = JSON.parse(localStorage.getItem("dealFunnelV2") || "{}");
        
        // Уведомление о смене этапа
        if (funnel.step && funnel.step !== lastStep) {
          lastStep = funnel.step;
          push({
            type: "info",
            title: "Переход на новый этап",
            text: `Этап ${funnel.step}: ${getStepName(funnel.step)}`
          });
        }
        
        // Уведомление о дедлайне брифа
        if (funnel.brief?.deadline) {
          const deadline = new Date(funnel.brief.deadline);
          const now = new Date();
          const hoursLeft = (deadline - now) / 3600000;
          
          if (hoursLeft > 0 && hoursLeft < 24) {
            push({
              type: "warning",
              title: "Приближается дедлайн",
              text: `До дедлайна брифа осталось ${Math.ceil(hoursLeft)} часов`
            });
          }
        }
      } catch (error) {
        console.error("Deal monitoring error:", error);
      }
    }, 30000);
  }

  function getStepName(step) {
    const steps = {
      1: "Подбор блогеров",
      2: "Заполнение брифа", 
      3: "Привязка почты",
      4: "Рассылка предложений",
      5: "Подписание договора",
      6: "Оплата",
      7: "Съёмка контента",
      8: "Одобрение",
      9: "Выплата"
    };
    return steps[step] || `Этап ${step}`;
  }

  // Инициализация
  load();
  document.addEventListener("DOMContentLoaded", () => {
    injectUI();
    render();
    setupDealMonitoring();
  });

  // Публичный API
  window.Notifier = {
    push,
    markAllRead: () => {
      state.notifications = state.notifications.map(n => ({ ...n, read: true }));
      save();
      render();
    },
    getNotifications: () => [...state.notifications],
    clearNotifications: () => {
      state.notifications = [];
      save();
      render();
    },
    getPreferences: () => ({ ...state.prefs }),
    setPreferences: (newPrefs) => {
      state.prefs = { ...state.prefs, ...newPrefs };
      save();
    }
  };
})();