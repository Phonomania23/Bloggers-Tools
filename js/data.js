<script>
/*!
 * Bloggers.tools DataAPI
 * Lightweight data loader with normalization and simple caching.
 * Exposes: window.DataAPI
 */
(function (global) {
  const LS_KEY = 'bt_bloggers_cache_v1';
  const LS_TIME_KEY = 'bt_bloggers_cache_time';
  const DEFAULT_URL = 'json/bloggers.json';

  let memoryCache = null;

  function nowTs() { return Date.now(); }

  function isFresh(ts, maxAgeMs = 5 * 60 * 1000) { // 5 минут по умолчанию
    return ts && (nowTs() - ts) < maxAgeMs;
  }

  function normalizeBlogger(raw = {}) {
    // НЕ выбрасываем ни одного поля, только гарантируем content:[]
    const b = { ...raw };
    if (!Array.isArray(b.content)) b.content = [];
    return b;
  }

  async function fetchJson(url) {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`DataAPI: HTTP ${res.status} while fetching ${url}`);
    }
    return await res.json();
  }

  function saveToLocalStorage(data) {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(data));
      localStorage.setItem(LS_TIME_KEY, String(nowTs()));
    } catch (e) {
      // игнорируем переполнение хранилища
      console.warn('DataAPI: localStorage save failed', e);
    }
  }

  function readFromLocalStorage() {
    try {
      const txt = localStorage.getItem(LS_KEY);
      if (!txt) return null;
      const data = JSON.parse(txt);
      return Array.isArray(data) ? data.map(normalizeBlogger) : null;
    } catch {
      return null;
    }
  }

  function readTs() {
    const t = localStorage.getItem(LS_TIME_KEY);
    return t ? Number(t) : 0;
  }

  async function getBloggers(opts = {}) {
    const url = opts.dataUrl || DEFAULT_URL;

    // 1) в памяти
    if (Array.isArray(memoryCache) && memoryCache.length) {
      return memoryCache;
    }

    // 2) в localStorage (если свежее 5 минут)
    const ts = readTs();
    const lsData = readFromLocalStorage();
    if (lsData && isFresh(ts)) {
      memoryCache = lsData;
      return memoryCache;
    }

    // 3) сеть
    const raw = await fetchJson(url);
    const list = Array.isArray(raw) ? raw.map(normalizeBlogger) : [];
    memoryCache = list;
    saveToLocalStorage(list);
    return list;
  }

  async function getBloggerById(id, opts = {}) {
    const list = await getBloggers(opts);
    return list.find(b => String(b.id) === String(id)) || null;
  }

  async function getBloggerByUsername(username, opts = {}) {
    const list = await getBloggers(opts);
    const u = String(username || '').toLowerCase();
    return list.find(b => String(b.username || '').toLowerCase() === u) || null;
  }

  function invalidateCache() {
    memoryCache = null;
    try {
      localStorage.removeItem(LS_KEY);
      localStorage.removeItem(LS_TIME_KEY);
    } catch {}
  }

  // Экспорт
  global.DataAPI = {
    getBloggers,
    getBloggerById,
    getBloggerByUsername,
    invalidateCache,
    _normalizeBlogger: normalizeBlogger, // для тестов
  };
})(window);
</script>
