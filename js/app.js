// app.js — строгая последовательность 9 этапов с валидациями, расчётами и идемпотентностью
// Ключи хранилища
const DEAL_KEY   = "dealState";          // состояние текущей сделки
const PICKED_KEY = "selectedBloggers";   // массив ID блогеров, выбранных на agency.html

// ====== Утилиты хранения ======
function readState() {
  try { return JSON.parse(localStorage.getItem(DEAL_KEY) || "{}"); } catch { return {}; }
}
function writeState(st) {
  try { localStorage.setItem(DEAL_KEY, JSON.stringify(st)); } catch {}
}

// ====== Состояние по умолчанию ======
function defaultState() {
  return {
    stage: 1,
    bloggers: [], // выбранные id
    brief: { goal: "", budget: "", deadline: "" },
    email: { linked: false, account: "" },
    outreach: { sent: false, responded: [] },
    contract: { signed: false },
    payment: { reserved: false, amount: 0, currency: "RUB" },
    shoot: { uploaded: false, fileName: "" },
    approval: { link: "", result: "", comment: "" }, // result: approved | needs_changes | ""
    payout: { paid: false, amount: 0, paidAt: null }
  };
}

// ====== Валидации/хелперы ======
const $  = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

function briefValid(b) {
  if (!b) return false;
  const goalOk   = (b.goal || "").trim().length >= 5;
  const budgetOk = Number(b.budget) > 0;
  const dateOk   = !!b.deadline;
  return goalOk && budgetOk && dateOk;
}
function emailValid(e) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((e || "").trim());
}
function validVideoUrl(u) {
  try { new URL(u); } catch { return false; }
  // При желании ограничить площадками:
  // return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be|tiktok\.com)\//i.test(u);
  return true;
}

// Тосты вместо alert()
function showToast(msg, kind = "info") {
  let box = document.getElementById("toastBox");
  if (!box) {
    box = document.createElement("div");
    box.id = "toastBox";
    box.style.position = "fixed";
    box.style.zIndex = "9999";
    box.style.right = "16px";
    box.style.bottom = "16px";
    box.style.display = "flex";
    box.style.flexDirection = "column";
    box.style.gap = "8px";
    document.body.appendChild(box);
  }
  const t = document.createElement("div");
  t.textContent = msg;
  t.style.padding = "10px 12px";
  t.style.borderRadius = "10px";
  t.style.boxShadow = "0 2px 10px rgba(0,0,0,.12)";
  t.style.color = "#111";
  t.style.background = kind === "error" ? "#ffe3e3" : kind === "success" ? "#e7f7e7" : "#fff";
  t.style.border = "1px solid " + (kind === "error" ? "#ffbdbd" : kind === "success" ? "#bfe9bf" : "#eee");
  box.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}

// Вычисляем «активный» этап исходя из условий
function computeActiveStep(st) {
  if (!st.bloggers || st.bloggers.length === 0) return 1;
  if (!briefValid(st.brief)) return 2;
  if (!st.email.linked) return 3;
  if (!st.outreach.sent) return 4;
  if (!(st.outreach.responded && st.outreach.responded.length > 0)) return 5; // нужны ответы
  if (!st.contract.signed) return 5;
  if (!st.payment.reserved) return 6;
  if (!st.shoot.uploaded) return 7;
  if (st.approval.result !== "approved") return 8;
  if (!st.payout.paid) return 9;
  return 9;
}

// Применить визуальное состояние степпера и карточек
function applyUI(st) {
  const active = computeActiveStep(st);

  // Степпер
  $$("#steps .step").forEach(stepEl => {
    const idx = Number(stepEl.dataset.step);
    stepEl.setAttribute("data-active", String(idx === active));
    stepEl.setAttribute("data-done", String(idx < active));
    stepEl.setAttribute("data-disabled", String(idx > active));
  });

  // Блокировка будущих секций
  for (let i = 1; i <= 9; i++) {
    const card = document.getElementById(`stage-${i}`);
    if (!card) continue;
    card.classList.toggle("locked", i > active);
  }

  // Метаданные
  const meta = $("#dealMeta");
  if (meta) meta.textContent = `Этап ${active} из 9`;
}

// Подгрузить блогеров по id → показать в 1 и 4 шагах
async function loadBloggersByIds(ids) {
  try {
    const res = await fetch("json/bloggers.json", { cache: "no-store" });
    const all = await res.json();
    const map = new Map(all.map(x => [String(x.id), x]));
    return ids.map(id => map.get(String(id))).filter(Boolean);
  } catch (e) { console.error(e); return []; }
}

// ====== Инициализация (страницы сделки) ======
(async function init() {
  // Базовое состояние + регидрация
  const st = Object.assign({}, defaultState(), readState());

  // Если пусто — подтянуть выбор с agency.html
  if (!st.bloggers || st.bloggers.length === 0) {
    try {
      const picked = JSON.parse(localStorage.getItem(PICKED_KEY) || "[]");
      if (Array.isArray(picked) && picked.length) st.bloggers = picked;
    } catch {}
    writeState(st);
  }

  // Шапка
  $("#dealTitle") && ($("#dealTitle").textContent = "Сделка");
  applyUI(st);

  // ====== ЭТАП 1: Подбор ======
  const pickedUL = $("#pickedList");
  const pickedItems = await loadBloggersByIds(st.bloggers);
  if (pickedUL) {
    pickedUL.innerHTML = pickedItems.length
      ? pickedItems.map(b => `<li><strong>${b.name}</strong> · <span class="badge">${b.platform}</span> · ${b.category || b.niche || ""}</li>`).join("")
      : `<li class="muted">Пока никого не выбрали. Вернитесь в поиск.</li>`;
  }

  // ====== ЭТАП 2: Бриф ======
  const briefForm     = $("#briefForm");
  const briefGoal     = $("#briefGoal");
  const briefBudget   = $("#briefBudget");
  const briefDeadline = $("#briefDeadline");
  const briefSaved    = $("#briefSaved");

  if (st.brief) {
    briefGoal.value     = st.brief.goal || "";
    briefBudget.value   = st.brief.budget || "";
    briefDeadline.value = st.brief.deadline || "";
  }

  briefForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const goal     = (briefGoal.value || "").trim();
    const budget   = Number(briefBudget.value);
    const deadline = (briefDeadline.value || "").trim();

    if (goal.length < 5)  return showToast("Опишите цель (≥5 символов).", "error");
    if (!(budget > 0))    return showToast("Бюджет должен быть больше 0.", "error");
    if (!deadline)        return showToast("Укажите дедлайн.", "error");

    st.brief = { goal, budget, deadline };
    writeState(st);
    briefSaved.textContent = "Сохранено.";
    setTimeout(() => (briefSaved.textContent = ""), 1600);
    applyUI(st);
  });

  // ====== ЭТАП 3: Привязка почты ======
  const emailAccount = $("#emailAccount");
  const linkEmailBtn = $("#linkEmailBtn");
  const emailStatus  = $("#emailStatus");

  if (st.email?.linked) {
    emailAccount.value = st.email.account || "";
    emailStatus.textContent = `Привязано к: ${st.email.account}`;
  }

  linkEmailBtn?.addEventListener("click", () => {
    const acc = (emailAccount.value || "").trim();
    if (!emailValid(acc)) return showToast("Некорректный email.", "error");
    if (!navigator.onLine) return showToast("Оффлайн режим: привязка недоступна.", "error");

    // Имитация «успешной привязки»
    st.email = { linked: true, account: acc };
    writeState(st);
    emailStatus.textContent = `Привязано к: ${acc}`;
    applyUI(st);
    showToast("Почта привязана.", "success");
  });

  // ====== ЭТАП 4: Отправка писем ======
  const outreachList    = $("#outreachList");
  const sendOutreachBtn = $("#sendOutreachBtn");
  const markRespondBtn  = $("#markRespondBtn");
  const outreachStatus  = $("#outreachStatus");

  const forOutreach = await loadBloggersByIds(st.bloggers);
  if (outreachList) {
    outreachList.innerHTML = forOutreach.length
      ? forOutreach.map(b => `
        <li>
          <label class="row">
            <input type="checkbox" class="respondChk" value="${b.id}" ${st.outreach.responded?.includes(String(b.id)) ? "checked" : ""}/>
            <strong>${b.name}</strong> · <span class="badge">${b.platform}</span>
            <span class="muted">— ответ получен?</span>
          </label>
        </li>`).join("")
      : `<li class="muted">Нет выбранных блогеров.</li>`;
  }

  sendOutreachBtn?.addEventListener("click", () => {
    if (st.outreach.sent) return; // гард от дабл-клика
    st.outreach.sent = true;
    writeState(st);
    outreachStatus.textContent = "Рассылка отправлена (имитация)";
    applyUI(st);
    showToast("Рассылка отправлена.", "success");
  });

  markRespondBtn?.addEventListener("click", () => {
    if (!st.outreach.sent) return showToast("Сначала отправьте письма.", "error");
    const responded = $$(".respondChk").filter(cb => cb.checked).map(cb => String(cb.value));
    st.outreach.responded = responded;
    writeState(st);
    applyUI(st);
    showToast(`Отметили ответы: ${responded.length}.`, "success");
  });

  // ====== ЭТАП 5: Договор ======
  const signContractBtn = $("#signContractBtn");
  const contractStatus  = $("#contractStatus");

  if (st.contract?.signed) contractStatus.textContent = "Договор подписан";

  signContractBtn?.addEventListener("click", () => {
    if (!(st.outreach.responded && st.outreach.responded.length > 0)) {
      return showToast("Подписать можно только при наличии ответивших блогеров.", "error");
    }
    if (st.contract.signed) return; // идемпотентность
    st.contract.signed = true;
    writeState(st);
    contractStatus.textContent = "Договор подписан";
    applyUI(st);
    showToast("Договор подписан.", "success");
  });

  // ====== ЭТАП 6: Оплата (резерв) ======
  const reserveFundsBtn = $("#reserveFundsBtn");
  const paymentStatus   = $("#paymentStatus");

  if (st.payment?.reserved) paymentStatus.textContent = `Средства зарезервированы: ${Number(st.payment.amount).toLocaleString("ru-RU")} ${st.payment.currency}`;

  reserveFundsBtn?.addEventListener("click", () => {
    if (st.payment.reserved) return; // гард
    const budget = Number(st.brief?.budget);
    if (!(budget > 0)) return showToast("Укажите бюджет в брифе.", "error");
    st.payment = { reserved: true, amount: budget, currency: st.payment.currency || "RUB" };
    writeState(st);
    paymentStatus.textContent = `Средства зарезервированы: ${budget.toLocaleString("ru-RU")} ${st.payment.currency}`;
    applyUI(st);
    showToast("Средства зарезервированы.", "success");
  });

  // ====== ЭТАП 7: Съёмка черновика ======
  const uploadBtn   = $("#uploadBtn");
  const uploadInput = $("#uploadInput");
  const shootStatus = $("#shootStatus");

  if (st.shoot?.uploaded) {
    shootStatus.textContent = `Загружено: ${st.shoot.fileName || "черновик"}`;
  }

  uploadBtn?.addEventListener("click", () => uploadInput.click());
  uploadInput?.addEventListener("change", () => {
    if (!uploadInput.files || !uploadInput.files.length) return;
    const name = uploadInput.files[0].name;
    st.shoot.uploaded = true;
    st.shoot.fileName = name;
    writeState(st);
    shootStatus.textContent = `Загружено: ${name}`;
    applyUI(st);
    showToast("Видео загружено.", "success");
  });

  // ====== ЭТАП 8: Одобрение рекламы ======
  const approvalLink  = $("#approvalLink");
  const approvalComment = $("#approvalComment");
  const approveBtn    = $("#approveBtn");
  const requestFixBtn = $("#requestFixBtn");
  const approvalStatus= $("#approvalStatus");

  if (st.approval?.link) approvalLink.value = st.approval.link;
  if (st.approval?.comment) approvalComment.value = st.approval.comment;
  if (st.approval?.result) {
    approvalStatus.textContent = st.approval.result === "approved"
      ? "Реклама принята"
      : `Запрошены правки: ${st.approval.comment || ""}`;
  }

  approveBtn?.addEventListener("click", () => {
    const link = (approvalLink.value || "").trim();
    if (!validVideoUrl(link)) return showToast("Некорректная ссылка на ролик.", "error");
    st.approval = { link, result: "approved", comment: (approvalComment.value || "").trim() };
    writeState(st);
    approvalStatus.textContent = "Реклама принята";
    applyUI(st);
    showToast("Реклама принята. Выплата будет произведена автоматически.", "success");
    payToBlogger(st); // авто-выплата
  });

  requestFixBtn?.addEventListener("click", () => {
    const link = (approvalLink.value || "").trim();
    const comment = (approvalComment.value || "").trim();
    if (!comment) return showToast("Опишите, что поправить.", "error");
    st.approval = { link, result: "needs_changes", comment };
    // Возврат на съёмку
    st.shoot.uploaded = false;
    writeState(st);
    approvalStatus.textContent = `Запрошены правки: ${comment}`;
    applyUI(st);
    showToast("Запрошены правки. Вернулись на этап «Съёмка».", "info");
  });

  // ====== ЭТАП 9: Оплата блогеру (авто после «Принять») ======
  const payoutInfo = $("#payoutInfo");

  function payToBlogger(stateRef) {
    // идемпотентность
    if (stateRef.payout.paid) return;

    // комиссия сервиса (пример)
    const commission = 0.10; // 10%
    const reserved   = Number(stateRef.payment.amount || 0);
    if (!stateRef.payment.reserved || !(reserved > 0)) {
      return showToast("Недостаточно средств для выплаты.", "error");
    }

    const amountToPay = Math.max(0, Math.round(reserved * (1 - commission)));
    if (!(amountToPay > 0)) return showToast("Сумма к выплате должна быть > 0.", "error");

    // помечаем выплату
    stateRef.payout = { paid: true, amount: amountToPay, paidAt: new Date().toISOString() };
    // при желании уменьшить резерв:
    // stateRef.payment.amount = Math.max(0, reserved - amountToPay);

    writeState(stateRef);
    if (payoutInfo) payoutInfo.textContent = `Выплата произведена: ${amountToPay.toLocaleString("ru-RU")} ${stateRef.payment.currency} · ${new Date(stateRef.payout.paidAt).toLocaleString("ru-RU")}`;
    applyUI(stateRef);
  }

  // Если уже выплачено — отрендерить информацию после F5
  if (st.payout?.paid && payoutInfo) {
    payoutInfo.textContent = `Выплата произведена: ${Number(st.payout.amount||0).toLocaleString("ru-RU")} ${st.payment.currency} · ${new Date(st.payout.paidAt).toLocaleString("ru-RU")}`;
  }

  // ====== Переходы по степперу (только назад/текущий) ======
  $$("#steps .step").forEach(el => {
    el.addEventListener("click", () => {
      const target = Number(el.dataset.step);
      const active = computeActiveStep(st);
      if (target <= active) {
        document.getElementById(`stage-${target}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });

  // ====== Info: оффлайн баннер (опционально) ======
  window.addEventListener("offline", () => showToast("Вы оффлайн. Часть функций недоступна.", "error"));
  window.addEventListener("online",  () => showToast("Вы снова онлайн.", "success"));
})();

// ====== Mini SPA router for blogger profile (mount content feed after render) ======
(function initMiniRouter() {
  // Универсальный парсер hash → { path, segments[], query{} }
  function parseHash() {
    const raw = location.hash || "";
    const noHash = raw.replace(/^#\/?/, ""); // убираем #/
    const [pathPart, queryPart] = noHash.split("?");
    const segments = (pathPart || "").split("/").filter(Boolean);
    const params = {};
    if (queryPart) {
      new URLSearchParams(queryPart).forEach((v, k) => (params[k] = v));
    }
    return { path: pathPart || "", segments, query: params };
  }

  async function getBloggerByIdFlexible(id) {
    // Предпочтительно через DataAPI (если подключён)
    if (window.DataAPI && typeof window.DataAPI.getBloggerById === "function") {
      return await window.DataAPI.getBloggerById(id);
    }
    // Фолбэк — прямой fetch
    try {
      const res = await fetch("json/bloggers.json", { cache: "no-store" });
      const arr = await res.json();
      const item = (arr || []).find(b => String(b.id) === String(id));
      if (item && !Array.isArray(item.content)) item.content = [];
      return item || null;
    } catch (e) {
      console.error("Router: failed to load bloggers.json", e);
      return null;
    }
  }

  async function getBloggerByUsernameFlexible(username) {
    if (window.DataAPI && typeof window.DataAPI.getBloggerByUsername === "function") {
      return await window.DataAPI.getBloggerByUsername(username);
    }
    try {
      const res = await fetch("json/bloggers.json", { cache: "no-store" });
      const arr = await res.json();
      const item = (arr || []).find(b => String(b.username || "").toLowerCase() === String(username || "").toLowerCase());
      if (item && !Array.isArray(item.content)) item.content = [];
      return item || null;
    } catch (e) {
      console.error("Router: failed to load bloggers.json", e);
      return null;
    }
  }

  function mountFeedIfPossible(blogger) {
    const el = document.getElementById("contentFeed");
    if (!el || !blogger) return;

    // 1) Предпочтительно через ContentFeed.mount
    if (window.ContentFeed && typeof window.ContentFeed.mount === "function") {
      try {
        window.ContentFeed.mount("#contentFeed", blogger);
        return;
      } catch (e) {
        console.warn("ContentFeed.mount failed, try fallback render", e);
      }
    }
    // 2) Альтернативные имена экспорта
    if (typeof window.mountContentFeed === "function") {
      try { window.mountContentFeed("#contentFeed", blogger); return; } catch {}
    }
    if (window.ContentFeed && typeof window.ContentFeed.render === "function") {
      try { window.ContentFeed.render("#contentFeed", blogger); return; } catch {}
    }
    // 3) Простой фолбэк-рендер (без зависимостей)
    const items = Array.isArray(blogger.content) ? blogger.content : [];
    el.innerHTML = items.length
      ? items.map(item => `
          <div class="cf-item">
            <a class="cf-thumb" href="${item.url || '#'}" target="_blank" rel="noopener">
              <img src="${item.preview_url || ''}" alt="${(item.title || item.type || 'content').replace(/"/g,'&quot;')}" loading="lazy"/>
              <span class="cf-type">${item.type || ''}</span>
            </a>
            <div class="cf-meta">
              <div class="cf-title">${item.title || ''}</div>
              <div class="cf-info">
                <span>${new Date(item.published_at || Date.now()).toLocaleDateString('ru-RU')}</span>
                <span>👀 ${(item.views||0).toLocaleString('ru-RU')}</span>
                ${item.likes != null ? `<span>❤️ ${(item.likes||0).toLocaleString('ru-RU')}</span>` : ""}
              </div>
            </div>
          </div>
        `).join("")
      : `<div class="muted">Контент пока не найден.</div>`;
  }

  async function handleRoute() {
    const { segments, query } = parseHash();
    // Поддерживаем варианты: #/blogger/<id>  ИЛИ  #/blogger?id=<id>  ИЛИ  #/blogger?username=<name>
    if (segments[0] !== "blogger") return;

    let blogger = null;
    if (segments[1]) {
      blogger = await getBloggerByIdFlexible(segments[1]);
    } else if (query.id) {
      blogger = await getBloggerByIdFlexible(query.id);
    } else if (query.username) {
      blogger = await getBloggerByUsernameFlexible(query.username);
    }

    if (!blogger) {
      console.warn("Router: blogger not found");
      return;
    }

    // 1) Рендер профиля (если есть функция приложения)
    if (typeof window.renderBloggerProfile === "function") {
      try {
        await window.renderBloggerProfile(blogger);
      } catch (e) {
        console.warn("renderBloggerProfile() threw", e);
      }
    }

    // 2) Сразу после — монтируем ленту контента
    mountFeedIfPossible(blogger);

    // 3) Событие для подписчиков (если нужно)
    try {
      window.dispatchEvent(new CustomEvent("blogger:rendered", { detail: { blogger } }));
    } catch {}
  }

  // Подписка
  window.addEventListener("hashchange", handleRoute);
  document.addEventListener("DOMContentLoaded", handleRoute);
  // Авто-инициализация, если уже на нужном маршруте
  if (location.hash && location.hash.includes("blogger")) {
    handleRoute();
  }
})();
