/* File: js/content-feed.js */
/* global window, document */

(function () {
  const DEFAULT_PAGE_SIZE = 24;

  const TYPE_LABELS = {
    video: 'Видео',
    short: 'Shorts',
    shorts: 'Shorts',
    reel: 'Reels',
    reels: 'Reels',
    story: 'Stories',
    stories: 'Stories',
    live: 'Live',
    photo: 'Фото',
    post: 'Пост',
    image: 'Фото'
  };

  // Иконки без зависимостей от внешних шрифтов (дружелюбно к бренду и тёмной теме)
  const ICONS = {
    views: '<span aria-hidden="true">👁️</span>',
    likes: '<span aria-hidden="true">❤️</span>',
    date:  '<span aria-hidden="true">📅</span>',
    play:  '<span aria-hidden="true">▶</span>'
  };

  function escapeHTML(str = '') {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function compactNumber(n) {
    if (n == null || isNaN(n)) return '—';
    const abs = Math.abs(n);
    if (abs >= 1_000_000) return (n / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1) + 'M';
    if (abs >= 1_000)     return (n / 1_000).toFixed(abs >= 10_000     ? 0 : 1) + 'K';
    return String(n);
  }

  function formatDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('ru-RU', { year: 'numeric', month: 'short', day: '2-digit' });
  }

  function normType(t = '') {
    return String(t).toLowerCase().trim();
  }

  function getMetrics(item) {
    const views = item.views ?? item.viewCount ?? item.playCount ?? null;
    const likes = item.likes ?? item.likeCount ?? null;
    return { views, likes };
  }

  function uniq(arr) {
    return [...new Set(arr)];
  }

  function secondsToClock(sec) {
    const s = Math.floor(sec % 60);
    const m = Math.floor((sec / 60) % 60);
    const h = Math.floor(sec / 3600);
    if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    return `${m}:${String(s).padStart(2,'0')}`;
  }

  function debounce(fn, ms = 300) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(null, args), ms);
    };
  }

  function sorters(sortKey) {
    switch (sortKey) {
      case 'date_asc':
        return (a, b) => new Date(a.published_at) - new Date(b.published_at);
      case 'date_desc':
        return (a, b) => new Date(b.published_at) - new Date(a.published_at);
      case 'views_asc':
        return (a, b) => (getMetrics(a).views || 0) - (getMetrics(b).views || 0);
      case 'views_desc':
        return (a, b) => (getMetrics(b).views || 0) - (getMetrics(a).views || 0);
      case 'likes_asc':
        return (a, b) => (getMetrics(a).likes || 0) - (getMetrics(b).likes || 0);
      case 'likes_desc':
        return (a, b) => (getMetrics(b).likes || 0) - (getMetrics(a).likes || 0);
      default:
        return (a, b) => new Date(b.published_at) - new Date(a.published_at);
    }
  }

  // SVG-заглушка превью (на случай отсутствия preview_url)
  function placeholderThumb(title = '') {
    const t = encodeURIComponent((title || 'Нет превью').slice(0, 24));
    const svg =
      `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 160 90'>` +
      `<rect width='160' height='90' fill='%2323262b'/>` +
      `<text x='50%' y='52%' fill='%238c9199' font-family='system-ui,Arial' font-size='10' text-anchor='middle'>${t}</text>` +
      `</svg>`;
    return `data:image/svg+xml;utf8,${svg}`;
  }

  function buildToolbarHTML(types) {
    const typeOptions = ['all', ...types].map(t => {
      const label = t === 'all' ? 'Все типы' : (TYPE_LABELS[t] || t);
      return `<option value="${t}">${escapeHTML(label)}</option>`;
    }).join('');

    return `
      <div class="cf-toolbar" role="region" aria-label="Фильтры контента">
        <div class="cf-field">
          <label for="cfType" class="cf-label">Тип</label>
          <select id="cfType" class="cf-select" aria-label="Отфильтровать по типу">
            ${typeOptions}
          </select>
        </div>

        <div class="cf-field">
          <label for="cfSort" class="cf-label">Сортировка</label>
          <select id="cfSort" class="cf-select" aria-label="Сортировка">
            <option value="date_desc">По дате (новые ↑)</option>
            <option value="date_asc">По дате (старые ↓)</option>
            <option value="views_desc">По просмотрам (больше ↑)</option>
            <option value="views_asc">По просмотрам (меньше ↓)</option>
            <option value="likes_desc">По лайкам (больше ↑)</option>
            <option value="likes_asc">По лайкам (меньше ↓)</option>
          </select>
        </div>

        <div class="cf-field cf-search">
          <label for="cfSearch" class="cf-label">Поиск</label>
          <input id="cfSearch" type="search" class="cf-input" placeholder="По заголовку/подписи…" aria-label="Поиск по заголовку или подписи" />
        </div>
      </div>
    `;
  }

  function buildCardHTML(item) {
    const t = normType(item.type);
    const typeLabel = TYPE_LABELS[t] || item.type || 'Контент';
    const { views, likes } = getMetrics(item);

    const title = escapeHTML(item.title || '');
    const caption = escapeHTML(item.caption || '');
    const shownTitle = title || caption || 'Без названия';

    const thumb = escapeHTML(item.preview_url || item.thumbnail || '') || placeholderThumb(shownTitle);
    const href = escapeHTML(item.url || '#');
    const date = formatDate(item.published_at);
    const durSec = item.duration_sec ?? item.duration ?? null;
    const duration = durSec ? secondsToClock(durSec) : '';

    return `
      <article class="cf-card type-${t}" tabindex="0" aria-label="${typeLabel}">
        <a class="cf-thumb" href="${href}" target="_blank" rel="noopener" aria-label="Открыть публикацию">
          <img data-src="${thumb}" alt="${shownTitle}" class="cf-img" />
          <span class="cf-badge">${escapeHTML(typeLabel)}</span>
          ${duration ? `<span class="cf-duration">${ICONS.play} ${duration}</span>` : ''}
        </a>
        <div class="cf-body">
          <div class="cf-title" title="${shownTitle}">${shownTitle}</div>
          <div class="cf-meta" aria-label="Метаданные публикации">
            <span class="cf-meta-item">${ICONS.date} ${date}</span>
            <span class="cf-meta-item">${ICONS.views} ${compactNumber(views)}</span>
            <span class="cf-meta-item">${ICONS.likes} ${compactNumber(likes)}</span>
          </div>
        </div>
      </article>
    `;
  }

  function lazyImages(root) {
    const images = root.querySelectorAll('img.cf-img[data-src]');
    if (!('IntersectionObserver' in window)) {
      images.forEach(img => (img.src = img.dataset.src));
      return;
    }
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const img = e.target;
          img.src = img.dataset.src || placeholderThumb(img.getAttribute('alt') || '');
          img.removeAttribute('data-src');
          obs.unobserve(img);
        }
      });
    }, { rootMargin: '200px' });
    images.forEach(img => io.observe(img));
  }

  function mount(container, options = {}) {
    const root = typeof container === 'string' ? document.querySelector(container) : container;
    if (!root) throw new Error('ContentFeed: контейнер не найден');

    root.classList.add('content-feed');
    root.innerHTML = `
      <div class="cf-header">
        <h3 class="cf-h3">Контент</h3>
      </div>
      <div class="cf-toolbar-wrap"></div>
      <div class="cf-grid" id="cfGrid"></div>
      <div class="cf-empty" id="cfEmpty" hidden>Контента пока нет.</div>
      <div class="cf-actions" id="cfActions" hidden>
        <button class="btn" id="cfLoadMore" type="button">Показать ещё</button>
      </div>
    `;

    const state = {
      rawItems: [],
      items: [],
      page: 1,
      pageSize: options.pageSize || DEFAULT_PAGE_SIZE,
      currentType: 'all',
      currentSort: 'date_desc',
      currentQuery: ''
    };

    function applyFilters() {
      const q = state.currentQuery.trim().toLowerCase();
      const filtered = state.rawItems.filter(it => {
        const t = normType(it.type);
        const inType = state.currentType === 'all' ? true : t === state.currentType;
        const hay = ((it.title || '') + ' ' + (it.caption || '')).toLowerCase();
        const inSearch = q ? hay.includes(q) : true;
        return inType && inSearch;
      });

      filtered.sort(sorters(state.currentSort));
      state.items = filtered;
    }

    function setItems(items) {
      state.rawItems = Array.isArray(items) ? items : [];
      state.page = 1;
      applyFilters();
      render();
    }

    function renderToolbar() {
      const types = uniq(
        state.rawItems
          .map(i => normType(i.type))
          .filter(Boolean)
      ).sort();

      const wrap = root.querySelector('.cf-toolbar-wrap');
      wrap.innerHTML = buildToolbarHTML(types);

      const cfType = wrap.querySelector('#cfType');
      const cfSort = wrap.querySelector('#cfSort');
      const cfSearch = wrap.querySelector('#cfSearch');

      cfType.value = state.currentType;
      cfSort.value = state.currentSort;
      cfSearch.value = state.currentQuery;

      cfType.addEventListener('change', () => {
        state.currentType = cfType.value;
        state.page = 1;
        applyFilters();
        renderGrid();
      });

      cfSort.addEventListener('change', () => {
        state.currentSort = cfSort.value;
        state.page = 1;
        applyFilters();
        renderGrid();
      });

      cfSearch.addEventListener('input', debounce(() => {
        state.currentQuery = cfSearch.value;
        state.page = 1;
        applyFilters();
        renderGrid();
      }, 250));
    }

    function renderGrid() {
      const grid = root.querySelector('#cfGrid');
      const empty = root.querySelector('#cfEmpty');
      const actions = root.querySelector('#cfActions');
      grid.innerHTML = '';

      const end = state.page * state.pageSize;
      const slice = state.items.slice(0, end);

      if (slice.length === 0) {
        empty.hidden = false;
        actions.hidden = true;
        return;
      }

      empty.hidden = true;
      grid.innerHTML = slice.map(buildCardHTML).join('');

      lazyImages(grid);

      const hasMore = state.items.length > slice.length;
      actions.hidden = !hasMore;
    }

    function render() {
      renderToolbar();
      renderGrid();
    }

    // Публичное API
    const api = {
      setItems,
      getState: () => ({ ...state }),
      setType: (t)  => { state.currentType = t; state.page = 1; applyFilters(); renderGrid(); },
      setSort: (s)  => { state.currentSort = s; state.page = 1; applyFilters(); renderGrid(); },
      setQuery: (q) => { state.currentQuery = q || ''; state.page = 1; applyFilters(); renderGrid(); },
      loadMore: ()  => { state.page += 1; renderGrid(); }
    };

    root.querySelector('#cfLoadMore').addEventListener('click', api.loadMore);

    // Источник данных:
    // 1) options.items — прямой массив контента
    // 2) options.blogger — объект блогера с полем content: []
    // 3) options.bloggerId / options.username + options.dataUrl (по умолчанию '/json/bloggers.json')
    (async function initData() {
      try {
        if (Array.isArray(options.items)) {
          setItems(options.items);
          return;
        }

        if (options.blogger && Array.isArray(options.blogger.content)) {
          setItems(options.blogger.content);
          return;
        }

        const dataUrl = options.dataUrl || '/json/bloggers.json';
        const bloggerId = options.bloggerId;
        const username  = options.username && String(options.username).toLowerCase();

        if (!bloggerId && !username) {
          setItems([]);
          return;
        }

        const resp = await fetch(dataUrl, { credentials: 'same-origin', cache: 'no-store' });
        const json = await resp.json();
        const bloggers = Array.isArray(json) ? json : (json.bloggers || []);

        let blogger = null;
        if (bloggerId != null) {
          blogger = bloggers.find(b => String(b.id) === String(bloggerId));
        }
        if (!blogger && username) {
          blogger = bloggers.find(b => (b.username && String(b.username).toLowerCase() === username));
        }

        setItems(blogger && Array.isArray(blogger.content) ? blogger.content : []);
      } catch (e) {
        console.error('ContentFeed: не удалось загрузить контент', e);
        setItems([]);
      }
    })();

    // Экспортируем API наружу через контейнер (по желанию)
    root._contentFeed = api;
    return api;
  }

  window.ContentFeed = { mount };
})();
