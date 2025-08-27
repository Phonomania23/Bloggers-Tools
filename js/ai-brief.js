/**
 * AI Brief Module — клиентский модуль анализа/улучшения брифов
 */
class AIBrief {
    constructor() {
        this.LS_KEY = "aiBriefCacheV1";
        this.DEFAULT_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 дней
        this.init();
    }

    init() {
        console.log('AIBrief module initialized');
    }

    $(sel, root = document) {
        return root.querySelector(sel);
    }

    $$(sel, root = document) {
        return [...root.querySelectorAll(sel)];
    }

    readJSON(key, def) {
        try {
            return JSON.parse(localStorage.getItem(key) || JSON.stringify(def));
        } catch {
            return def;
        }
    }

    writeJSON(key, val) {
        try {
            localStorage.setItem(key, JSON.stringify(val));
        } catch {}
    }

    async sha256(data) {
        try {
            const enc = new TextEncoder().encode(data);
            const buf = await crypto.subtle.digest("SHA-256", enc);
            return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
        } catch {
            // Fallback hash
            let h = 2166136261 >>> 0;
            for (let i = 0; i < data.length; i++) {
                h ^= data.charCodeAt(i);
                h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
            }
            return ("0000000" + (h >>> 0).toString(16)).slice(-8);
        }
    }

    now() {
        return Date.now();
    }

    getCache() {
        const data = this.readJSON(this.LS_KEY, { items: {} });
        if (!data.items) data.items = {};
        return data;
    }

    setCache(cache) {
        this.writeJSON(this.LS_KEY, cache);
    }

    getFromCache(key) {
        const cache = this.getCache();
        const rec = cache.items[key];
        if (!rec) return null;
        if (rec.expires && rec.expires < this.now()) {
            delete cache.items[key];
            this.setCache(cache);
            return null;
        }
        return rec.value;
    }

    setToCache(key, value, ttl = this.DEFAULT_TTL_MS) {
        const cache = this.getCache();
        cache.items[key] = { value, expires: this.now() + ttl };
        this.setCache(cache);
    }

    fallbackAnalyze(brief) {
        const issues = [];
        const questions = [];
        const suggestions = [];
        const ideas = [];
        const formats = [];

        const goal = (brief.goal || "").trim();
        const budget = +brief.budget || 0;
        const deadline = (brief.deadline || "").trim();

        if (!goal) issues.push("Не указана цель кампании.");
        if (!budget) issues.push("Не указан бюджет (₽).");
        if (!deadline) issues.push("Не указан дедлайн.");

        // Рекомендуемые дополнения
        if (!/аудитор/i.test(goal)) suggestions.push("Добавьте описание целевой аудитории: возраст, гео, интересы, pain points.");
        if (!/cta|призыв|действ/i.test(goal)) suggestions.push("Пропишите чёткий CTA (действие после просмотра).");
        if (!/kpi|роас|cpa|cpl|просмотр/i.test(goal)) suggestions.push("Определите KPI/метрики успеха: CPA/CPL/ROAS, просмотры, CTR, код/UTM.");
        if (!/tone|тон/i.test(goal)) suggestions.push("Уточните тон/стиль: экспертный, дружелюбный, провокационный и т.д.");
        if (!/формат|ролик|сторис|shorts|reels/i.test(goal)) suggestions.push("Определите форматы: обзор, интеграция, челлендж, туториал, UGC.");

        // Идеи на основе типа контента
        const isTech = /техник|гаджет|софт|app|прилож/i.test(goal);
        const isBeauty = /красот|beauty|космет/i.test(goal);
        const isFood = /еда|food|рецеп/i.test(goal);
        const isEdu = /курс|обуч|образован/i.test(goal);

        if (isTech) {
            ideas.push(
                "Серия «7 дней с продуктом»: честный дневник опыта",
                "«Мифы и правда» о продукте — краш-тест и сравнение",
                "Челлендж «смена привычки за неделю» с фиксацией метрик"
            );
            formats.push("YouTube интеграция 60–90 сек", "Shorts/Reels: 3×15–30 сек", "TikTok челлендж");
        } else if (isBeauty) {
            ideas.push(
                "До/после с прозрачной методологией",
                "Разбор состава и аналогов («value за рубль»)",
                "Съёмка «рутина дня» с продуктом в естественном контексте"
            );
            formats.push("Reels/TikTok 3×20–30 сек", "UGC-отзывы", "Интеграция у эксперта");
        } else if (isFood) {
            ideas.push(
                "«5 быстрых рецептов за 15 минут» с продуктом",
                "Слепая дегустация vs конкуренты",
                "«Неделя рационов» — план питания с ценой"
            );
            formats.push("Short-form сериалы", "YouTube интеграция", "Shorts с нарезками рецептов");
        } else if (isEdu) {
            ideas.push(
                "«30-дневный челлендж навыка» с чек-листами",
                "Кейс «ноль → результат за 2 недели»",
                "Обзор полезных фреймворков и практик"
            );
            formats.push("YouTube long-form 5–10 мин", "Карусели в IG", "TikTok разборы");
        } else {
            ideas.push(
                "Челлендж «7 дней — 7 инсайтов»",
                "История пользователя (UGC) + честный отзыв",
                "«Ошибки и как их избежать» — экспертный формат"
            );
            formats.push("Интеграция 45–90 сек", "3×Shorts/Reels", "Стрим/AMA 20–40 мин");
        }

        // Оценка полноты
        let score = 40;
        if (goal) score += 20;
        if (budget) score += 20;
        if (deadline) score += 10;
        if (suggestions.length <= 2) score += 10;

        return {
            source: "fallback",
            score: Math.max(0, Math.min(100, score)),
            issues,
            questions: questions.length ? questions : [
                "Кто основная ЦА? Возраст/гео/интересы/уровень дохода.",
                "Какой ключевой инсайт/боль аудитории решает продукт?",
                "Какой CTA и целевая посадочная? Нужен промокод/UTM?",
                "Есть ли ограничения по креативу/сообщениям/конкурентам?",
                "Какие KPI важнее всего (просмотры/CPA/ROAS/регистрации)?"
            ],
            suggestions,
            ideas,
            formats
        };
    }

    async callAPI(brief, signal) {
        try {
            const response = await fetch("/api/ai-brief", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ brief }),
                signal
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            if (!data || !data.ok || !data.result) {
                throw new Error("Invalid response from AI");
            }

            return data.result;
        } catch (error) {
            console.error("API call failed:", error);
            throw error;
        }
    }

    async analyze(brief, opts = {}) {
        const ttl = Number(opts.ttlMs ?? this.DEFAULT_TTL_MS) || this.DEFAULT_TTL_MS;
        const keyInput = JSON.stringify({
            goal: (brief.goal || "").trim(),
            budget: Number(brief.budget || 0),
            deadline: (brief.deadline || "").trim(),
            audience: (brief.audience || "").trim(),
            product: (brief.product || "").trim(),
            kpi: (brief.kpi || "").trim(),
            tone: (brief.tone || "").trim(),
            platforms: (brief.platforms || "").trim()
        });

        const hash = await this.sha256(keyInput);
        const cached = this.getFromCache(hash);

        if (cached) {
            return { ...cached, cached: true };
        }

        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), opts.timeoutMs || 20000);
            
            const result = await this.callAPI(JSON.parse(keyInput), controller.signal);
            clearTimeout(timeout);
            
            this.setToCache(hash, { ...result, cached: false }, ttl);
            return result;
        } catch (error) {
            console.warn("API failed, using fallback:", error);
            const fallbackResult = this.fallbackAnalyze(JSON.parse(keyInput));
            this.setToCache(hash, { ...fallbackResult, cached: false }, ttl);
            return fallbackResult;
        }
    }

    renderResult(container, res) {
        if (!container) return;

        const esc = (s) => String(s || "").replace(/[&<>"]/g, m => 
            ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]));

        const li = (arr) => arr && arr.length ? 
            "<ul>" + arr.map(x => `<li>${esc(x)}</li>`).join("") + "</ul>" : 
            "<div class='muted'>—</div>";

        container.innerHTML = `
            <div class="card" style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 16px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                    <h3 style="margin: 0;">AI-оценка брифа</h3>
                    <span class="badge" style="background: #f0f0f0; padding: 4px 8px; border-radius: 12px; font-size: 14px;">
                        Score: <strong>${Number(res.score || 0)}</strong>/100
                        ${res.cached ? ' (кэш)' : ''}
                    </span>
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;">
                    <div>
                        <div style="color: #666; font-weight: 600; margin-bottom: 8px;">Пробелы/неясности</div>
                        ${li(res.issues)}
                    </div>
                    <div>
                        <div style="color: #666; font-weight: 600; margin-bottom: 8px;">Что уточнить у бренда</div>
                        ${li(res.questions)}
                    </div>
                    <div>
                        <div style="color: #666; font-weight: 600; margin-bottom: 8px;">Рекомендации</div>
                        ${li(res.suggestions)}
                    </div>
                    <div>
                        <div style="color: #666; font-weight: 600; margin-bottom: 8px;">Идеи креативов</div>
                        ${li(res.ideas)}
                    </div>
                    <div>
                        <div style="color: #666; font-weight: 600; margin-bottom: 8px;">Оптимальные форматы</div>
                        ${li(res.formats)}
                    </div>
                </div>
            </div>
        `;
    }

    collectFromStep2() {
        const getValue = (id) => {
            const el = document.getElementById(id);
            return el ? el.value.trim() : "";
        };

        return {
            goal: getValue("briefGoal"),
            budget: getValue("briefBudget"),
            deadline: getValue("briefDeadline"),
            audience: getValue("briefAudience"),
            product: getValue("briefProduct"),
            kpi: getValue("briefKPI"),
            tone: getValue("briefTone"),
            platforms: getValue("briefPlatforms")
        };
    }

    async runFromUI() {
        const panel = document.getElementById("aiBriefPanel");
        const btn = document.getElementById("aiAnalyzeBtn");
        const applyBtn = document.getElementById("aiApplyBtn");

        if (!panel || !btn) {
            console.error("Required elements not found");
            return;
        }

        btn.disabled = true;
        btn.textContent = "Анализ…";
        panel.innerHTML = `<div class="muted">AI анализирует бриф…</div>`;

        try {
            const data = this.collectFromStep2();
            const result = await this.analyze(data);
            
            this.renderResult(panel, result);
            
            if (applyBtn) {
                applyBtn.disabled = false;
                applyBtn.onclick = () => this.applyRecommendationsToGoal(result);
            }
        } catch (error) {
            console.error("Analysis failed:", error);
            panel.innerHTML = `
                <div class="muted" style="color: #d32f2f;">
                    Не удалось выполнить анализ. ${error.message || 'Попробуйте позже.'}
                </div>
            `;
        } finally {
            btn.disabled = false;
            btn.textContent = "AI-анализ брифа";
        }
    }

    applyRecommendationsToGoal(res) {
        const goalEl = document.getElementById("briefGoal");
        if (!goalEl) return;

        const take = (arr, n) => (arr || []).slice(0, n);
        const append = [
            "",
            "— AI рекомендации —",
            ...take(res.suggestions, 3).map((s, i) => `${i + 1}) ${s}`),
            "Идеи: " + take(res.ideas, 2).join(" · "),
            "Форматы: " + take(res.formats, 2).join(" · ")
        ].join("\n");

        goalEl.value = (goalEl.value || "").trim() + "\n\n" + append;
        
        // Trigger events for any listeners
        try {
            goalEl.dispatchEvent(new Event("input", { bubbles: true }));
            goalEl.dispatchEvent(new Event("change", { bubbles: true }));
        } catch (e) {
            console.warn("Could not trigger events:", e);
        }
    }
}

// Initialize and expose globally
window.AIBrief = new AIBrief();